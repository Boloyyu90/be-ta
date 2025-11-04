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
 */
export const createUser = async (
  req: Request<{}, {}, CreateUserInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await usersService.createUser(req.body);

    sendSuccess(res, { user }, SUCCESS_MESSAGES.USER_CREATED, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get users list controller
 * GET /api/v1/users
 */
export const getUsers = async (
  req: Request<{}, {}, {}, GetUsersQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await usersService.getUsers(req.query);

    sendSuccess(res, result, SUCCESS_MESSAGES.USERS_RETRIEVED, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user controller
 * GET /api/v1/users/:id
 */
export const getUserById = async (
  req: Request<GetUserParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await usersService.getUserById(id);

    sendSuccess(res, { user }, SUCCESS_MESSAGES.USER_RETRIEVED, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile controller
 * GET /api/v1/users/me
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await usersService.getMe(userId);

    sendSuccess(res, { user }, 'User profile retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};
/**
 * Update user controller
 * PATCH /api/v1/users/:id
 */
export const updateUser = async (
  req: Request<UpdateUserParams, {}, UpdateUserInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await usersService.updateUser(id, req.body);

    sendSuccess(res, { user }, SUCCESS_MESSAGES.USER_UPDATED, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user controller
 * DELETE /api/v1/users/:id
 */
export const deleteUser = async (
  req: Request<DeleteUserParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await usersService.deleteUser(id);

    sendSuccess(res, result, SUCCESS_MESSAGES.USER_DELETED, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};