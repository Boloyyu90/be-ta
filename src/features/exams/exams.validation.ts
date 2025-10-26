import { z } from 'zod';
import { QuestionType } from '@prisma/client';

// ==================== REQUEST SCHEMAS ====================

/**
 * Schema for creating a new exam
 * Admin only endpoint
 */
export const createExamSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must not exceed 200 characters')
      .trim(),
    description: z
      .string()
      .max(2000, 'Description must not exceed 2000 characters')
      .trim()
      .optional(),
    startTime: z
      .string()
      .datetime('Invalid datetime format. Use ISO 8601 format')
      .transform((val) => new Date(val))
      .optional(),
    endTime: z
      .string()
      .datetime('Invalid datetime format. Use ISO 8601 format')
      .transform((val) => new Date(val))
      .optional(),
    durationMinutes: z
      .number({ required_error: 'Duration is required' })
      .int('Duration must be an integer')
      .min(1, 'Duration must be at least 1 minute')
      .max(300, 'Duration must not exceed 300 minutes (5 hours)'),
  }).refine(
    (data) => {
      // If both startTime and endTime provided, endTime must be after startTime
      if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  ),
});

/**
 * Schema for updating an exam
 * All fields optional but at least one must be provided
 */
export const updateExamSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Exam ID is required' })
      .regex(/^\d+$/, 'Exam ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
  body: z
    .object({
      title: z
        .string()
        .min(3, 'Title must be at least 3 characters')
        .max(200, 'Title must not exceed 200 characters')
        .trim()
        .optional(),
      description: z
        .string()
        .max(2000, 'Description must not exceed 2000 characters')
        .trim()
        .optional()
        .nullable(), // Allow null to clear description
      startTime: z
        .string()
        .datetime('Invalid datetime format')
        .transform((val) => new Date(val))
        .optional()
        .nullable(),
      endTime: z
        .string()
        .datetime('Invalid datetime format')
        .transform((val) => new Date(val))
        .optional()
        .nullable(),
      durationMinutes: z
        .number()
        .int('Duration must be an integer')
        .min(1, 'Duration must be at least 1 minute')
        .max(300, 'Duration must not exceed 300 minutes')
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    })
    .refine(
      (data) => {
        if (data.startTime && data.endTime) {
          return data.endTime > data.startTime;
        }
        return true;
      },
      {
        message: 'End time must be after start time',
        path: ['endTime'],
      }
    ),
});

/**
 * Schema for getting single exam
 */
export const getExamSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Exam ID is required' })
      .regex(/^\d+$/, 'Exam ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
});

/**
 * Schema for deleting exam
 */
export const deleteExamSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Exam ID is required' })
      .regex(/^\d+$/, 'Exam ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
});

/**
 * Schema for listing exams (admin & participant)
 * Admin sees all, participant sees only available ones
 */
export const getExamsSchema = z.object({
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
    search: z
      .string()
      .optional()
      .transform((val) => (val ? val.trim() : undefined)),
    sortBy: z
      .enum(['createdAt', 'startTime', 'title'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Schema for attaching questions to exam
 * This creates ExamQuestion records
 */
export const attachQuestionsSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Exam ID is required' })
      .regex(/^\d+$/, 'Exam ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
  body: z.object({
    questionIds: z
      .array(z.number().int().positive(), {
        required_error: 'Question IDs are required',
      })
      .min(1, 'At least one question must be provided')
      .max(200, 'Cannot attach more than 200 questions at once'),
  }),
});

/**
 * Schema for removing questions from exam
 */
export const detachQuestionsSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Exam ID is required' })
      .regex(/^\d+$/, 'Exam ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
  body: z.object({
    questionIds: z
      .array(z.number().int().positive(), {
        required_error: 'Question IDs are required',
      })
      .min(1, 'At least one question must be provided'),
  }),
});

/**
 * Schema for getting exam questions with filters
 */
export const getExamQuestionsSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Exam ID is required' })
      .regex(/^\d+$/, 'Exam ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
  query: z.object({
    type: z.nativeEnum(QuestionType).optional(),
  }),
});

// ==================== REQUEST TYPES ====================

export type CreateExamInput = z.infer<typeof createExamSchema>['body'];
export type UpdateExamParams = z.infer<typeof updateExamSchema>['params'];
export type UpdateExamInput = z.infer<typeof updateExamSchema>['body'];
export type GetExamParams = z.infer<typeof getExamSchema>['params'];
export type DeleteExamParams = z.infer<typeof deleteExamSchema>['params'];
export type GetExamsQuery = z.infer<typeof getExamsSchema>['query'];
export type AttachQuestionsParams = z.infer<typeof attachQuestionsSchema>['params'];
export type AttachQuestionsInput = z.infer<typeof attachQuestionsSchema>['body'];
export type DetachQuestionsParams = z.infer<typeof detachQuestionsSchema>['params'];
export type DetachQuestionsInput = z.infer<typeof detachQuestionsSchema>['body'];
export type GetExamQuestionsParams = z.infer<typeof getExamQuestionsSchema>['params'];
export type GetExamQuestionsQuery = z.infer<typeof getExamQuestionsSchema>['query'];

// ==================== RESPONSE TYPES ====================

export interface ExamPublicData {
  id: number;
  title: string;
  description: string | null;
  startTime: Date | null;
  endTime: Date | null;
  durationMinutes: number | null;
  createdAt: Date;
  createdBy: number;
}

export interface ExamDetailData extends ExamPublicData {
  creator: {
    id: number;
    name: string;
    email: string;
  };
  _count: {
    examQuestions: number;
    userExams: number;
  };
}

export interface ExamWithQuestionsData extends ExamDetailData {
  examQuestions: Array<{
    id: number;
    orderNumber: number;
    question: {
      id: number;
      content: string;
      questionType: QuestionType;
      defaultScore: number;
    };
  }>;
}

export interface ExamsListResponse {
  data: ExamPublicData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ExamResponse {
  exam: ExamDetailData;
}

export interface ExamWithQuestionsResponse {
  exam: ExamWithQuestionsData;
}

export interface ExamDeletedResponse {
  message: string;
}

export interface AttachQuestionsResponse {
  message: string;
  attached: number;
}

export interface DetachQuestionsResponse {
  message: string;
  detached: number;
}