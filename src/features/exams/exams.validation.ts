import { z } from 'zod';
import { QuestionType } from '@prisma/client';

// ==================== VALIDATION HELPERS ====================

/**
 * Exam ID parameter validation
 */
const examIdParamSchema = z
  .string({ required_error: 'Exam ID is required' })
  .regex(/^\d+$/, 'Exam ID must be a number')
  .transform(Number)
  .pipe(z.number().int().positive());

/**
 * Date validation with future date check
 */
const futureDateSchema = z
  .string()
  .datetime('Invalid datetime format. Use ISO 8601 format')
  .transform((val) => new Date(val))
  .refine((date) => date > new Date(), {
    message: 'Date must be in the future',
  });

// ==================== REQUEST SCHEMAS ====================

/**
 * Schema for creating a new exam
 * POST /api/v1/admin/exams
 *
 * @access Admin only
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
 * PATCH /api/v1/admin/exams/:id
 *
 * @access Admin only - creator
 */
export const updateExamSchema = z.object({
  params: z.object({
    id: examIdParamSchema,
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
        .nullable(),
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
 * GET /api/v1/admin/exams/:id
 * GET /api/v1/exams/:id
 */
export const getExamSchema = z.object({
  params: z.object({
    id: examIdParamSchema,
  }),
});

/**
 * Schema for deleting exam
 * DELETE /api/v1/admin/exams/:id
 */
export const deleteExamSchema = z.object({
  params: z.object({
    id: examIdParamSchema,
  }),
});

/**
 * Schema for cloning exam
 * POST /api/v1/admin/exams/:id/clone
 */
export const cloneExamSchema = z.object({
  params: z.object({
    id: examIdParamSchema,
  }),
});

/**
 * Schema for getting exam statistics
 * GET /api/v1/admin/exams/:id/stats
 */
export const getExamStatsSchema = z.object({
  params: z.object({
    id: examIdParamSchema,
  }),
});

/**
 * Schema for listing exams
 * GET /api/v1/admin/exams
 * GET /api/v1/exams
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
    createdBy: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : undefined))
      .pipe(z.number().int().positive().optional()),
  }),
});

/**
 * Schema for attaching questions to exam
 * POST /api/v1/admin/exams/:id/questions
 */
export const attachQuestionsSchema = z.object({
  params: z.object({
    id: examIdParamSchema,
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
 * Schema for detaching questions from exam
 * DELETE /api/v1/admin/exams/:id/questions
 */
export const detachQuestionsSchema = z.object({
  params: z.object({
    id: examIdParamSchema,
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
 * Schema for reordering questions
 * PATCH /api/v1/admin/exams/:id/questions/reorder
 */
export const reorderQuestionsSchema = z.object({
  params: z.object({
    id: examIdParamSchema,
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
 * GET /api/v1/admin/exams/:id/questions
 */
export const getExamQuestionsSchema = z.object({
  params: z.object({
    id: examIdParamSchema,
  }),
  query: z.object({
    type: z.nativeEnum(QuestionType).optional(),
  }),
});

/**
 * Schema for toggling publish status
 * PATCH /api/v1/admin/exams/:id/publish
 */
export const togglePublishSchema = z.object({
  params: z.object({
    id: examIdParamSchema,
  }),
  body: z.object({
    publish: z.boolean({ required_error: 'Publish status is required' }),
  }),
});

// ==================== REQUEST TYPES ====================

export type CreateExamInput = z.infer<typeof createExamSchema>['body'];
export type UpdateExamParams = z.infer<typeof updateExamSchema>['params'];
export type UpdateExamInput = z.infer<typeof updateExamSchema>['body'];
export type GetExamParams = z.infer<typeof getExamSchema>['params'];
export type DeleteExamParams = z.infer<typeof deleteExamSchema>['params'];
export type CloneExamParams = z.infer<typeof cloneExamSchema>['params'];
export type GetExamStatsParams = z.infer<typeof getExamStatsSchema>['params'];
export type GetExamsQuery = z.infer<typeof getExamsSchema>['query'];
export type AttachQuestionsParams = z.infer<typeof attachQuestionsSchema>['params'];
export type AttachQuestionsInput = z.infer<typeof attachQuestionsSchema>['body'];
export type DetachQuestionsParams = z.infer<typeof detachQuestionsSchema>['params'];
export type DetachQuestionsInput = z.infer<typeof detachQuestionsSchema>['body'];
export type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>['body'];
export type GetExamQuestionsParams = z.infer<typeof getExamQuestionsSchema>['params'];
export type GetExamQuestionsQuery = z.infer<typeof getExamQuestionsSchema>['query'];
export type TogglePublishInput = z.infer<typeof togglePublishSchema>['body'];

// ==================== RESPONSE TYPES ====================

/**
 * Basic exam data
 */
export interface ExamPublicData {
  id: number;
  title: string;
  description: string | null;
  startTime: Date | null;
  endTime: Date | null;
  durationMinutes: number;
  createdAt: Date;
  createdBy: number;
  _count: {
    examQuestions: number;
  };
}

/**
 * Detailed exam data
 */
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

/**
 * Exam with questions
 */
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

/**
 * Exam statistics
 */
export interface ExamStatsResponse {
  exam: {
    id: number;
    title: string;
    totalQuestions: number;
  };
  participantStats: {
    total: number;
    finished: number;
    inProgress: number;
    completionRate: number;
  };
  scoreStats: {
    average: number;
    highest: number;
    lowest: number;
    passRate: number;
    passed: number;
  };
}

/**
 * Paginated exams list
 */
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

/**
 * Single exam response
 */
export interface ExamResponse {
  exam: ExamDetailData;
}

/**
 * Exam with questions response
 */
export interface ExamWithQuestionsResponse {
  exam: ExamWithQuestionsData;
}

/**
 * Exam deleted response
 */
export interface ExamDeletedResponse {
  success: boolean;
  message: string;
}

/**
 * Attach questions response
 */
export interface AttachQuestionsResponse {
  message: string;
  attached: number;
  alreadyAttached?: number;
}

/**
 * Detach questions response
 */
export interface DetachQuestionsResponse {
  message: string;
  detached: number;
}

/**
 * Reorder questions response
 */
export interface ReorderQuestionsResponse {
  success: boolean;
  message: string;
  count: number;
}