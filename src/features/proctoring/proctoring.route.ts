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
 * @desc    Log a single proctoring event
 * @access  Private (All authenticated users)
 */
proctoringRouter.post(
  '/proctoring/events',
  authenticate,
  validate(proctoringValidation.logEventSchema),
  asyncHandler(proctoringController.logEvent)
);

/**
 * @route   POST /api/v1/proctoring/events/batch
 * @desc    Log multiple proctoring events in batch
 * @access  Private (All authenticated users)
 */
proctoringRouter.post(
  '/proctoring/events/batch',
  authenticate,
  validate(proctoringValidation.logEventsBatchSchema),
  asyncHandler(proctoringController.logEventsBatch)
);

/**
 * @route   POST /api/v1/proctoring/detect-face
 * @desc    Submit image for face detection (ML integration)
 * @access  Private (All authenticated users)
 */
proctoringRouter.post(
  '/proctoring/detect-face',
  authenticate,
  validate(proctoringValidation.detectFaceSchema),
  asyncHandler(proctoringController.detectFace)
);

/**
 * @route   GET /api/v1/proctoring/user-exams/:id/events
 * @desc    Get proctoring events for a user exam
 * @access  Private (Owner only)
 */
proctoringRouter.get(
  '/proctoring/user-exams/:id/events',
  authenticate,
  validate(proctoringValidation.getEventsSchema),
  asyncHandler(proctoringController.getEvents)
);

/**
 * @route   GET /api/v1/proctoring/user-exams/:id/stats
 * @desc    Get proctoring statistics for a user exam
 * @access  Private (Owner only)
 */
proctoringRouter.get(
  '/proctoring/user-exams/:id/stats',
  authenticate,
  validate(proctoringValidation.getStatsSchema),
  asyncHandler(proctoringController.getStats)
);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/v1/admin/proctoring/events
 * @desc    Get all proctoring events with filters (admin dashboard)
 * @access  Private (Admin only)
 */
proctoringRouter.get(
  '/admin/proctoring/events',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(proctoringValidation.getAdminEventsSchema),
  asyncHandler(proctoringController.getAdminEvents)
);