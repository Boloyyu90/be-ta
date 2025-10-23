import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { sendError } from '@/shared/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { env } from '@/config/env';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('❌ Error:', error);

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return sendError(res, 'Duplicate entry', HTTP_STATUS.CONFLICT);
    }
    if (error.code === 'P2025') {
      return sendError(res, 'Record not found', HTTP_STATUS.NOT_FOUND);
    }
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', HTTP_STATUS.UNAUTHORIZED);
  }

  if (error.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', HTTP_STATUS.UNAUTHORIZED);
  }

  // Known application errors
  if (error.message.includes('already exists')) {
    return sendError(res, error.message, HTTP_STATUS.CONFLICT);
  }

  if (error.message.includes('not found')) {
    return sendError(res, error.message, HTTP_STATUS.NOT_FOUND);
  }

  if (error.message.includes('Invalid') || error.message.includes('incorrect')) {
    return sendError(res, error.message, HTTP_STATUS.BAD_REQUEST);
  }

  // Default error
  sendError(
    res,
    env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  sendError(res, `Route ${req.method} ${req.path} not found`, HTTP_STATUS.NOT_FOUND);
};