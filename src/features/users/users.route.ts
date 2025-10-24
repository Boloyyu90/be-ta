import { Router } from 'express';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import * as usersController from '@/features/users/users.controller';
import * as usersValidation from '@/features/users/users.validation';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(usersValidation.createUserSchema),
  usersController.createUser
);

/**
 * @route   GET /api/users
 * @desc    Get users list with filters
 * @access  Private (Admin only)
 */
router.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(usersValidation.getUsersSchema),
  usersController.getUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Get single user by ID
 * @access  Private (Admin only)
 */
router.get(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(usersValidation.getUserSchema),
  usersController.getUserById
);

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user by ID
 * @access  Private (Admin only)
 */
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(usersValidation.updateUserSchema),
  usersController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user by ID
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(usersValidation.deleteUserSchema),
  usersController.deleteUser
);

export default router;