import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';

/**
 * Error context interface untuk metadata tambahan
 */
export interface ErrorContext {
  [key: string]: any;
}

/**
 * Base class untuk semua application errors
 * Menyimpan HTTP status code, error code, dan context untuk debugging
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode?: string;
  public readonly context?: ErrorContext;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorCode?: string,
    context?: ErrorContext
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Error yang expected, bukan bug
    this.errorCode = errorCode;
    this.context = context;
    this.timestamp = new Date();

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Error ketika resource tidak ditemukan (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: ErrorContext) {
    super(message, HTTP_STATUS.NOT_FOUND, undefined, context);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error ketika ada konflik data (409)
 * Contoh: email sudah terdaftar, data duplikat
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists', context?: ErrorContext) {
    super(message, HTTP_STATUS.CONFLICT, undefined, context);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Error ketika request tidak valid (400)
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Invalid request', context?: ErrorContext) {
    super(message, HTTP_STATUS.BAD_REQUEST, undefined, context);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Error ketika user tidak terautentikasi (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', context?: ErrorContext) {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, context);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Error ketika user tidak memiliki permission (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', context?: ErrorContext) {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, context);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Error untuk business logic violations
 * Contoh: tidak bisa delete exam yang sedang berlangsung
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, errorCode?: string, context?: ErrorContext) {
    super(message, HTTP_STATUS.BAD_REQUEST, errorCode, context);
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }
}