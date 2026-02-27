import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken } from '@/shared/utils/jwt';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { UnauthorizedError, ForbiddenError } from '@/shared/errors/app-errors';
import { authLogger } from '@/shared/utils/logger';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      authLogger.tokenInvalid({ ip: req.ip, reason: 'missing_bearer_token' });
      return next(
        new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED, ERROR_CODES.AUTH_INVALID_TOKEN)
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.userId,
      role: payload.role,
    };

    next();
  } catch (error) {
    // JWT errors (JsonWebTokenError, TokenExpiredError) will be
    // forwarded to the global error handler which already handles them
    authLogger.tokenInvalid({ ip: req.ip, reason: 'jwt_verification_failed' });
    next(error);
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED, ERROR_CODES.AUTH_INVALID_TOKEN)
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(ERROR_MESSAGES.FORBIDDEN, ERROR_CODES.FORBIDDEN)
      );
    }

    next();
  };
};
