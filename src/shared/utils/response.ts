import { Response } from 'express';

/**
 * Standarisasi API Response
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
  context?: Record<string, any>; // Untuk debugging di fase development
  timestamp?: string;
}

/**
 * Mengirim success response dengan consistent format
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
 * Mengirim error response with consistent format
 * Support validation errors dan error codes untuk programmatic handling
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