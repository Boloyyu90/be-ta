import { Response } from 'express';

/**
 * Standardized API response interface
 */
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  errorCode?: string;
  context?: Record<string, any>; // For debugging in development
  timestamp?: string;
}

/**
 * Send success response with consistent format
 */
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200
) => {
  const response: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    ...(data && { data }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

/**
 * Send error response with consistent format
 * Supports validation errors and error codes for programmatic handling
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  errors?: Array<{ field: string; message: string }>,
  errorCode?: string,
  context?: Record<string, any>
) => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(errors && errors.length > 0 && { errors }),
    ...(errorCode && { errorCode }),
    ...(context && { context }), // Only included in development
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};