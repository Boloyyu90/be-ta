import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examSessionsController from './exam-sessions.controller';
import * as examSessionsValidation from './exam-sessions.validation';

export const examSessionsRouter = Router();

// =================================================================
// MOUNTING CONTEXTS:
// 1. /api/v1/exams/:id/start     → Start exam (needs special handling)
// 2. /api/v1/user-exams           → Participant exam sessions
// 3. /api/v1/results              → Participant results
// 4. /api/v1/admin/results        → Admin results monitoring
//
// Note: This router handles multiple mounting points
// =================================================================

// -----------------------------------------------------------------
// CONTEXT HELPERS
// -----------------------------------------------------------------
const isUserExamsContext = (req: any) =>
  req.baseUrl.endsWith('/user-exams');
const isResultsContext = (req: any) =>
  req.baseUrl.includes('/results');
const isAdminContext = (req: any) =>
  req.baseUrl.includes('/admin');

// -----------------------------------------------------------------
// ROUTES: Exam Sessions (mounted at /user-exams)
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
// ROUTES: Results (mounted at /results or /admin/results)
// -----------------------------------------------------------------

/**
 * @route   GET /api/v1/results/me/summary
 * @desc    Get summary statistics
 * @access  Private (Authenticated users)
 */
examSessionsRouter.get(
  '/me/summary',
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
  validate(examSessionsValidation.getResultsSchema),
  asyncHandler(async (req, res, next) => {
    if (isAdminContext(req)) {
      return await examSessionsController.getResults(req, res, next);
    }
    return next();
  })
);