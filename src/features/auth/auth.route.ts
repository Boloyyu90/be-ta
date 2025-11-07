import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { authLimiter } from '@/shared/middleware/rate-limit.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as authController from './auth.controller';
import * as authValidation from './auth.validation';

export const authRouter = Router();

// =================================================================
// MOUNTING CONTEXT:
// 1. /api/v1/auth    → Public authentication (no auth required)
// =================================================================

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
authRouter.post(
  '/register',
  authLimiter,
  validate(authValidation.registerSchema),
  asyncHandler(authController.register)
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
authRouter.post(
  '/login',
  authLimiter,
  validate(authValidation.loginSchema),
  asyncHandler(authController.login)
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
authRouter.post(
  '/refresh',
  validate(authValidation.refreshTokenSchema),
  asyncHandler(authController.refreshToken)
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
authRouter.post(
  '/logout',
  validate(authValidation.logoutSchema),
  asyncHandler(authController.logout)
);