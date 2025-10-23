import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { authLimiter } from '@/shared/middleware/rate-limit.middleware';
import * as authController from './auth.controller';
import * as authValidation from './auth.validation';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter, // Rate limit: 5 attempts per 15 minutes
  validate(authValidation.registerSchema),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter, // Rate limit: 5 attempts per 15 minutes
  validate(authValidation.loginSchema),
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  validate(authValidation.refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post(
  '/logout',
  validate(authValidation.logoutSchema),
  authController.logout
);

export default router;