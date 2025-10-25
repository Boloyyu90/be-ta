import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS } from '@/config/constants';

/**
 * Register controller
 * POST /api/v1/auth/register
 */
export const register = async (
  req: Request, 
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 'Registration successful', HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Login controller
 * POST /api/v1/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await authService.login(req.body);
    sendSuccess(res, result, 'Login successful', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh token controller
 * POST /api/v1/auth/refresh
 */
export const refreshToken = async (
  req: Request, 
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshAccessToken(refreshToken);
    sendSuccess(res, { tokens }, 'Token refreshed successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Logout controller
 * POST /api/v1/auth/logout
 */
export const logout = async (
  req: Request, 
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.logout(refreshToken);
    sendSuccess(res, result, 'Logged out successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};