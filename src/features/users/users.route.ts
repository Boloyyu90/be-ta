import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as usersController from './users.controller';
import * as usersValidation from './users.validation';

export const usersRouter = Router();


// =================================================================
// MOUNTING CONTEXTS:
// 1. /api/v1/me             → Self-management (auth required)
// 2. /api/v1/admin/users     → User management (admin required)
//
// STRATEGY:
// - /me mounting only serves GET / and PATCH /
// - /admin/users mounting serves all other routes
// - No baseUrl checking needed - mounting naturally separates them
// =================================================================

// -----------------------------------------------------------------
// SELF-MANAGEMENT ROUTES (mounted at /api/v1/me)
// Only GET and PATCH on root path
// -----------------------------------------------------------------



/**
 * @route   GET /api/v1/me
 * @desc    Get current user profile
 * @access  Private (All authenticated users)
 *
 * Note: This route is ONLY matched when mounted at /me
 * because /me has no dynamic segments.
 * When mounted at /admin/users, this won't match.
 */
usersRouter.get(
  '/',
  validate(usersValidation.getMeSchema),
  asyncHandler(usersController.getMe)
);

/**
 * @route   PATCH /api/v1/me
 * @desc    Update current user profile
 * @access  Private (All authenticated users)
 */
usersRouter.patch(
  '/',
  validate(usersValidation.updateMeSchema),
  asyncHandler(usersController.updateMe)
);

// -----------------------------------------------------------------
// ADMIN ROUTES (mounted at /api/v1/admin/users)
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
  asyncHandler(usersController.getUsers)
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