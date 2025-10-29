import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '@/shared/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Assign parsed values back to req
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        // Use standardized error format
        sendError(
          res,
          'Validation error',
          HTTP_STATUS.BAD_REQUEST,
          errors,
          ERROR_CODES.VALIDATION_ERROR
        );
      } else {
        next(error);
      }
    }
  };
};