import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { authLimiter } from '@/shared/middleware/rate-limit.middleware';
import * as authController from './auth.controller';
import * as authValidation from './auth.validation';

export const authRouter = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
authRouter.post(
  '/register',
  authLimiter,
  validate(authValidation.registerSchema),
  authController.register
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
  authController.login
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
authRouter.post(
  '/refresh',
  validate(authValidation.refreshTokenSchema),
  authController.refreshToken
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Public
 */
authRouter.post(
  '/logout',
  validate(authValidation.logoutSchema),
  authController.logout
);