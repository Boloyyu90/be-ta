import { Router } from 'express';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import * as usersController from './users.controller';
import * as usersValidation from './users.validation';
import { UserRole } from '@prisma/client';
import { asyncHandler } from '@/shared/utils/route-handler';

export const usersRouter = Router();

/**
 * @route   POST /api/v1/users
 * @desc    Create a new user
 * @access  Private (Admin only)
 */
usersRouter.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(usersValidation.createUserSchema),
  usersController.createUser,
);

/**
 * @route   GET /api/v1/users
 * @desc    Get users list with filters
 * @access  Private (Admin only)
 */
usersRouter.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(usersValidation.getUsersSchema),
  asyncHandler(usersController.getUsers)
);

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private (All authenticated users)
 */
usersRouter.get(
  '/me',
  authenticate,
  validate(usersValidation.getMeSchema),
  asyncHandler(usersController.getMe)
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get single user by ID
 * @access  Private (Admin only)
 */
usersRouter.get(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(usersValidation.getUserSchema),
  asyncHandler(usersController.getUserById)
);

/**
 * @route   PATCH /api/v1/users/:id
 * @desc    Update user by ID
 * @access  Private (Admin only)
 */
usersRouter.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(usersValidation.updateUserSchema),
   asyncHandler(usersController.updateUser)
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user by ID
 * @access  Private (Admin only)
 */
usersRouter.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(usersValidation.deleteUserSchema),
  asyncHandler(usersController.deleteUser) 
);
