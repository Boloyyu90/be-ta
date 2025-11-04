import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examSessionsController from './exam-sessions.controller';
import * as examSessionsValidation from './exam-sessions.validation';

export const examSessionsRouter = Router();

// ==================== PARTICIPANT ROUTES ====================

/**
 * @route   POST /api/v1/exams/:id/start
 * @desc    Start an exam session
 * @access  Private (All authenticated users)
 */
examSessionsRouter.post(
  '/exams/:id/start',
  authenticate,
  validate(examSessionsValidation.startExamSchema),
  asyncHandler(examSessionsController.startExam)
);

/**
 * @route   GET /api/v1/user-exams
 * @desc    Get list of user's exam sessions
 * @access  Private (All authenticated users)
 */
examSessionsRouter.get(
  '/user-exams',
  authenticate,
  validate(examSessionsValidation.getUserExamsSchema),
  asyncHandler(examSessionsController.getUserExams)
);

/**
 * @route   GET /api/v1/user-exams/:id
 * @desc    Get user exam session details
 * @access  Private (Owner only)
 */
examSessionsRouter.get(
  '/user-exams/:id',
  authenticate,
  validate(examSessionsValidation.getUserExamSchema),
  asyncHandler(examSessionsController.getUserExam)
);

/**
 * @route   GET /api/v1/user-exams/:id/questions
 * @desc    Get questions for exam session (without correct answers)
 * @access  Private (Owner only)
 */
examSessionsRouter.get(
  '/user-exams/:id/questions',
  authenticate,
  validate(examSessionsValidation.getExamQuestionsSchema),
  asyncHandler(examSessionsController.getExamQuestions)
);

/**
 * @route   POST /api/v1/user-exams/:id/answers
 * @desc    Submit or update an answer (autosave)
 * @access  Private (Owner only)
 */
examSessionsRouter.post(
  '/user-exams/:id/answers',
  authenticate,
  validate(examSessionsValidation.submitAnswerSchema),
  asyncHandler(examSessionsController.submitAnswer)
);

/**
 * @route   POST /api/v1/user-exams/:id/submit
 * @desc    Submit exam and calculate score
 * @access  Private (Owner only)
 */
examSessionsRouter.post(
  '/user-exams/:id/submit',
  authenticate,
  validate(examSessionsValidation.submitExamSchema),
  asyncHandler(examSessionsController.submitExam)
);

/**
 * @route   GET /api/v1/user-exams/:id/answers
 * @desc    Get exam answers for review (after submit)
 * @access  Private (Owner only)
 */
examSessionsRouter.get(
  '/user-exams/:id/answers',
  authenticate,
  validate(examSessionsValidation.getExamAnswersSchema),
  asyncHandler(examSessionsController.getExamAnswers)
);

/**
 * @route   GET /api/v1/results/me/summary
 * @desc    Get summary statistics of my results
 * @access  Private (All authenticated users)
 */
examSessionsRouter.get(
  '/results/me/summary',
  authenticate,
  validate(examSessionsValidation.getMyResultsSummarySchema),
  asyncHandler(examSessionsController.getMyResultsSummary)
);

/**
 * @route   GET /api/v1/results/me
 * @desc    Get my exam results
 * @access  Private (All authenticated users)
 */
examSessionsRouter.get(
  '/results/me',
  authenticate,
  validate(examSessionsValidation.getMyResultsSchema),
  asyncHandler(examSessionsController.getMyResults)
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/admin/results
 * @desc    Get all exam results (with filters)
 * @access  Private (Admin only)
 */
examSessionsRouter.get(
  '/admin/results',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examSessionsValidation.getResultsSchema),
  asyncHandler(examSessionsController.getResults)
);