import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examSessionsController from '../exam-sessions.controller';
import * as examSessionsValidation from '../exam-sessions.validation';

export const adminExamSessionsRouter = Router();

// =================================================================
// EXAM SESSION MONITORING ROUTES
// Mounted at: /api/v1/admin/exam-sessions
// Authorization: Admin only (enforced at parent router level)
// =================================================================

/**
 * @route   GET /api/v1/admin/exam-sessions
 * @desc    Get all exam sessions with filters
 * @access  Admin only
 */
adminExamSessionsRouter.get(
  '/',
  validate(examSessionsValidation.getResultsSchema),
  asyncHandler(examSessionsController.getResults)
);

/**
 * @route   GET /api/v1/admin/exam-sessions/:id
 * @desc    Get exam session details (any user)
 * @access  Admin only
 */
adminExamSessionsRouter.get(
  '/:id',
  validate(examSessionsValidation.getUserExamSchema),
  asyncHandler(examSessionsController.getUserExam)
);

/**
 * @route   GET /api/v1/admin/exam-sessions/:id/answers
 * @desc    Get exam answers with review (any user)
 * @access  Admin only
 */
adminExamSessionsRouter.get(
  '/:id/answers',
  validate(examSessionsValidation.getExamAnswersSchema),
  asyncHandler(examSessionsController.getExamAnswers)
);