import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examSessionsController from './exam-sessions.controller';
import * as examSessionsValidation from './exam-sessions.validation';

export const examSessionsRouter = Router();

// =================================================================
// MOUNTING CONTEXTS:
// 1. /api/v1/user-exams          → Participant exam sessions
// 2. /api/v1/results             → Participant results
// 3. /api/v1/admin/results       → Admin results monitoring
//
// STRATEGY:
// - User-exams context: session management routes
// - Results context: results viewing routes (both participant & admin)
// - Use guards for admin-specific endpoints
// =================================================================

// -----------------------------------------------------------------
// CONTEXT GUARDS
// -----------------------------------------------------------------

/**
 * Guard helpers for dual-mount routing
 */
const isAdminContext = (req: any) => req.baseUrl.includes('/admin');
const onlyAdminContext = (req: any, _res: any, next: any) =>
  isAdminContext(req) ? next() : next('route');

const isParticipantContext = (req: any) => !req.baseUrl.includes('/admin');
const onlyParticipantContext = (req: any, _res: any, next: any) =>
  isParticipantContext(req) ? next() : next('route');

// -----------------------------------------------------------------
// EXAM SESSION ROUTES (mounted at /api/v1/user-exams)
// -----------------------------------------------------------------

/**
 * @route   GET /api/v1/user-exams/:id/answers
 * @desc    Get exam answers for review (after submission)
 * @access  Private (Exam owner)
 */
examSessionsRouter.get(
  '/:id/answers',
  validate(examSessionsValidation.getExamAnswersSchema),
  asyncHandler(examSessionsController.getExamAnswers)
);

/**
 * @route   GET /api/v1/user-exams/:id/questions
 * @desc    Get questions for active exam
 * @access  Private (Exam owner)
 */
examSessionsRouter.get(
  '/:id/questions',
  validate(examSessionsValidation.getExamQuestionsSchema),
  asyncHandler(examSessionsController.getExamQuestions)
);

/**
 * @route   POST /api/v1/user-exams/:id/submit
 * @desc    Submit exam and finalize
 * @access  Private (Exam owner)
 */
examSessionsRouter.post(
  '/:id/submit',
  validate(examSessionsValidation.submitExamSchema),
  asyncHandler(examSessionsController.submitExam)
);

/**
 * @route   POST /api/v1/user-exams/:id/answers
 * @desc    Submit/update answer (auto-save)
 * @access  Private (Exam owner)
 */
examSessionsRouter.post(
  '/:id/answers',
  validate(examSessionsValidation.submitAnswerSchema),
  asyncHandler(examSessionsController.submitAnswer)
);

/**
 * @route   GET /api/v1/user-exams/:id
 * @desc    Get exam session details
 * @access  Private (Exam owner)
 */
examSessionsRouter.get(
  '/:id',
  validate(examSessionsValidation.getUserExamSchema),
  asyncHandler(examSessionsController.getUserExam)
);

/**
 * @route   GET /api/v1/user-exams
 * @desc    Get my exam sessions
 * @access  Private (Authenticated users)
 */
examSessionsRouter.get(
  '/',
  validate(examSessionsValidation.getUserExamsSchema),
  asyncHandler(examSessionsController.getUserExams)
);

// -----------------------------------------------------------------
// RESULTS ROUTES (mounted at /api/v1/results or /api/v1/admin/results)
// Shared mounting point with different permissions
// -----------------------------------------------------------------

/**
 * @route   GET /api/v1/results/me/summary
 * @desc    Get summary statistics
 * @access  Private (Authenticated users)
 */
examSessionsRouter.get(
  '/me/summary',
  onlyParticipantContext,
  validate(examSessionsValidation.getMyResultsSummarySchema),
  asyncHandler(examSessionsController.getMyResultsSummary)
);

/**
 * @route   GET /api/v1/results/me
 * @desc    Get my results
 * @access  Private (Authenticated users)
 */
examSessionsRouter.get(
  '/me',
  onlyParticipantContext,
  validate(examSessionsValidation.getMyResultsSchema),
  asyncHandler(examSessionsController.getMyResults)
);

/**
 * @route   GET /api/v1/admin/results
 * @desc    Get all results (admin view)
 * @access  Private (Admin only)
 */
examSessionsRouter.get(
  '/',
  onlyAdminContext,
  validate(examSessionsValidation.getResultsSchema),
  asyncHandler(examSessionsController.getResults)
);