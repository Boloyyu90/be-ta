import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as proctoringController from './proctoring.controller';
import * as proctoringValidation from './proctoring.validation';

export const proctoringRouter = Router();

// ==================== PARTICIPANT ROUTES ====================

/**
 * @route   POST /api/v1/proctoring/events
 * @desc    Log a proctoring event during exam
 * @access  Private (Authenticated users)
 */
proctoringRouter.post(
  '/events',
  authenticate,
  validate(proctoringValidation.logEventSchema),
  asyncHandler(proctoringController.logEvent)
);

/**
 * @route   GET /api/v1/proctoring/user-exams/:userExamId/events
 * @desc    Get proctoring events for a user exam
 * @access  Private (Exam participant)
 */
proctoringRouter.get(
  '/user-exams/:userExamId/events',
  authenticate,
  validate(proctoringValidation.getEventsSchema),
  asyncHandler(proctoringController.getEvents)
);

/**
 * @route   POST /api/v1/proctoring/user-exams/:userExamId/analyze-face
 * @desc    Analyze face detection from webcam image
 * @access  Private (Exam participant)
 */
proctoringRouter.post(
  '/user-exams/:userExamId/analyze-face',
  authenticate,
  validate(proctoringValidation.analyzeFaceSchema),
  asyncHandler(proctoringController.analyzeFace)
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/admin/proctoring/events
 * @desc    Get all proctoring events (admin view)
 * @access  Private (Admin only)
 */
proctoringRouter.get(
  '/admin/proctoring/events',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(proctoringValidation.getAdminEventsSchema),
  asyncHandler(proctoringController.getAdminEvents)
);