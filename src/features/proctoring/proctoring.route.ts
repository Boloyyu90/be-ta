import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as proctoringController from './proctoring.controller';
import * as proctoringValidation from './proctoring.validation';

export const proctoringRouter = Router();

// =================================================================
// MOUNTING CONTEXTS:
// 1. /api/v1/proctoring           → Participant event logging
// 2. /api/v1/admin/proctoring     → Admin monitoring
// =================================================================

// -----------------------------------------------------------------
// CONTEXT HELPERS
// -----------------------------------------------------------------
const isParticipantContext = (req: any) =>
  !req.baseUrl.includes('/admin');
const isAdminContext = (req: any) =>
  req.baseUrl.includes('/admin');

// -----------------------------------------------------------------
// ROUTES: Participant (mounted at /proctoring)
// -----------------------------------------------------------------

/**
 * @route   POST /api/v1/proctoring/events
 * @desc    Log proctoring event
 * @access  Private (Authenticated users)
 */
proctoringRouter.post(
  '/events',
  validate(proctoringValidation.logEventSchema),
  asyncHandler(async (req, res, next) => {
    if (isParticipantContext(req)) {
      return await proctoringController.logEvent(req, res, next);
    }
    return next();
  })
);

/**
 * @route   POST /api/v1/proctoring/user-exams/:userExamId/analyze-face
 * @desc    Analyze face from webcam
 * @access  Private (Exam owner)
 */
proctoringRouter.post(
  '/user-exams/:userExamId/analyze-face',
  validate(proctoringValidation.analyzeFaceSchema),
  asyncHandler(proctoringController.analyzeFace)
);

/**
 * @route   GET /api/v1/proctoring/user-exams/:userExamId/events
 * @desc    Get my proctoring events
 * @access  Private (Exam owner)
 */
proctoringRouter.get(
  '/user-exams/:userExamId/events',
  validate(proctoringValidation.getEventsSchema),
  asyncHandler(proctoringController.getEvents)
);

// -----------------------------------------------------------------
// ROUTES: Admin Monitoring (mounted at /admin/proctoring)
// -----------------------------------------------------------------

/**
 * @route   GET /api/v1/admin/proctoring/events
 * @desc    Get all proctoring events with filters
 * @access  Private (Admin only)
 */
proctoringRouter.get(
  '/events',
  validate(proctoringValidation.getAdminEventsSchema),
  asyncHandler(async (req, res, next) => {
    if (isAdminContext(req)) {
      return await proctoringController.getAdminEvents(req, res, next);
    }
    return next();
  })
);