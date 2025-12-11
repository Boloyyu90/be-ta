/**
 * Validation Middleware
 *
 * Express middleware for validating request data using Zod schemas.
 * Updated to support ZodEffects (schemas with .refine())
 *
 * @module validate.middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, ZodEffects } from 'zod';
import { sendError } from '@/shared/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';

/**
 * Type for schemas that can be validated
 * Supports both regular ZodObject and ZodEffects (from .refine())
 */
type ValidatableSchema = AnyZodObject | ZodEffects<AnyZodObject>;

/**
 * Validate request data against a Zod schema
 *
 * Supports:
 * - Regular ZodObject schemas
 * - ZodEffects schemas (created by .refine(), .transform(), etc.)
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * // Regular schema
 * router.post('/', validate(createExamSchema), controller);
 *
 * // Schema with refinements
 * const schemaWithRefine = z.object({...}).refine(...);
 * router.post('/', validate(schemaWithRefine), controller);
 * ```
 */
export const validate = (schema: ValidatableSchema) => {
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

/**
 * Validate only specific parts of the request
 *
 * Useful when you only need to validate body, query, or params separately.
 *
 * @param schema - Zod schema to validate against
 * @param source - Which part of request to validate
 * @returns Express middleware function
 */
export const validatePart = (
  schema: AnyZodObject | ZodEffects<AnyZodObject>,
  source: 'body' | 'query' | 'params'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

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