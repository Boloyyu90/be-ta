import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as proctoringController from '../proctoring.controller';
import * as proctoringValidation from '../proctoring.validation';

export const adminProctoringRouter = Router();

// =================================================================
// PROCTORING MONITORING ROUTES
// Mounted at: /api/v1/admin/proctoring
// Authorization: Admin only (enforced at parent router level)
// =================================================================

/**
 * @route   GET /api/v1/admin/proctoring/events
 * @desc    Get all proctoring events with filters
 * @access  Admin only
 */
adminProctoringRouter.get(
  '/events',
  validate(proctoringValidation.getAdminEventsSchema),
  asyncHandler(proctoringController.getAdminEvents)
);

/**
 * @route   GET /api/v1/admin/proctoring/exam-sessions/:userExamId/events
 * @desc    Get proctoring events for specific exam session (any user)
 * @access  Admin only
 */
adminProctoringRouter.get(
  '/exam-sessions/:userExamId/events',
  validate(proctoringValidation.getEventsSchema),
  asyncHandler(proctoringController.getEvents)
);