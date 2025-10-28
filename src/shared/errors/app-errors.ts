import { HTTP_STATUS } from '@/config/constants';

/**
 * Base class untuk semua application errors
 * Menyimpan HTTP status code dan apakah error harus di-log
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Error yang expected, bukan bug

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Error ketika resource tidak ditemukan (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error ketika ada konflik data (409)
 * Contoh: email sudah terdaftar, data duplikat
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, HTTP_STATUS.CONFLICT);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Error ketika request tidak valid (400)
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Invalid request') {
    super(message, HTTP_STATUS.BAD_REQUEST);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Error ketika user tidak terautentikasi (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, HTTP_STATUS.UNAUTHORIZED);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Error ketika user tidak memiliki permission (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Error untuk business logic violations
 * Contoh: tidak bisa delete exam yang sedang berlangsung
 */
export class BusinessLogicError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.BAD_REQUEST);
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }
}