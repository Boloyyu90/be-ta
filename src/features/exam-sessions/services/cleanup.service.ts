/**
 * Cleanup Service — Automated maintenance tasks
 *
 * Handles cleanup of abandoned sessions and expired tokens.
 *
 * Functions:
 * - cleanupAbandonedSessions: Auto-submit timed-out sessions
 * - cleanupExpiredTokens: Remove expired auth tokens
 * - runAllCleanupTasks: Execute all cleanup jobs
 *
 * @module exam-sessions/services/cleanup.service
 */

import { ExamStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { logger } from '@/shared/utils/logger';

import { isAbandonedSession } from '../exam-sessions.helpers';

import {
  calculateScore,
  updateAnswerCorrectness,
} from '../exam-sessions.score';

import type {
  CleanupResult,
  TokenCleanupResult,
} from '../exam-sessions.validation';

// ==================== SERVICE FUNCTIONS ====================

/**
 * Clean up abandoned exam sessions
 */
export const cleanupAbandonedSessions = async (): Promise<CleanupResult> => {
  const startTime = Date.now();
  let cleaned = 0;
  let errors = 0;

  try {
    logger.info('Starting cleanup of abandoned sessions...');

    const sessions = await prisma.userExam.findMany({
      where: {
        status: ExamStatus.IN_PROGRESS,
        startedAt: { not: null },
      },
      include: {
        exam: { select: { durationMinutes: true } },
      },
    });

    logger.info({ count: sessions.length }, 'Found sessions to check');

    // Filter to actually abandoned sessions first
    const abandonedSessions = sessions.filter(
      (s) => isAbandonedSession(s.startedAt!, s.exam.durationMinutes!)
    );

    if (abandonedSessions.length === 0) {
      logger.info('No abandoned sessions found');
      return { cleaned: 0, errors: 0 };
    }

    const abandonedIds = abandonedSessions.map((s) => s.id);

    // ✅ FIX W-1: Batch fetch ALL answers in 1 query (eliminates N+1)
    const allAnswers = await prisma.answer.findMany({
      where: { userExamId: { in: abandonedIds } },
      include: {
        examQuestion: { include: { question: true } },
      },
    });

    // Group answers by userExamId in memory
    const answersBySession = new Map<number, typeof allAnswers>();
    for (const answer of allAnswers) {
      const group = answersBySession.get(answer.userExamId) ?? [];
      group.push(answer);
      answersBySession.set(answer.userExamId, group);
    }

    // Process each abandoned session (still per-session for error isolation)
    for (const session of abandonedSessions) {
      try {
        const answers = answersBySession.get(session.id) ?? [];
        const { totalScore } = calculateScore(answers as any);

        await prisma.$transaction(
          async (tx) => {
            await updateAnswerCorrectness(tx, answers as any);

            await tx.userExam.update({
              where: { id: session.id },
              data: {
                status: ExamStatus.TIMEOUT,
                submittedAt: new Date(),
                totalScore,
              },
            });
          },
          { timeout: 10000 }
        );

        cleaned++;
        logger.info({ userExamId: session.id, totalScore }, 'Session cleaned');
      } catch (error) {
        errors++;
        logger.error({ error, userExamId: session.id }, 'Failed to clean session');
      }
    }

    logger.info(
      { cleaned, errors, durationMs: Date.now() - startTime },
      'Cleanup complete'
    );

    return { cleaned, errors };
  } catch (error) {
    logger.error({ error }, 'Cleanup job failed');
    throw error;
  }
};

/**
 * Clean up expired tokens
 *
 * NOTE: This function relates to auth/token management but is co-located
 * with cleanup tasks for convenience in the cleanup job runner.
 */
export const cleanupExpiredTokens = async (): Promise<TokenCleanupResult> => {
  const result = await prisma.token.deleteMany({
    where: { expires: { lt: new Date() } },
  });

  logger.info({ deleted: result.count }, 'Expired tokens cleaned');

  return { deleted: result.count };
};

/**
 * Run all cleanup tasks
 */
export const runAllCleanupTasks = async () => {
  logger.info('Running all cleanup tasks...');

  const [sessions, tokens] = await Promise.allSettled([
    cleanupAbandonedSessions(),
    cleanupExpiredTokens(),
  ]);

  return {
    sessions: sessions.status === 'fulfilled' ? sessions.value : { error: 'failed' },
    tokens: tokens.status === 'fulfilled' ? tokens.value : { error: 'failed' },
  };
};
