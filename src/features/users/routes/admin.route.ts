import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as usersController from '../users.controller';
import * as usersValidation from '../users.validation';

export const adminUsersRouter = Router();

// =================================================================
// USER MANAGEMENT ROUTES
// Mounted at: /api/v1/admin/users
// Authorization: Admin only (enforced at parent router level)
// =================================================================

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create new user
 * @access  Admin only
 */
adminUsersRouter.post(
  '/',
  validate(usersValidation.createUserSchema),
  asyncHandler(usersController.createUser)
);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with pagination and filters
 * @access  Admin only
 */
adminUsersRouter.get(
  '/',
  validate(usersValidation.getUsersSchema),
  asyncHandler(usersController.getUsers)
);

/**
 * @route   GET /api/v1/admin/users/:id/stats
 * @desc    Get user statistics and activity
 * @access  Admin only
 */
adminUsersRouter.get(
  '/:id/stats',
  validate(usersValidation.getUserStatsSchema),
  asyncHandler(usersController.getUserStats)
);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get user by ID with details
 * @access  Admin only
 */
adminUsersRouter.get(
  '/:id',
  validate(usersValidation.getUserSchema),
  asyncHandler(usersController.getUserById)
);

/**
 * @route   PATCH /api/v1/admin/users/:id
 * @desc    Update user (email, role, password, etc)
 * @access  Admin only
 */
adminUsersRouter.patch(
  '/:id',
  validate(usersValidation.updateUserSchema),
  asyncHandler(usersController.updateUser)
);

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Delete user by ID
 * @access  Admin only
 */
adminUsersRouter.delete(
  '/:id',
  validate(usersValidation.deleteUserSchema),
  asyncHandler(usersController.deleteUser)
);