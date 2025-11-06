import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '@/config/constants';
import type {
  CreateUserInput,
  GetUsersQuery,
  GetUserParams,
  UpdateUserParams,
  UpdateUserInput,
  DeleteUserParams,
} from './users.validation';

/**
 * Create user controller
 * POST /api/v1/users
 *
 * @access Private (Admin only)
 */
export const createUser = async (
  req: Request<{}, {}, CreateUserInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = await usersService.createUser(req.body);
  sendSuccess(
    res,
    { user },
    SUCCESS_MESSAGES.USER_CREATED,
    HTTP_STATUS.CREATED
  );
};

/**
 * Get users list controller
 * GET /api/v1/users
 *
 * @access Private (Admin only)
 */
export const getUsers = async (
  req: Request<{}, {}, {}, GetUsersQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const result = await usersService.getUsers(req.query);
  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.USERS_RETRIEVED,
    HTTP_STATUS.OK
  );
};

/**
 * Get single user controller
 * GET /api/v1/users/:id
 *
 * @access Private (Admin only)
 */
export const getUserById = async (
  req: Request<GetUserParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const user = await usersService.getUserById(id);

  sendSuccess(
    res,
    { user },
    SUCCESS_MESSAGES.USER_RETRIEVED,
    HTTP_STATUS.OK
  );
};

/**
 * Get current user profile controller
 * GET /api/v1/users/me
 *
 * @access Private (All authenticated users)
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;
  const user = await usersService.getMe(userId);

  sendSuccess(
    res,
    { user },
    SUCCESS_MESSAGES.PROFILE_RETRIEVED,
    HTTP_STATUS.OK
  );
};

/**
 * Update user controller
 * PATCH /api/v1/users/:id
 *
 * @access Private (Admin only)
 */
export const updateUser = async (
  req: Request<UpdateUserParams, {}, UpdateUserInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const user = await usersService.updateUser(id, req.body);

  sendSuccess(
    res,
    { user },
    SUCCESS_MESSAGES.USER_UPDATED,
    HTTP_STATUS.OK
  );
};

/**
 * Update current user profile controller
 * PATCH /api/v1/users/me
 *
 * @access Private (All authenticated users)
 */
export const updateMe = async (
  req: Request<{}, {}, UpdateUserInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;
  const user = await usersService.updateMe(userId, req.body);

  sendSuccess(
    res,
    { user },
    SUCCESS_MESSAGES.PROFILE_UPDATED,
    HTTP_STATUS.OK
  );
};

/**
 * Delete user controller
 * DELETE /api/v1/users/:id
 *
 * @access Private (Admin only)
 */
export const deleteUser = async (
  req: Request<DeleteUserParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const result = await usersService.deleteUser(id);

  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.USER_DELETED,
    HTTP_STATUS.OK
  );
};

/**
 * Get user statistics controller
 * GET /api/v1/users/:id/stats
 *
 * @access Private (Admin only)
 */
export const getUserStats = async (
  req: Request<GetUserParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const stats = await usersService.getUserStats(id);

  sendSuccess(
    res,
    stats,
    SUCCESS_MESSAGES.USER_STATISTICS_RETRIEVED,
    HTTP_STATUS.OK
  );
};