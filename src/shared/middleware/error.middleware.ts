import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { sendError } from '@/shared/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/errors/app-errors';

/**
 * Centralized error handler middleware
 * Handles all errors thrown in the application and formats them consistently
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle custom application errors (operational errors)
  if (error instanceof AppError && error.isOperational) {
    // Operational errors are expected and should be logged as warnings
    logger.warn(
      {
        error: {
          message: error.message,
          statusCode: error.statusCode,
          errorCode: error.errorCode,
          name: error.name,
          context: error.context, // Include context for debugging
        },
        request: {
          method: req.method,
          url: req.url,
          params: req.params,
          query: req.query,
          userId: req.user?.id, // Include user info if available
        },
      },
      'Operational error occurred'
    );

    return sendError(
      res,
      error.message,
      error.statusCode,
      undefined, // No validation errors for operational errors
      error.errorCode,
      env.NODE_ENV === 'development' ? error.context : undefined // Only show context in dev
    );
  }

  // All other errors are unexpected and should be logged with full details
  logger.error(
    {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      request: {
        method: req.method,
        url: req.url,
        body: req.body,
        params: req.params,
        query: req.query,
        userId: req.user?.id,
      },
    },
    'Unexpected error occurred'
  );

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
    return sendError(
      res,
      'Invalid data provided',
      HTTP_STATUS.BAD_REQUEST,
      undefined,
      'DATABASE_VALIDATION'
    );
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return sendError(
      res,
      'Invalid token',
      HTTP_STATUS.UNAUTHORIZED,
      undefined,
      'JWT_INVALID'
    );
  }

  if (error.name === 'TokenExpiredError') {
    return sendError(
      res,
      'Token expired',
      HTTP_STATUS.UNAUTHORIZED,
      undefined,
      'JWT_EXPIRED'
    );
  }

  // Default - internal server error
  const message =
    env.NODE_ENV === 'development' ? error.message : 'Internal server error';

  sendError(
    res,
    message,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    undefined,
    'INTERNAL_ERROR'
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