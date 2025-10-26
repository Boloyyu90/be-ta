import { z } from 'zod';
import { QuestionType } from '@prisma/client';

// ==================== HELPER SCHEMAS ====================

/**
 * Schema for question options
 * Must have exactly 5 options: A, B, C, D, E
 */
const optionsSchema = z
  .object({
    A: z.string().min(1, 'Option A cannot be empty'),
    B: z.string().min(1, 'Option B cannot be empty'),
    C: z.string().min(1, 'Option C cannot be empty'),
    D: z.string().min(1, 'Option D cannot be empty'),
    E: z.string().min(1, 'Option E cannot be empty'),
  })
  .strict(); // Tidak boleh ada key lain selain A-E

/**
 * Schema for correct answer
 * Must be one of: A, B, C, D, E
 */
const correctAnswerSchema = z.enum(['A', 'B', 'C', 'D', 'E'], {
  errorMap: () => ({ message: 'Correct answer must be A, B, C, D, or E' }),
});

// ==================== REQUEST SCHEMAS ====================

/**
 * Schema for creating a new question
 * Admin only endpoint
 */
export const createQuestionSchema = z.object({
  body: z.object({
    content: z
      .string({ required_error: 'Question content is required' })
      .min(10, 'Question content must be at least 10 characters')
      .max(5000, 'Question content must not exceed 5000 characters')
      .trim(),
    options: optionsSchema,
    correctAnswer: correctAnswerSchema,
    defaultScore: z
      .number()
      .int('Score must be an integer')
      .min(1, 'Score must be at least 1')
      .max(100, 'Score must not exceed 100')
      .default(5),
    questionType: z
      .nativeEnum(QuestionType, {
        errorMap: () => ({ message: 'Question type must be TIU, TKP, or TWK' }),
      })
      .default(QuestionType.TIU),
  }),
});

/**
 * Schema for updating a question
 * All fields optional but at least one must be provided
 */
export const updateQuestionSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Question ID is required' })
      .regex(/^\d+$/, 'Question ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
  body: z
    .object({
      content: z
        .string()
        .min(10, 'Question content must be at least 10 characters')
        .max(5000, 'Question content must not exceed 5000 characters')
        .trim()
        .optional(),
      options: optionsSchema.optional(),
      correctAnswer: correctAnswerSchema.optional(),
      defaultScore: z
        .number()
        .int('Score must be an integer')
        .min(1, 'Score must be at least 1')
        .max(100, 'Score must not exceed 100')
        .optional(),
      questionType: z
        .nativeEnum(QuestionType, {
          errorMap: () => ({ message: 'Question type must be TIU, TKP, or TWK' }),
        })
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    })
    .refine(
      (data) => {
        // If correctAnswer is provided, options must also be provided or already exist
        // This is a soft check; actual validation happens in service layer
        if (data.correctAnswer && !data.options) {
          return true; // Allow if updating only correctAnswer (options already exist in DB)
        }
        return true;
      },
      {
        message: 'If updating correct answer, ensure options are valid',
      }
    ),
});

/**
 * Schema for getting single question
 */
export const getQuestionSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Question ID is required' })
      .regex(/^\d+$/, 'Question ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
});

/**
 * Schema for deleting question
 */
export const deleteQuestionSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Question ID is required' })
      .regex(/^\d+$/, 'Question ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
});

/**
 * Schema for listing questions
 * Supports pagination, filtering by type, and search
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
    sortBy: z.enum(['createdAt', 'questionType', 'defaultScore']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Schema for bulk delete questions
 * Optional: untuk menghapus multiple questions sekaligus
 */
export const bulkDeleteQuestionsSchema = z.object({
  body: z.object({
    questionIds: z
      .array(z.number().int().positive(), {
        required_error: 'Question IDs are required',
      })
      .min(1, 'At least one question ID must be provided')
      .max(100, 'Cannot delete more than 100 questions at once'),
  }),
});

/**
 * Schema for bulk create questions
 * Optional: untuk import multiple questions dari file
 */
export const bulkCreateQuestionsSchema = z.object({
  body: z.object({
    questions: z
      .array(
        z.object({
          content: z
            .string()
            .min(10, 'Question content must be at least 10 characters')
            .max(5000, 'Question content must not exceed 5000 characters')
            .trim(),
          options: optionsSchema,
          correctAnswer: correctAnswerSchema,
          defaultScore: z.number().int().min(1).max(100).default(5),
          questionType: z.nativeEnum(QuestionType).default(QuestionType.TIU),
        })
      )
      .min(1, 'At least one question must be provided')
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
export type BulkDeleteQuestionsInput = z.infer<typeof bulkDeleteQuestionsSchema>['body'];
export type BulkCreateQuestionsInput = z.infer<typeof bulkCreateQuestionsSchema>['body'];

// ==================== RESPONSE TYPES ====================

/**
 * Question options type
 * Ensures type safety for options object
 */
export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
  E: string;
}

/**
 * Basic question data (public)
 */
export interface QuestionPublicData {
  id: number;
  content: string;
  options: QuestionOptions;
  correctAnswer: string;
  defaultScore: number;
  questionType: QuestionType;
  createdAt: Date;
}

/**
 * Question data with usage count
 */
export interface QuestionDetailData extends QuestionPublicData {
  _count: {
    examQuestions: number; // Berapa kali question ini dipakai di exam
  };
}

/**
 * Question data without correct answer (for participants during exam)
 */
export interface QuestionWithoutAnswer {
  id: number;
  content: string;
  options: QuestionOptions;
  defaultScore: number;
  questionType: QuestionType;
}

/**
 * Paginated questions list response
 */
export interface QuestionsListResponse {
  data: QuestionPublicData[];
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
  question: QuestionDetailData;
}

/**
 * Question deleted response
 */
export interface QuestionDeletedResponse {
  message: string;
}

/**
 * Bulk create response
 */
export interface BulkCreateResponse {
  message: string;
  created: number;
  questions: QuestionPublicData[];
}

/**
 * Bulk delete response
 */
export interface BulkDeleteResponse {
  message: string;
  deleted: number;
}

/**
 * Question type statistics
 */
export interface QuestionTypeStats {
  type: QuestionType;
  count: number;
  totalScore: number;
  averageScore: number;
}

/**
 * Question statistics response
 */
export interface QuestionStatsResponse {
  total: number;
  byType: QuestionTypeStats[];
  mostUsed: Array<{
    id: number;
    content: string;
    usageCount: number;
  }>;
}