import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { sendError } from '@/shared/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';

/**
 * Global error handler
 * Must be the last middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
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
      },
    },
    'Error occurred'
  );

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      const field = (error.meta?.target as string[])?.[0] || 'field';
      return sendError(res, `${field} already exists`, HTTP_STATUS.CONFLICT);
    }

    // Record not found
    if (error.code === 'P2025') {
      return sendError(res, 'Record not found', HTTP_STATUS.NOT_FOUND);
    }

    // Foreign key constraint failed
    if (error.code === 'P2003') {
      return sendError(res, 'Related record not found', HTTP_STATUS.BAD_REQUEST);
    }

    // Record to delete does not exist
    if (error.code === 'P2016') {
      return sendError(res, 'Record not found', HTTP_STATUS.NOT_FOUND);
    }
  }

  // Prisma validation error
  if (error instanceof Prisma.PrismaClientValidationError) {
    return sendError(res, 'Invalid data provided', HTTP_STATUS.BAD_REQUEST);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', HTTP_STATUS.UNAUTHORIZED);
  }

  if (error.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', HTTP_STATUS.UNAUTHORIZED);
  }

  // Known application errors (thrown with specific messages)
  if (error.message.includes('already exists')) {
    return sendError(res, error.message, HTTP_STATUS.CONFLICT);
  }

  if (error.message.includes('not found')) {
    return sendError(res, error.message, HTTP_STATUS.NOT_FOUND);
  }

  if (
    error.message.includes('Invalid') ||
    error.message.includes('incorrect') ||
    error.message.includes('required')
  ) {
    return sendError(res, error.message, HTTP_STATUS.BAD_REQUEST);
  }

  if (error.message.includes('Unauthorized') || error.message.includes('token')) {
    return sendError(res, error.message, HTTP_STATUS.UNAUTHORIZED);
  }

  if (error.message.includes('Forbidden') || error.message.includes('permission')) {
    return sendError(res, error.message, HTTP_STATUS.FORBIDDEN);
  }

  // Default error (hide internal details in production)
  const message =
    env.NODE_ENV === 'development' ? error.message : 'Internal server error';

  sendError(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(
    res,
    `Route ${req.method} ${req.path} not found`,
    HTTP_STATUS.NOT_FOUND
  );
};