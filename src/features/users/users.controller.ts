import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS } from '@/config/constants';
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
 * POST /api/users
 */
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await usersService.createUser(req.body as CreateUserInput);

    sendSuccess(
      res,
      { user },
      'User created successfully',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get users list controller
 * GET /api/users
 */
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validation middleware has already transformed query params
    const result = await usersService.getUsers(req.query as unknown as GetUsersQuery);

    sendSuccess(
      res,
      result,
      'Users retrieved successfully',
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user controller
 * GET /api/users/:id
 */
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validation middleware has already transformed id to number
    const { id } = req.params as unknown as GetUserParams;
    const user = await usersService.getUserById(id);

    sendSuccess(
      res,
      { user },
      'User retrieved successfully',
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update user controller
 * PATCH /api/users/:id
 */
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validation middleware has already transformed id to number
    const { id } = req.params as unknown as UpdateUserParams;
    const user = await usersService.updateUser(id, req.body as UpdateUserInput);

    sendSuccess(
      res,
      { user },
      'User updated successfully',
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user controller
 * DELETE /api/users/:id
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validation middleware has already transformed id to number
    const { id } = req.params as unknown as DeleteUserParams;
    const result = await usersService.deleteUser(id);

    sendSuccess(
      res,
      result,
      'User deleted successfully',
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};