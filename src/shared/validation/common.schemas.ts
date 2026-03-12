/**
 * Common Zod Schemas
 *
 * Shared validation schemas untuk menghindari duplikasi dan
 * memastikan konsistensi validasi di seluruh modul.
 *
 * @module shared/validation/common.schemas
 */

import { z } from 'zod';

// ==================== ID PARAM SCHEMAS ====================

/**
 * Standard schema for route parameter IDs (string → positive integer)
 *
 * Express route params are always strings, so this validates the string
 * format first, then transforms to number with type checking.
 *
 * @param label - Human-readable name for error messages (e.g., "Exam ID")
 * @returns Zod schema that transforms string to positive integer
 *
 * @example
 * ```typescript
 * const examIdSchema = createIdParamSchema('Exam ID');
 * // params: z.object({ id: examIdSchema })
 * ```
 */
export const createIdParamSchema = (label: string = 'ID') =>
  z
    .string()
    .regex(/^\d+$/, `${label} must be a number`)
    .transform(Number)
    .pipe(z.number().int().positive());

/**
 * Generic ID param schema (for common cases)
 */
export const idParamSchema = createIdParamSchema('ID');

// ==================== PAGINATION SCHEMAS ====================

/**
 * Standard pagination query schema
 *
 * @param defaults - Custom defaults for page, limit
 * @returns Object with page and limit schemas
 */
export const createPaginationSchema = (defaults: { page?: number; limit?: number } = {}) => ({
  page: z
    .string()
    .optional()
    .default(String(defaults.page ?? 1))
    .transform(Number)
    .pipe(z.number().int().positive().min(1)),
  limit: z
    .string()
    .optional()
    .default(String(defaults.limit ?? 10))
    .transform(Number)
    .pipe(z.number().int().positive().min(1).max(100)),
});

/**
 * Optional ID for query params (e.g., ?examId=5)
 *
 * @param label - Human-readable name for error messages
 */
export const createOptionalIdQuerySchema = (label: string = 'ID') =>
  z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .pipe(z.number().int().positive().optional());
