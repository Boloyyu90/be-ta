import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as usersController from '../users.controller';
import * as usersValidation from '../users.validation';

export const selfRouter = Router();

// =================================================================
// SELF-MANAGEMENT ROUTES
// Mounted at: /api/v1/me
// Authorization: All authenticated users (enforced at parent router)
// =================================================================

/**
 * @route   GET /api/v1/me
 * @desc    Get current user profile
 * @access  Authenticated users
 */
selfRouter.get(
  '/',
  validate(usersValidation.getMeSchema),
  asyncHandler(usersController.getMe)
);

/**
 * @route   PATCH /api/v1/me
 * @desc    Update current user profile (name, password only)
 * @access  Authenticated users
 */
selfRouter.patch(
  '/',
  validate(usersValidation.updateMeSchema),
  asyncHandler(usersController.updateMe)
);

/**
 * @route   GET /api/v1/me/stats
 * @desc    Get current user exam statistics (dashboard metrics)
 * @access  Authenticated users
 * @returns { completedExams, averageScore, totalTimeMinutes, activeExams }
 */
selfRouter.get(
  '/stats',
  asyncHandler(usersController.getMyStats)
);