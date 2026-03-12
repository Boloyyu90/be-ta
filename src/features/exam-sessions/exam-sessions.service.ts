/**
 * Exam Sessions Service — Barrel File
 *
 * Re-exports all service functions from decomposed sub-modules.
 * This file maintains backward compatibility so existing imports
 * (controller, server.ts) continue to work without changes.
 *
 * Sub-modules:
 * - session.service.ts:    Session lifecycle (startExam, getUserExam, getUserExams)
 * - answer.service.ts:     Answer management (submitAnswer, getExamQuestions, getExamAnswers)
 * - submission.service.ts: Exam submission (submitExam + scoring)
 * - results.service.ts:    Results retrieval (getMyResults, getResults)
 * - cleanup.service.ts:    Maintenance tasks (cleanupAbandonedSessions, cleanupExpiredTokens)
 *
 * @module exam-sessions.service
 */

// Session lifecycle
export { startExam, getUserExams, getUserExam } from './services/session.service';

// Answer management
export { submitAnswer, getExamQuestions, getExamAnswers } from './services/answer.service';

// Exam submission
export { submitExam } from './services/submission.service';

// Results retrieval
export { getMyResults, getResults } from './services/results.service';

// Cleanup tasks
export {
  cleanupAbandonedSessions,
  cleanupExpiredTokens,
  runAllCleanupTasks,
} from './services/cleanup.service';
