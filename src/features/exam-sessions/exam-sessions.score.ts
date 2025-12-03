/**
 * Exam Sessions - Scoring Logic
 *
 * Logic untuk perhitungan score exam.
 * Dipisah dari service karena:
 * - Complex business logic yang perlu testing tersendiri
 * - Memudahkan perubahan formula scoring di masa depan
 * - Reusability untuk different scoring strategies
 *
 * @module exam-sessions.score
 */

import { QuestionType, Prisma } from '@prisma/client';
import { logger } from '@/shared/utils/logger';
import type {
  QuestionTypeStats,
  ScoreCalculationResult,
  AnswerWithQuestion
} from './exam-sessions.types';

/**
 * Hitung score berdasarkan jawaban dan correct answers
 *
 * Formula:
 * - Jawaban benar → dapat defaultScore
 * - Jawaban salah atau kosong → 0 point
 * - No negative scoring (tidak ada pengurangan nilai)
 *
 * Returns breakdown score by question type (TIU, TWK, TKP) untuk
 * analisis performa user per kategori.
 *
 * @param answers - Array jawaban dengan info soal
 * @returns Object berisi totalScore dan scoresByType
 *
 * @example
 * ```typescript
 * const result = calculateScore(userExam.answers);
 *
 * console.log(`Total: ${result.totalScore}`);
 * console.log(`TIU Score: ${result.scoresByType.find(s => s.type === 'TIU')?.score}`);
 * ```
 */
export const calculateScore = (
  answers: AnswerWithQuestion[]
): ScoreCalculationResult => {
  let totalScore = 0;
  const scoresByType = new Map<QuestionType, QuestionTypeStats>();

  // Initialize stats untuk setiap tipe soal
  for (const type of Object.values(QuestionType)) {
    scoresByType.set(type, {
      score: 0,
      maxScore: 0,
      correct: 0,
      total: 0,
    });
  }

  // Hitung score per jawaban
  for (const answer of answers) {
    const question = answer.examQuestion.question;
    const isCorrect = answer.selectedOption === question.correctAnswer;
    const scoreEarned = isCorrect ? question.defaultScore : 0;

    // Add ke total score
    totalScore += scoreEarned;

    // Update stats per tipe soal
    const typeStats = scoresByType.get(question.questionType);
    if (typeStats) {
      typeStats.score += scoreEarned;
      typeStats.maxScore += question.defaultScore;
      typeStats.total += 1;
      if (isCorrect) {
        typeStats.correct += 1;
      }
    }
  }

  // Log scoring summary untuk debugging
  logger.debug(
    {
      totalScore,
      totalAnswers: answers.length,
      breakdown: Array.from(scoresByType.entries()).map(([type, stats]) => ({
        type,
        score: stats.score,
        maxScore: stats.maxScore,
        percentage: Math.round((stats.score / stats.maxScore) * 100) || 0,
      })),
    },
    'Score calculation completed'
  );

  return {
    totalScore,
    scoresByType: Array.from(scoresByType.entries()).map(([type, stats]) => ({
      type,
      score: stats.score,
      maxScore: stats.maxScore,
      correctAnswers: stats.correct,
      totalQuestions: stats.total,
    })),
  };
};

/**
 * Update correctness flag untuk semua answers dalam transaction
 *
 * Digunakan saat submit exam untuk mark jawaban benar/salah.
 * Harus dipanggil dalam Prisma transaction untuk atomicity.
 *
 * @param tx - Prisma transaction client
 * @param answers - Array jawaban yang mau di-update
 *
 * @example
 * ```typescript
 * await prisma.$transaction(async (tx) => {
 *   await updateAnswerCorrectness(tx, userExam.answers);
 * });
 * ```
 */
export const updateAnswerCorrectness = async (
  tx: Prisma.TransactionClient,
  answers: AnswerWithQuestion[]
): Promise<void> => {
  for (const answer of answers) {
    const question = answer.examQuestion.question;
    const isCorrect = answer.selectedOption === question.correctAnswer;

    await tx.answer.update({
      where: { id: answer.id },
      data: { isCorrect },
    });
  }
};

/**
 * Calculate passing status berdasarkan minimum score
 *
 * Utility untuk determine apakah user lulus exam.
 * Bisa dipake kalau nanti ada feature passing grade.
 *
 * @param totalScore - Total score yang didapat
 * @param maxScore - Maximum score yang bisa didapat
 * @param passingPercentage - Minimum percentage untuk lulus (default 60%)
 * @returns true jika lulus
 *
 * @example
 * ```typescript
 * const isPassed = isPassingScore(75, 100, 60);
 * // Returns: true (75% >= 60%)
 * ```
 */
export const isPassingScore = (
  totalScore: number,
  maxScore: number,
  passingPercentage: number = 60
): boolean => {
  if (maxScore === 0) return false;
  const percentage = (totalScore / maxScore) * 100;
  return percentage >= passingPercentage;
};

/**
 * Get score grade (A/B/C/D/E) berdasarkan percentage
 *
 * Grading scale:
 * - A: 90-100%
 * - B: 80-89%
 * - C: 70-79%
 * - D: 60-69%
 * - E: 0-59%
 *
 * @param score - Score yang didapat
 * @param maxScore - Maximum score
 * @returns Grade letter (A/B/C/D/E)
 */
export const getScoreGrade = (score: number, maxScore: number): string => {
  if (maxScore === 0) return 'E';

  const percentage = (score / maxScore) * 100;

  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'E';
};

/**
 * Calculate score statistics untuk analytics
 *
 * @param scores - Array of user scores
 * @returns Stats object dengan average, min, max, median
 */
export const calculateScoreStatistics = (scores: number[]) => {
  if (scores.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      median: 0,
      total: 0,
    };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    average: Math.round(sum / sorted.length),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
    total: sorted.length,
  };
};