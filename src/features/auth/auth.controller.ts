import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '@/config/constants';

/**
 * Register controller
 * POST /api/v1/auth/register
 *
 * @access Public
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const result = await authService.register(req.body);
  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.REGISTRATION_SUCCESS,
    HTTP_STATUS.CREATED
  );
};

/**
 * Login controller
 * POST /api/v1/auth/login
 *
 * @access Public
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const result = await authService.login(req.body);
  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.LOGIN_SUCCESS,
    HTTP_STATUS.OK
  );
};

/**
 * Refresh token controller
 * POST /api/v1/auth/refresh
 *
 * @access Public
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshAccessToken(refreshToken);

  sendSuccess(
    res,
    { tokens },
    SUCCESS_MESSAGES.TOKEN_REFRESHED,
    HTTP_STATUS.OK
  );
};

/**
 * Logout controller
 * POST /api/v1/auth/logout
 *
 * @access Public
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);

  sendSuccess(
    res,
    { success: true },
    SUCCESS_MESSAGES.LOGOUT_SUCCESS,
    HTTP_STATUS.OK
  );
};