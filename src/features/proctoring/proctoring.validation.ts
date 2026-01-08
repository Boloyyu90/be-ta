import { z } from 'zod';
import { ProctoringEventType } from '@prisma/client';

// ==================== VALIDATION HELPERS ====================

/**
 * User exam ID parameter validation
 */
const userExamIdParamSchema = z
  .string({ required_error: 'User exam ID is required' })
  .regex(/^\d+$/, 'User exam ID must be a number')
  .transform(Number)
  .pipe(z.number().int().positive());

/**
 * ISO datetime string validation
 */
const isoDateSchema = z
  .string()
  .datetime('Invalid datetime format. Use ISO 8601 format');

// ==================== REQUEST SCHEMAS ====================

/**
 * Schema for logging proctoring event
 * POST /api/v1/proctoring/events
 *
 * @access Authenticated users
 */
export const logEventSchema = z.object({
  body: z.object({
    userExamId: z
      .number({ required_error: 'User exam ID is required' })
      .int()
      .positive(),
    eventType: z.nativeEnum(ProctoringEventType, {
      errorMap: () => ({ message: 'Invalid event type' }),
    }),
    metadata: z.record(z.any()).optional(), // ✅ CHANGED: eventData → metadata
  }),
});

/**
 * Schema for getting proctoring events
 * GET /api/v1/proctoring/exam-sessions/:userExamId/events
 *
 * @access Exam participant
 */
export const getEventsSchema = z.object({
  params: z.object({
    userExamId: userExamIdParamSchema,
  }),
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
      .default('20')
      .transform(Number)
      .pipe(z.number().int().positive().min(1).max(100)),
    eventType: z.nativeEnum(ProctoringEventType).optional(),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Schema for getting admin proctoring events
 * GET /api/v1/admin/proctoring/events
 *
 * @access Admin only
 */
export const getAdminEventsSchema = z.object({
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
      .default('20')
      .transform(Number)
      .pipe(z.number().int().positive().min(1).max(100)),
    eventType: z.nativeEnum(ProctoringEventType).optional(),
    userExamId: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : undefined))
      .pipe(z.number().int().positive().optional()),
    startDate: isoDateSchema.optional(),
    endDate: isoDateSchema.optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Schema for analyzing face detection
 * POST /api/v1/proctoring/exam-sessions/:userExamId/analyze-face
 *
 * @access Exam participant
 */
export const analyzeFaceSchema = z.object({
  params: z.object({
    userExamId: userExamIdParamSchema,
  }),
  body: z.object({
    imageBase64: z
      .string({ required_error: 'Image data is required' })
      .min(100, 'Image data too short'),
  }),
});

// ==================== REQUEST TYPES ====================

export type LogEventInput = z.infer<typeof logEventSchema>['body'];
export type GetEventsParams = z.infer<typeof getEventsSchema>['params'];
export type GetEventsQuery = z.infer<typeof getEventsSchema>['query'];
export type GetAdminEventsQuery = z.infer<typeof getAdminEventsSchema>['query'];
export type AnalyzeFaceParams = z.infer<typeof analyzeFaceSchema>['params'];
export type AnalyzeFaceInput = z.infer<typeof analyzeFaceSchema>['body'];

// ==================== RESPONSE TYPES ====================

/**
 * Proctoring event data
 */
export interface ProctoringEventData {
  id: number;
  userExamId: number;
  eventType: ProctoringEventType;
  metadata: Record<string, any> | null;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Proctoring event with user exam info (admin view)
 */
export interface ProctoringEventDetailData extends ProctoringEventData {
  userExam: {
    id: number;
    userId: number;
    examId: number;
    status: string;
    attemptNumber: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
    exam: {
      id: number;
      title: string;
    };
  };
}

/**
 * Face analysis result
 * Matches actual ML service response structure
 */
export interface FaceAnalysisResult {
  analysis: {
    status: 'success' | 'timeout' | 'error';
    violations: string[];
    confidence: number;
    message: string;
    metadata?: {
      processingTimeMs: number;
      error?: string;
    };
  };
  eventLogged: boolean;
  eventType: ProctoringEventType | null;
  usedFallback: boolean;
}

/**
 * Paginated events response
 */
export interface EventsListResponse {
  data: ProctoringEventData[];
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
 * Event logged response
 */
export interface EventLoggedResponse {
  event: ProctoringEventData;
}