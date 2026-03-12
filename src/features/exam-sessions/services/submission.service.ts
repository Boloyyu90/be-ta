/**
 * Submission Service — Exam submission and scoring
 *
 * Handles finalizing exam sessions with score calculation.
 *
 * Functions:
 * - submitExam: Submit exam and calculate final score
 *
 * @module exam-sessions/services/submission.service
 */

import { ExamStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import {
  NotFoundError,
  BusinessLogicError,
  UnauthorizedError,
} from '@/shared/errors/app-errors';
import { logger } from '@/shared/utils/logger';

import {
  withinTimeLimit,
  calculateDuration,
} from '../exam-sessions.helpers';

import {
  calculateScore,
  updateAnswerCorrectness,
} from '../exam-sessions.score';

import type {
  ExamResult,
  AnswerWithQuestion,
} from '../exam-sessions.validation';

// ==================== SERVICE FUNCTIONS ====================

/**
 * Submit exam and calculate score
 * Transaction-safe scoring and status update
 */
export const submitExam = async (userExamId: number, userId: number) => {
  const now = new Date();

  return await prisma.$transaction(
    async (tx) => {
      const userExam = await tx.userExam.findUnique({
        where: { id: userExamId },
        include: {
          exam: {
            include: {
              examQuestions: { include: { question: true } },
            },
          },
          answers: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!userExam) {
        throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, ERROR_CODES.EXAM_SESSION_NOT_FOUND, {
          userExamId,
          userId,
        });
      }

      if (userExam.userId !== userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, {
          userExamId,
          userId,
          ownerId: userExam.userId,
        });
      }

      if (userExam.submittedAt) {
        throw new BusinessLogicError(
          ERROR_MESSAGES.EXAM_ALREADY_SUBMITTED,
          ERROR_CODES.EXAM_SESSION_ALREADY_SUBMITTED,
          { userExamId, userId, submittedAt: userExam.submittedAt }
        );
      }

      if (!withinTimeLimit(userExam.startedAt!, userExam.exam.durationMinutes!)) {
        await tx.userExam.update({
          where: { id: userExamId },
          data: { status: ExamStatus.TIMEOUT, submittedAt: now },
        });

        throw new BusinessLogicError(
          ERROR_MESSAGES.EXAM_TIMEOUT,
          ERROR_CODES.EXAM_SESSION_TIMEOUT,
          {
            userExamId,
            userId,
            startedAt: userExam.startedAt,
            durationMinutes: userExam.exam.durationMinutes,
          }
        );
      }

      // ✅ FIX: Safe mapping with validation
      const answersWithQuestions: AnswerWithQuestion[] = userExam.answers
        .map((answer) => {
          const examQuestion = userExam.exam.examQuestions.find(
            (eq) => eq.id === answer.examQuestionId
          );

          // Skip if exam question not found (data integrity issue)
          if (!examQuestion) {
            logger.warn(
              { answerId: answer.id, examQuestionId: answer.examQuestionId },
              'Answer references missing exam question'
            );
            return null;
          }

          // Map to AnswerWithQuestion structure
          return {
            id: answer.id,
            selectedOption: answer.selectedOption,
            examQuestionId: answer.examQuestionId,
            examQuestion: {
              question: {
                questionType: examQuestion.question.questionType,
                correctAnswer: examQuestion.question.correctAnswer,
                defaultScore: examQuestion.question.defaultScore,
              },
            },
          };
        })
        .filter((item): item is AnswerWithQuestion => item !== null);

      const { totalScore, scoresByType } = calculateScore(answersWithQuestions);

      await updateAnswerCorrectness(tx, answersWithQuestions);

      await tx.userExam.update({
        where: { id: userExamId },
        data: {
          status: ExamStatus.FINISHED,
          submittedAt: now,
          totalScore,
        },
      });

      logger.info(
        {
          userExamId,
          userId,
          examId: userExam.examId,
          totalScore,
          duration: calculateDuration(userExam.startedAt!, now),
        },
        'Exam submitted successfully'
      );

      const result: ExamResult = {
        id: userExam.id,
        exam: {
          id: userExam.exam.id,
          title: userExam.exam.title,
          description: userExam.exam.description,
          passingScore: userExam.exam.passingScore,
        },
        attemptNumber: userExam.attemptNumber,
        user: userExam.user,
        startedAt: userExam.startedAt!,
        submittedAt: now,
        totalScore,
        status: ExamStatus.FINISHED,
        duration: calculateDuration(userExam.startedAt!, now),
        answeredQuestions: userExam.answers.filter((a) => a.selectedOption !== null).length,
        totalQuestions: userExam.exam.examQuestions.length,
        scoresByType,
      };

      return result;
    },
    {
      timeout: 10000,
    }
  );
};
