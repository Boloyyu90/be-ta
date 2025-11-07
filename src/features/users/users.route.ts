import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as usersController from './users.controller';
import * as usersValidation from './users.validation';

export const usersRouter = Router();

// =================================================================
// MOUNTING CONTEXTS:
// 1. /api/v1/me              → Self-management (auth required)
// 2. /api/v1/admin/users     → User management (admin required)
//
// STRATEGY:
// - Routes check req.baseUrl to determine context
// - Participant routes: only accessible from /me
// - Admin routes: only accessible from /admin/users
// - No hardcoded /admin in this file
// =================================================================

// -----------------------------------------------------------------
// CONTEXT HELPER: Check if mounted at /me
// -----------------------------------------------------------------
const isMeContext = (req: any) => req.baseUrl.endsWith('/me');
const isAdminContext = (req: any) => req.baseUrl.includes('/admin');

// -----------------------------------------------------------------
// ROUTES: Self-Management (mounted at /me)
// -----------------------------------------------------------------

/**
 * @route   GET /api/v1/me
 * @desc    Get current user profile
 * @access  Private (All authenticated users)
 */
usersRouter.get(
  '/',
  validate(usersValidation.getMeSchema),
  asyncHandler(async (req, res, next) => {
    // Only serve this for /me context
    if (isMeContext(req)) {
      return await usersController.getMe(req, res, next);
    }
    // For admin context, skip to next route (admin GET /)
    return next();
  })
);

/**
 * @route   PATCH /api/v1/me
 * @desc    Update current user profile
 * @access  Private (All authenticated users)
 */
usersRouter.patch(
  '/',
  validate(usersValidation.updateMeSchema),
  asyncHandler(async (req, res, next) => {
    // Only serve this for /me context
    if (isMeContext(req)) {
      return await usersController.updateMe(req, res, next);
    }
    // Admin context has no PATCH /, skip
    return next();
  })
);

// -----------------------------------------------------------------
// ROUTES: Admin Management (mounted at /admin/users)
// Order: Most specific paths first
// -----------------------------------------------------------------

/**
 * @route   GET /api/v1/admin/users/:id/stats
 * @desc    Get user statistics
 * @access  Private (Admin only)
 */
usersRouter.get(
  '/:id/stats',
  validate(usersValidation.getUserStatsSchema),
  asyncHandler(usersController.getUserStats)
);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
usersRouter.get(
  '/:id',
  validate(usersValidation.getUserSchema),
  asyncHandler(usersController.getUserById)
);

/**
 * @route   PATCH /api/v1/admin/users/:id
 * @desc    Update user by ID
 * @access  Private (Admin only)
 */
usersRouter.patch(
  '/:id',
  validate(usersValidation.updateUserSchema),
  asyncHandler(usersController.updateUser)
);

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Delete user by ID
 * @access  Private (Admin only)
 */
usersRouter.delete(
  '/:id',
  validate(usersValidation.deleteUserSchema),
  asyncHandler(usersController.deleteUser)
);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with pagination
 * @access  Private (Admin only)
 */
usersRouter.get(
  '/',
  validate(usersValidation.getUsersSchema),
  asyncHandler(async (req, res, next) => {
    // Only serve this for admin context
    if (isAdminContext(req)) {
      return await usersController.getUsers(req, res, next);
    }
    // Already handled by /me route above
    return next();
  })
);

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create new user
 * @access  Private (Admin only)
 */
usersRouter.post(
  '/',
  validate(usersValidation.createUserSchema),
  asyncHandler(usersController.createUser)
);