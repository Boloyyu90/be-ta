import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examSessionsController from '../exam-sessions.controller';
import * as examSessionsValidation from '../exam-sessions.validation';

export const adminResultsRouter = Router();

// =================================================================
// RESULTS MONITORING ROUTES (ALL USERS)
// Mounted at: /api/v1/admin/results
// Authorization: Admin only (enforced at parent router level)
// =================================================================

/**
 * @route   GET /api/v1/admin/results
 * @desc    Get all exam results with filters (examId, userId, status)
 * @access  Admin only
 */
adminResultsRouter.get(
  '/',
  validate(examSessionsValidation.getResultsSchema),
  asyncHandler(examSessionsController.getResults)
);