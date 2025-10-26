import { z } from 'zod';
import { ProctoringEventType } from '@prisma/client';

// ==================== REQUEST SCHEMAS ====================

/**
 * Schema for logging a single proctoring event
 * POST /api/v1/proctoring/events
 */
export const logEventSchema = z.object({
  body: z.object({
    userExamId: z
      .number({ required_error: 'User exam ID is required' })
      .int('User exam ID must be an integer')
      .positive('User exam ID must be positive'),
    eventType: z.nativeEnum(ProctoringEventType, {
      errorMap: () => ({ message: 'Invalid event type' }),
    }),
    metadata: z
      .record(z.any())
      .optional()
      .describe('Additional event metadata'),
    severity: z
      .enum(['LOW', 'MEDIUM', 'HIGH'])
      .optional()
      .default('LOW'),
  }),
});

/**
 * Schema for logging multiple events (batch)
 * POST /api/v1/proctoring/events/batch
 */
export const logEventsBatchSchema = z.object({
  body: z.object({
    events: z
      .array(
        z.object({
          userExamId: z.number().int().positive(),
          eventType: z.nativeEnum(ProctoringEventType),
          metadata: z.record(z.any()).optional(),
          severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('LOW'),
        })
      )
      .min(1, 'At least one event required')
      .max(100, 'Max 100 events per batch'),
  }),
});

/**
 * Schema for getting events
 * GET /api/v1/proctoring/user-exams/:id/events
 */
export const getEventsSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
  query: z.object({
    eventType: z.nativeEnum(ProctoringEventType).optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    page: z
      .string()
      .optional()
      .default('1')
      .transform(Number)
      .pipe(z.number().int().positive()),
    limit: z
      .string()
      .optional()
      .default('50')
      .transform(Number)
      .pipe(z.number().int().positive().max(100)),
  }),
});

/**
 * Schema for getting stats
 * GET /api/v1/proctoring/user-exams/:id/stats
 */
export const getStatsSchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
});

/**
 * Schema for admin events
 * GET /api/v1/admin/proctoring/events
 */
export const getAdminEventsSchema = z.object({
  query: z.object({
    userExamId: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : undefined))
      .pipe(z.number().int().positive().optional()),
    examId: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : undefined))
      .pipe(z.number().int().positive().optional()),
    userId: z
      .string()
      .optional()
      .transform((val) => (val ? Number(val) : undefined))
      .pipe(z.number().int().positive().optional()),
    eventType: z.nativeEnum(ProctoringEventType).optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    page: z
      .string()
      .optional()
      .default('1')
      .transform(Number)
      .pipe(z.number().int().positive()),
    limit: z
      .string()
      .optional()
      .default('50')
      .transform(Number)
      .pipe(z.number().int().positive().max(100)),
    sortBy: z.enum(['timestamp', 'severity']).optional().default('timestamp'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Schema for ML face detection
 * POST /api/v1/proctoring/ml/detect-face
 */
export const detectFaceSchema = z.object({
  body: z.object({
    userExamId: z.number().int().positive(),
    imageBase64: z.string().min(100),
    timestamp: z
      .string()
      .datetime()
      .optional()
      .default(() => new Date().toISOString()),
  }),
});

// ==================== REQUEST TYPES ====================

export type LogEventInput = z.infer<typeof logEventSchema>['body'];
export type LogEventsBatchInput = z.infer<typeof logEventsBatchSchema>['body'];
export type GetEventsParams = z.infer<typeof getEventsSchema>['params'];
export type GetEventsQuery = z.infer<typeof getEventsSchema>['query'];
export type GetStatsParams = z.infer<typeof getStatsSchema>['params'];
export type GetAdminEventsQuery = z.infer<typeof getAdminEventsSchema>['query'];
export type DetectFaceInput = z.infer<typeof detectFaceSchema>['body'];

// ==================== RESPONSE TYPES ====================

export interface ProctoringEvent {
  id: number;
  userExamId: number;
  eventType: ProctoringEventType;
  timestamp: Date;
  metadata: Record<string, any> | null;
  severity: string;
}

export interface ProctoringEventDetail extends ProctoringEvent {
  userExam: {
    id: number;
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

export interface LogEventResponse {
  message: string;
  event: ProctoringEvent;
}

export interface LogEventsBatchResponse {
  message: string;
  logged: number;
  events: ProctoringEvent[];
}

export interface EventsListResponse {
  data: ProctoringEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface EventTypeStats {
  eventType: ProctoringEventType;
  count: number;
  percentage: number;
}

export interface SeverityStats {
  severity: string;
  count: number;
  percentage: number;
}

export interface ProctoringStatsResponse {
  userExamId: number;
  totalEvents: number;
  suspiciousCount: number;
  suspiciousPercentage: number;
  eventsByType: EventTypeStats[];
  eventsBySeverity: SeverityStats[];
  timeline: Array<{
    timestamp: Date;
    eventType: ProctoringEventType;
    severity: string;
  }>;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface FaceDetectionResult {
  detected: boolean;
  faceCount: number;
  confidence: number;
  boundingBoxes: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  warnings: string[];
  eventLogged: boolean;
  event?: ProctoringEvent;
}