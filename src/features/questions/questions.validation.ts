import { z } from 'zod';
import { QuestionType } from '@prisma/client';

// ==================== VALIDATION HELPERS ====================

/**
 * Question options schema
 * Must have exactly 5 keys: A, B, C, D, E with non-empty values
 */
const optionsSchema = z
  .object({
    A: z.string().min(1, 'Option A cannot be empty'),
    B: z.string().min(1, 'Option B cannot be empty'),
    C: z.string().min(1, 'Option C cannot be empty'),
    D: z.string().min(1, 'Option D cannot be empty'),
    E: z.string().min(1, 'Option E cannot be empty'),
  })
  .strict(); // No additional keys allowed

/**
 * Correct answer schema
 * Must be one of: A, B, C, D, E
 */
const correctAnswerSchema = z.enum(['A', 'B', 'C', 'D', 'E'], {
  errorMap: () => ({ message: 'Correct answer must be A, B, C, D, or E' }),
});

/**
 * Question ID parameter validation
 */
const questionIdParamSchema = z
  .string({ required_error: 'Question ID is required' })
  .regex(/^\d+$/, 'Question ID must be a number')
  .transform(Number)
  .pipe(z.number().int().positive());

// ==================== REQUEST SCHEMAS ====================

/**
 * Schema for creating a new question
 * POST /api/v1/admin/questions
 *
 * @access Admin only
 */
export const createQuestionSchema = z.object({
  body: z.object({
    content: z
      .string({ required_error: 'Content is required' })
      .min(10, 'Content must be at least 10 characters')
      .max(5000, 'Content must not exceed 5000 characters')
      .trim(),
    options: optionsSchema,
    correctAnswer: correctAnswerSchema,
    questionType: z.nativeEnum(QuestionType, {
      errorMap: () => ({ message: 'Question type must be TIU, TWK, or TKP' }),
    }),
    defaultScore: z
      .number()
      .int('Score must be an integer')
      .positive('Score must be positive')
      .min(1, 'Score must be at least 1')
      .max(100, 'Score must not exceed 100')
      .optional()
      .default(1),
  }),
});

/**
 * Schema for updating a question
 * PATCH /api/v1/admin/questions/:id
 *
 * @access Admin only
 */
export const updateQuestionSchema = z.object({
  params: z.object({
    id: questionIdParamSchema,
  }),
  body: z
    .object({
      content: z
        .string()
        .min(10, 'Content must be at least 10 characters')
        .max(5000, 'Content must not exceed 5000 characters')
        .trim()
        .optional(),
      options: optionsSchema.optional(),
      correctAnswer: correctAnswerSchema.optional(),
      questionType: z
        .nativeEnum(QuestionType, {
          errorMap: () => ({ message: 'Question type must be TIU, TWK, or TKP' }),
        })
        .optional(),
      defaultScore: z
        .number()
        .int('Score must be an integer')
        .positive('Score must be positive')
        .min(1, 'Score must be at least 1')
        .max(100, 'Score must not exceed 100')
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

/**
 * Schema for getting single question
 * GET /api/v1/admin/questions/:id
 */
export const getQuestionSchema = z.object({
  params: z.object({
    id: questionIdParamSchema,
  }),
});

/**
 * Schema for deleting question
 * DELETE /api/v1/admin/questions/:id
 */
export const deleteQuestionSchema = z.object({
  params: z.object({
    id: questionIdParamSchema,
  }),
});

/**
 * Schema for getting questions list
 * GET /api/v1/admin/questions
 */
export const getQuestionsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .default('1')
      .transform(Number)
      .pipe(z.number().int().positive().min(1)),
    limit: z
      .string()
      .optional()
      .default('10')
      .transform(Number)
      .pipe(z.number().int().positive().min(1).max(100)),
    type: z.nativeEnum(QuestionType).optional(),
    search: z
      .string()
      .optional()
      .transform((val) => (val ? val.trim() : undefined)),
    sortBy: z
      .enum(['createdAt', 'questionType', 'defaultScore'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Schema for bulk creating questions
 * POST /api/v1/admin/questions/bulk
 *
 * @access Admin only
 */
export const bulkCreateQuestionsSchema = z.object({
  body: z.object({
    questions: z
      .array(
        z.object({
          content: z
            .string({ required_error: 'Content is required' })
            .min(10, 'Content must be at least 10 characters')
            .max(5000, 'Content must not exceed 5000 characters')
            .trim(),
          options: optionsSchema,
          correctAnswer: correctAnswerSchema,
          questionType: z.nativeEnum(QuestionType, {
            errorMap: () => ({ message: 'Question type must be TIU, TWK, or TKP' }),
          }),
          defaultScore: z
            .number()
            .int('Score must be an integer')
            .positive('Score must be positive')
            .min(1, 'Score must be at least 1')
            .max(100, 'Score must not exceed 100')
            .optional()
            .default(1),
        })
      )
      .min(1, 'At least one question is required')
      .max(100, 'Cannot create more than 100 questions at once'),
  }),
});

// ==================== REQUEST TYPES ====================

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>['body'];
export type UpdateQuestionParams = z.infer<typeof updateQuestionSchema>['params'];
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>['body'];
export type GetQuestionParams = z.infer<typeof getQuestionSchema>['params'];
export type DeleteQuestionParams = z.infer<typeof deleteQuestionSchema>['params'];
export type GetQuestionsQuery = z.infer<typeof getQuestionsSchema>['query'];
export type BulkCreateQuestionsInput = z.infer<typeof bulkCreateQuestionsSchema>['body'];

// ==================== RESPONSE TYPES ====================

/**
 * Question data
 */
export interface QuestionData {
  id: number;
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: string;
  questionType: QuestionType;
  defaultScore: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated questions list
 */
export interface QuestionsListResponse {
  data: QuestionData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Single question response
 */
export interface QuestionResponse {
  question: QuestionData;
}

/**
 * Question deleted response
 */
export interface QuestionDeletedResponse {
  success: boolean;
  message: string;
}

/**
 * Bulk create response
 */
export interface BulkCreateResponse {
  created: number;
  questions: QuestionData[];
}