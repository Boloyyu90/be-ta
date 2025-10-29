import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { sendError } from '@/shared/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import { AppError } from '@/shared/errors/app-errors';

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
          name: error.name,
        },
        request: {
          method: req.method,
          url: req.url,
          params: req.params,
          query: req.query,
        },
      },
      'Operational error occurred'
    );

    return sendError(res, error.message, error.statusCode);
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
      },
    },
    'Unexpected error occurred'
  );

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const field = (error.meta?.target as string[])?.[0] || 'field';
      return sendError(res, `${field} already exists`, HTTP_STATUS.CONFLICT);
    }

    if (error.code === 'P2025') {
      return sendError(res, 'Record not found', HTTP_STATUS.NOT_FOUND);
    }

    if (error.code === 'P2003') {
      return sendError(res, 'Related record not found', HTTP_STATUS.BAD_REQUEST);
    }

    if (error.code === 'P2016') {
      return sendError(res, 'Record not found', HTTP_STATUS.NOT_FOUND);
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return sendError(res, 'Invalid data provided', HTTP_STATUS.BAD_REQUEST);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', HTTP_STATUS.UNAUTHORIZED);
  }

  if (error.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', HTTP_STATUS.UNAUTHORIZED);
  }

  // Default - internal server error
  const message =
    env.NODE_ENV === 'development'
      ? error.message
      : 'Internal server error';

  sendError(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
};

export const notFoundHandler = (req: Request, res: Response) => {
  sendError(
    res,
    `Route ${req.method} ${req.path} not found`,
    HTTP_STATUS.NOT_FOUND
  );
};