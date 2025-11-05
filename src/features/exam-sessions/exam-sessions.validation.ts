import { z } from 'zod';
import { ExamStatus, QuestionType } from '@prisma/client';

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
 * Exam ID parameter validation
 */
const examIdParamSchema = z
  .string({ required_error: 'Exam ID is required' })
  .regex(/^\d+$/, 'Exam ID must be a number')
  .transform(Number)
  .pipe(z.number().int().positive());

// ==================== REQUEST SCHEMAS ====================

/**
 * Schema for starting an exam
 * POST /api/v1/exams/:id/start
 *
 * @access Authenticated users
 */
export const startExamSchema = z.object({
  params: z.object({
    id: examIdParamSchema,
  }),
});

/**
 * Schema for getting user's exam sessions
 * GET /api/v1/user-exams
 *
 * @access Authenticated users
 */
export const getUserExamsSchema = z.object({
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
    status: z.nativeEnum(ExamStatus).optional(),
    sortBy: z
      .enum(['createdAt', 'startedAt', 'submittedAt'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Schema for getting user exam details
 * GET /api/v1/user-exams/:id
 *
 * @access Owner only
 */
export const getUserExamSchema = z.object({
  params: z.object({
    id: userExamIdParamSchema,
  }),
});

/**
 * Schema for getting exam questions during exam session
 * GET /api/v1/user-exams/:id/questions
 *
 * @access Owner only
 */
export const getExamQuestionsSchema = z.object({
  params: z.object({
    id: userExamIdParamSchema,
  }),
  query: z.object({
    type: z.nativeEnum(QuestionType).optional(),
  }),
});

/**
 * Schema for submitting an answer
 * POST /api/v1/user-exams/:id/answers
 *
 * @access Owner only
 */
export const submitAnswerSchema = z.object({
  params: z.object({
    id: userExamIdParamSchema,
  }),
  body: z.object({
    examQuestionId: z
      .number({ required_error: 'Exam question ID is required' })
      .int('Exam question ID must be an integer')
      .positive('Exam question ID must be positive'),
    selectedOption: z
      .enum(['A', 'B', 'C', 'D', 'E'], {
        errorMap: () => ({ message: 'Selected option must be A, B, C, D, or E' }),
      })
      .nullable()
      .optional(),
  }),
});

/**
 * Schema for getting exam answers (review after submit)
 * GET /api/v1/user-exams/:id/answers
 *
 * @access Owner only
 */
export const getExamAnswersSchema = z.object({
  params: z.object({
    id: userExamIdParamSchema,
  }),
});

/**
 * Schema for submitting exam
 * POST /api/v1/user-exams/:id/submit
 *
 * @access Owner only
 */
export const submitExamSchema = z.object({
  params: z.object({
    id: userExamIdParamSchema,
  }),
});

/**
 * Schema for getting results summary
 * GET /api/v1/results/me/summary
 *
 * @access Authenticated users
 */
export const getMyResultsSummarySchema = z.object({
  query: z.object({}),
});

/**
 * Schema for listing user's exam results
 * GET /api/v1/results/me
 *
 * @access Authenticated users
 */
export const getMyResultsSchema = z.object({
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
    status: z.nativeEnum(ExamStatus).optional(),
  }),
});

/**
 * Schema for admin viewing all results
 * GET /api/v1/admin/results
 *
 * @access Admin only
 */
export const getResultsSchema = z.object({
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
    status: z.nativeEnum(ExamStatus).optional(),
    sortBy: z.enum(['createdAt', 'submittedAt', 'totalScore']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

// ==================== REQUEST TYPES ====================

export type StartExamParams = z.infer<typeof startExamSchema>['params'];
export type GetUserExamsQuery = z.infer<typeof getUserExamsSchema>['query'];
export type GetUserExamParams = z.infer<typeof getUserExamSchema>['params'];
export type GetExamQuestionsParams = z.infer<typeof getExamQuestionsSchema>['params'];
export type GetExamQuestionsQuery = z.infer<typeof getExamQuestionsSchema>['query'];
export type SubmitAnswerParams = z.infer<typeof submitAnswerSchema>['params'];
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>['body'];
export type GetExamAnswersParams = z.infer<typeof getExamAnswersSchema>['params'];
export type SubmitExamParams = z.infer<typeof submitExamSchema>['params'];
export type GetMyResultsSummaryInput = z.infer<typeof getMyResultsSummarySchema>;
export type GetMyResultsQuery = z.infer<typeof getMyResultsSchema>['query'];
export type GetResultsQuery = z.infer<typeof getResultsSchema>['query'];

// ==================== RESPONSE TYPES ====================

/**
 * Question for participant (without correct answer)
 */
export interface ParticipantQuestion {
  id: number;
  examQuestionId: number;
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  questionType: QuestionType;
  orderNumber: number;
}

/**
 * Answer status for participant
 */
export interface ParticipantAnswer {
  examQuestionId: number;
  selectedOption: string | null;
  answeredAt: Date | null;
}

/**
 * User exam session data
 */
export interface UserExamSession {
  id: number;
  examId: number;
  examTitle: string;
  durationMinutes: number;
  startedAt: Date;
  submittedAt: Date | null;
  status: ExamStatus;
  remainingTimeMs: number | null;
  totalQuestions: number;
  answeredQuestions: number;
}

/**
 * User exam list item
 */
export interface UserExamListItem {
  id: number;
  exam: {
    id: number;
    title: string;
    description: string | null;
  };
  status: ExamStatus;
  startedAt: Date | null;
  submittedAt: Date | null;
  totalScore: number | null;
  remainingTimeMs: number | null;
  durationMinutes: number | null;
}

/**
 * Start exam response
 */
export interface StartExamResponse {
  userExam: UserExamSession;
  questions: ParticipantQuestion[];
  answers: ParticipantAnswer[];
}

/**
 * Submit answer response
 */
export interface SubmitAnswerResponse {
  message: string;
  answer: {
    examQuestionId: number;
    selectedOption: string | null;
    answeredAt: Date;
  };
  progress: {
    answered: number;
    total: number;
    percentage: number;
  };
}

/**
 * Answer review (after submit)
 */
export interface AnswerReview {
  examQuestionId: number;
  questionContent: string;
  questionType: QuestionType;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  selectedOption: string | null;
  correctAnswer: string;
  isCorrect: boolean | null;
  score: number;
}

/**
 * Exam result data
 */
export interface ExamResult {
  id: number;
  exam: {
    id: number;
    title: string;
    description: string | null;
  };
  user: {
    id: number;
    name: string;
    email: string;
  };
  startedAt: Date;
  submittedAt: Date | null;
  totalScore: number | null;
  status: ExamStatus;
  duration: number | null;
  answeredQuestions: number;
  totalQuestions: number;
  scoresByType: Array<{
    type: QuestionType;
    score: number;
    maxScore: number;
    correctAnswers: number;
    totalQuestions: number;
  }>;
}

/**
 * Submit exam response
 */
export interface SubmitExamResponse {
  message: string;
  result: ExamResult;
}

/**
 * Results summary response
 */
export interface ResultsSummaryResponse {
  taken: number;
  avgScore: number;
  passed: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
}

/**
 * User exams list response
 */
export interface UserExamsListResponse {
  data: UserExamListItem[];
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
 * Results list response
 */
export interface ResultsListResponse {
  data: ExamResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}