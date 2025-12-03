/**
 * Exam Sessions - Type Definitions
 *
 * Type definitions dan interfaces untuk exam sessions module.
 * File ini berisi semua types yang digunakan di service layer.
 *
 * @module exam-sessions.types
 */

import { QuestionType, ExamStatus } from '@prisma/client';

// Re-export types dari validation untuk convenience
export type {
  SubmitAnswerInput,
  GetMyResultsQuery,
  GetResultsQuery,
  GetUserExamsQuery,
  ParticipantQuestion,
  ParticipantAnswer,
  UserExamSession,
  ExamResult,
  AnswerReview,
} from './exam-sessions.validation';

/**
 * Stats score berdasarkan tipe soal
 * Digunakan untuk breakdown score per kategori (TIU, TWK, TKP)
 */
export interface QuestionTypeStats {
  /** Total score yang didapat untuk tipe ini */
  score: number;
  /** Maximum score yang bisa didapat */
  maxScore: number;
  /** Jumlah jawaban benar */
  correct: number;
  /** Total soal tipe ini */
  total: number;
}

/**
 * Hasil perhitungan score exam
 */
export interface ScoreCalculationResult {
  /** Total score keseluruhan */
  totalScore: number;
  /** Breakdown score per tipe soal */
  scoresByType: Array<{
    type: QuestionType;
    score: number;
    maxScore: number;
    correctAnswers: number;
    totalQuestions: number;
  }>;
}

/**
 * Answer dengan exam question info untuk scoring
 */
export interface AnswerWithQuestion {
  /** ID answer */
  id: number;
  /** Jawaban yang dipilih user (A/B/C/D/E atau null) */
  selectedOption: string | null;
  /** ID exam question */
  examQuestionId: number;
  /** Info exam question */
  examQuestion: {
    question: {
      /** Tipe soal (TIU/TWK/TKP) */
      questionType: QuestionType;
      /** Jawaban yang benar */
      correctAnswer: string;
      /** Score default untuk soal ini */
      defaultScore: number;
    };
  };
}

/**
 * Prisma select object untuk user exam dengan relasi lengkap
 */
export const USER_EXAM_SELECT = {
  id: true,
  examId: true,
  userId: true,
  startedAt: true,
  submittedAt: true,
  totalScore: true,
  status: true,
  createdAt: true,
  exam: {
    select: {
      id: true,
      title: true,
      description: true,
      durationMinutes: true,
      _count: {
        select: {
          examQuestions: true,
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  _count: {
    select: {
      answers: true,
    },
  },
} as const;

/**
 * Cleanup task result
 */
export interface CleanupResult {
  /** Jumlah session yang dibersihkan */
  cleaned: number;
  /** Jumlah error yang terjadi */
  errors: number;
}

/**
 * Token cleanup result
 */
export interface TokenCleanupResult {
  /** Jumlah token yang dihapus */
  deleted: number;
}