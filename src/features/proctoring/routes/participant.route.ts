import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as proctoringController from '../proctoring.controller';
import * as proctoringValidation from '../proctoring.validation';

export const participantProctoringRouter = Router();

// =================================================================
// PROCTORING EVENT LOGGING ROUTES
// Mounted at: /api/v1/proctoring
// Authorization: Authenticated users (enforced at parent router)
// =================================================================

/**
 * @route   POST /api/v1/proctoring/events
 * @desc    Log proctoring event
 * @access  Authenticated users
 */
participantProctoringRouter.post(
  '/events',
  validate(proctoringValidation.logEventSchema),
  asyncHandler(proctoringController.logEvent)
);

/**
 * @route   POST /api/v1/proctoring/exam-sessions/:userExamId/analyze-face
 * @desc    Analyze face from webcam
 * @access  Session owner only
 */
participantProctoringRouter.post(
  '/exam-sessions/:userExamId/analyze-face',
  validate(proctoringValidation.analyzeFaceSchema),
  asyncHandler(proctoringController.analyzeFace)
);

/**
 * @route   GET /api/v1/proctoring/exam-sessions/:userExamId/events
 * @desc    Get my proctoring events for specific exam session
 * @access  Session owner only
 */
participantProctoringRouter.get(
  '/exam-sessions/:userExamId/events',
  validate(proctoringValidation.getEventsSchema),
  asyncHandler(proctoringController.getEvents)
);