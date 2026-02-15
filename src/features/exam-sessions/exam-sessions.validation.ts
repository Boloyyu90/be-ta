import { z } from 'zod';
import { ExamStatus, QuestionType } from '@prisma/client';

// ==================== VALIDATION HELPERS ====================

/**
 * Simplified ID parameter validation using z.coerce
 */
const idParamSchema = z.coerce.number().int().positive();

/**
 * Reusable pagination schema
 */
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().min(1).default(1),
  limit: z.coerce.number().int().positive().min(1).max(100).default(10),
});

// ==================== REQUEST SCHEMAS ====================

/**
 * Schema for starting an exam
 * POST /api/v1/exams/:id/start
 */
export const startExamSchema = z.object({
  params: z.object({
    id: idParamSchema,
  }),
});

/**
 * Schema for getting user's exam sessions
 * GET /api/v1/exam-sessions
 */
export const getUserExamsSchema = z.object({
  query: paginationSchema.extend({
    status: z.nativeEnum(ExamStatus).optional(),
  }),
});

/**
 * Schema for getting user exam details
 * GET /api/v1/exam-sessions/:id
 */
export const getUserExamSchema = z.object({
  params: z.object({
    id: idParamSchema,
  }),
});

/**
 * Schema for getting exam questions
 * GET /api/v1/exam-sessions/:id/questions
 */
export const getExamQuestionsSchema = z.object({
  params: z.object({
    id: idParamSchema,
  }),
});

/**
 * Schema for submitting an answer
 * POST /api/v1/exam-sessions/:id/answers
 */
export const submitAnswerSchema = z.object({
  params: z.object({
    id: idParamSchema,
  }),
  body: z.object({
    examQuestionId: z.coerce.number().int().positive(),
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
 * GET /api/v1/exam-sessions/:id/answers
 */
export const getExamAnswersSchema = z.object({
  params: z.object({
    id: idParamSchema,
  }),
});

/**
 * Schema for submitting exam
 * POST /api/v1/exam-sessions/:id/submit
 */
export const submitExamSchema = z.object({
  params: z.object({
    id: idParamSchema,
  }),
});

/**
 * Schema for getting user's results
 * GET /api/v1/results
 */
export const getMyResultsSchema = z.object({
  query: paginationSchema.extend({
    status: z.nativeEnum(ExamStatus).optional(),
    examId: z.coerce.number().int().positive().optional(),
  }),
});

/**
 * Schema for getting all results (admin)
 * GET /api/v1/admin/results
 */
export const getResultsSchema = z.object({
  query: paginationSchema.extend({
    examId: z.coerce.number().int().positive().optional(),
    userId: z.coerce.number().int().positive().optional(),
    status: z.nativeEnum(ExamStatus).optional(),
  }),
});

// ==================== EXPORTED TYPES ====================

export type StartExamParams = z.infer<typeof startExamSchema>['params'];
export type GetUserExamsQuery = z.infer<typeof getUserExamsSchema>['query'];
export type GetUserExamParams = z.infer<typeof getUserExamSchema>['params'];
export type GetExamQuestionsParams = z.infer<typeof getExamQuestionsSchema>['params'];
export type SubmitAnswerParams = z.infer<typeof submitAnswerSchema>['params'];
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>['body'];
export type GetExamAnswersParams = z.infer<typeof getExamAnswersSchema>['params'];
export type SubmitExamParams = z.infer<typeof submitExamSchema>['params'];
export type GetMyResultsQuery = z.infer<typeof getMyResultsSchema>['query'];
export type GetResultsQuery = z.infer<typeof getResultsSchema>['query'];

// ==================== RESPONSE INTERFACES ====================

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
  attemptNumber: number;
}

/**
 * User exam list item
 */
export interface UserExamListItem {
  id: number;
  examId: number;
  attemptNumber: number;
  exam: {
    id: number;
    title: string;
    description: string | null;
    allowRetake?: boolean;
    maxAttempts?: number | null;
  };
  status: ExamStatus;
  startedAt: Date | null;
  submittedAt: Date | null;
  totalScore: number | null;
  remainingTimeMs: number | null;
  durationMinutes: number | null;
  answeredQuestions: number;
  totalQuestions: number;
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
    passingScore: number;
  };
  attemptNumber: number;
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
    passingGrade: number;
    isPassing: boolean;
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

// ==================== INTERNAL TYPES (Used by service) ====================

/**
 * Answer with exam question info for scoring
 */
export interface AnswerWithQuestion {
  id: number;
  selectedOption: string | null;
  examQuestionId: number;
  examQuestion: {
    question: {
      questionType: QuestionType;
      correctAnswer: string;
      defaultScore: number;
    };
  };
}

/**
 * Stats score by question type
 */
export interface QuestionTypeStats {
  score: number;
  maxScore: number;
  correct: number;
  total: number;
}

/**
 * Score calculation result
 */
export interface ScoreCalculationResult {
  totalScore: number;
  scoresByType: Array<{
    type: QuestionType;
    score: number;
    maxScore: number;
    correctAnswers: number;
    totalQuestions: number;
    passingGrade: number;
    isPassing: boolean;
  }>;
}

/**
 * Cleanup task result
 */
export interface CleanupResult {
  cleaned: number;
  errors: number;
}

/**
 * Token cleanup result
 */
export interface TokenCleanupResult {
  deleted: number;
}