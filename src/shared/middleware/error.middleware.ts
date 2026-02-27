import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { sendError } from '@/shared/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/errors/app-errors';

/**
 * Centralized error handler middleware
 *
 * Order matters: check known error types first (warn level),
 * then fall through to truly unexpected errors (error level).
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestInfo = {
    method: req.method,
    url: req.url,
    params: req.params,
    query: req.query,
    userId: req.user?.id,
  };

  // 1. Handle custom application errors (operational errors)
  if (error instanceof AppError && error.isOperational) {
    logger.warn(
      {
        error: {
          message: error.message,
          statusCode: error.statusCode,
          errorCode: error.errorCode,
          name: error.name,
          context: error.context,
        },
        request: requestInfo,
      },
      'Operational error occurred'
    );

    return sendError(
      res,
      error.message,
      error.statusCode,
      undefined,
      error.errorCode,
      env.NODE_ENV === 'development'
        ? { ...error.context, stack: error.stack }
        : undefined
    );
  }

  // 2. Handle Prisma errors (known, expected -- log as warn)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn(
      {
        error: {
          message: error.message,
          code: error.code,
          meta: error.meta,
          name: error.name,
        },
        request: requestInfo,
      },
      `Prisma known error: ${error.code}`
    );

    if (error.code === 'P2002') {
      const field = (error.meta?.target as string[])?.[0] || 'field';
      return sendError(
        res,
        `${field} already exists`,
        HTTP_STATUS.CONFLICT,
        undefined,
        'DATABASE_CONFLICT'
      );
    }

    if (error.code === 'P2025') {
      return sendError(
        res,
        'Record not found',
        HTTP_STATUS.NOT_FOUND,
        undefined,
        'DATABASE_NOT_FOUND'
      );
    }

    if (error.code === 'P2003') {
      return sendError(
        res,
        'Related record not found',
        HTTP_STATUS.BAD_REQUEST,
        undefined,
        'DATABASE_FOREIGN_KEY'
      );
    }

    if (error.code === 'P2016') {
      return sendError(
        res,
        'Record not found',
        HTTP_STATUS.NOT_FOUND,
        undefined,
        'DATABASE_NOT_FOUND'
      );
    }

    // Generic Prisma error
    return sendError(
      res,
      env.NODE_ENV === 'development' ? error.message : 'Database error occurred',
      HTTP_STATUS.BAD_REQUEST,
      undefined,
      'DATABASE_ERROR'
    );
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.warn(
      {
        error: { message: error.message, name: error.name },
        request: requestInfo,
      },
      'Prisma validation error'
    );

    return sendError(
      res,
      'Invalid data provided',
      HTTP_STATUS.BAD_REQUEST,
      undefined,
      'DATABASE_VALIDATION'
    );
  }

  // 3. Handle JWT errors (known, expected -- log as warn)
  if (error.name === 'JsonWebTokenError') {
    logger.warn(
      {
        error: { message: error.message, name: error.name },
        request: requestInfo,
      },
      'JWT validation error'
    );

    return sendError(
      res,
      'Invalid token',
      HTTP_STATUS.UNAUTHORIZED,
      undefined,
      'JWT_INVALID'
    );
  }

  if (error.name === 'TokenExpiredError') {
    logger.warn(
      {
        error: { message: error.message, name: error.name },
        request: requestInfo,
      },
      'JWT token expired'
    );

    return sendError(
      res,
      'Token expired',
      HTTP_STATUS.UNAUTHORIZED,
      undefined,
      'JWT_EXPIRED'
    );
  }

  // 4. Truly unexpected errors -- log at error level
  logger.error(
    {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      request: {
        ...requestInfo,
        body: req.body,
      },
    },
    'Unexpected error occurred'
  );

  const message =
    env.NODE_ENV === 'development' ? error.message : 'Internal server error';

  sendError(
    res,
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    undefined,
    'INTERNAL_ERROR',
    env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  sendError(
    res,
    `Route ${req.method} ${req.path} not found`,
    HTTP_STATUS.NOT_FOUND,
    undefined,
    'ROUTE_NOT_FOUND'
  );
};
