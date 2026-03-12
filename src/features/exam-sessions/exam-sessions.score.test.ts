/**
 * Exam Sessions - Scoring Logic Tests
 *
 * Tests pure business logic functions:
 * - calculateScore: scoring per question type (TWK/TIU/TKP)
 * - updateAnswerCorrectness: DB update via transaction
 * - isPassingScore: passing threshold check
 * - getScoreGrade: grade letter (A-E)
 * - calculateScoreStatistics: stats (average, min, max, median)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuestionType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
vi.mock('@/shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import SUT after mocks
// ---------------------------------------------------------------------------
import {
  calculateScore,
  updateAnswerCorrectness,
  isPassingScore,
  getScoreGrade,
  calculateScoreStatistics,
} from './exam-sessions.score';

import type { AnswerWithQuestion } from './exam-sessions.validation';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

/** Helper: create a TWK/TIU answer fixture */
const makeAnswer = (
  id: number,
  selectedOption: string | null,
  questionType: QuestionType,
  correctAnswer: string,
  defaultScore: number = 5,
  optionScores: Record<string, number> | null = null,
): AnswerWithQuestion => ({
  id,
  selectedOption,
  examQuestionId: id,
  examQuestion: {
    question: {
      questionType,
      correctAnswer,
      defaultScore,
      optionScores,
    },
  },
});

const makeTWK = (id: number, selected: string | null, correct: string, score = 5) =>
  makeAnswer(id, selected, QuestionType.TWK, correct, score);

const makeTIU = (id: number, selected: string | null, correct: string, score = 5) =>
  makeAnswer(id, selected, QuestionType.TIU, correct, score);

const makeTKP = (id: number, selected: string | null, optionScores: Record<string, number> | null, defaultScore = 5) =>
  makeAnswer(id, selected, QuestionType.TKP, '', defaultScore, optionScores);

// ============================================================================
// calculateScore
// ============================================================================

describe('calculateScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return totalScore 0 for empty answers', () => {
    const result = calculateScore([]);

    expect(result.totalScore).toBe(0);
    for (const entry of result.scoresByType) {
      expect(entry.score).toBe(0);
      expect(entry.totalQuestions).toBe(0);
      expect(entry.correctAnswers).toBe(0);
    }
  });

  it('should score TWK correct answer', () => {
    const answers = [makeTWK(1, 'A', 'A', 5)];
    const result = calculateScore(answers);

    expect(result.totalScore).toBe(5);
    const twk = result.scoresByType.find(s => s.type === QuestionType.TWK)!;
    expect(twk.score).toBe(5);
    expect(twk.correctAnswers).toBe(1);
    expect(twk.totalQuestions).toBe(1);
  });

  it('should score TWK wrong answer as 0', () => {
    const answers = [makeTWK(1, 'B', 'A', 5)];
    const result = calculateScore(answers);

    expect(result.totalScore).toBe(0);
    const twk = result.scoresByType.find(s => s.type === QuestionType.TWK)!;
    expect(twk.score).toBe(0);
    expect(twk.correctAnswers).toBe(0);
  });

  it('should score TIU correct answer', () => {
    const answers = [makeTIU(1, 'C', 'C', 5)];
    const result = calculateScore(answers);

    expect(result.totalScore).toBe(5);
    const tiu = result.scoresByType.find(s => s.type === QuestionType.TIU)!;
    expect(tiu.score).toBe(5);
    expect(tiu.correctAnswers).toBe(1);
  });

  it('should score TIU wrong answer as 0', () => {
    const answers = [makeTIU(1, 'A', 'C', 5)];
    const result = calculateScore(answers);

    expect(result.totalScore).toBe(0);
  });

  it('should score TKP using weighted optionScores', () => {
    const scores = { A: 5, B: 4, C: 3, D: 2, E: 1 };
    const answers = [makeTKP(1, 'A', scores)];
    const result = calculateScore(answers);

    expect(result.totalScore).toBe(5);
    const tkp = result.scoresByType.find(s => s.type === QuestionType.TKP)!;
    expect(tkp.score).toBe(5);
  });

  it('should score TKP low option correctly', () => {
    const scores = { A: 5, B: 4, C: 3, D: 2, E: 1 };
    const answers = [makeTKP(1, 'E', scores)];
    const result = calculateScore(answers);

    expect(result.totalScore).toBe(1);
  });

  it('should score TKP as 0 when optionScores is null', () => {
    const answers = [makeTKP(1, 'A', null)];
    const result = calculateScore(answers);

    expect(result.totalScore).toBe(0);
  });

  it('should score null selectedOption as 0 with isCorrect null', () => {
    const answers = [makeTWK(1, null, 'A', 5)];
    const result = calculateScore(answers);

    expect(result.totalScore).toBe(0);
    const twk = result.scoresByType.find(s => s.type === QuestionType.TWK)!;
    expect(twk.correctAnswers).toBe(0);
  });

  it('should calculate mixed question types correctly', () => {
    const answers = [
      makeTWK(1, 'A', 'A', 5),   // correct → 5
      makeTIU(2, 'B', 'C', 5),   // wrong → 0
      makeTKP(3, 'B', { A: 5, B: 4, C: 3, D: 2, E: 1 }), // → 4
    ];
    const result = calculateScore(answers);

    expect(result.totalScore).toBe(9); // 5 + 0 + 4
    expect(result.scoresByType.find(s => s.type === QuestionType.TWK)!.score).toBe(5);
    expect(result.scoresByType.find(s => s.type === QuestionType.TIU)!.score).toBe(0);
    expect(result.scoresByType.find(s => s.type === QuestionType.TKP)!.score).toBe(4);
  });

  it('should calculate all correct answers', () => {
    const answers = [
      makeTWK(1, 'A', 'A', 5),
      makeTWK(2, 'B', 'B', 5),
      makeTWK(3, 'C', 'C', 5),
      makeTWK(4, 'D', 'D', 5),
      makeTWK(5, 'E', 'E', 5),
    ];
    const result = calculateScore(answers);

    expect(result.totalScore).toBe(25);
    const twk = result.scoresByType.find(s => s.type === QuestionType.TWK)!;
    expect(twk.correctAnswers).toBe(5);
  });

  it('should calculate all wrong answers as 0', () => {
    const answers = [
      makeTWK(1, 'B', 'A', 5),
      makeTWK(2, 'A', 'B', 5),
      makeTWK(3, 'D', 'C', 5),
    ];
    const result = calculateScore(answers);

    expect(result.totalScore).toBe(0);
    const twk = result.scoresByType.find(s => s.type === QuestionType.TWK)!;
    expect(twk.correctAnswers).toBe(0);
  });

  it('should set isPassing true when score >= passingGrade', () => {
    // TWK passing grade = 65. Make 13 correct TWK answers (13 * 5 = 65)
    const answers = Array.from({ length: 13 }, (_, i) =>
      makeTWK(i + 1, 'A', 'A', 5)
    );
    const result = calculateScore(answers);

    const twk = result.scoresByType.find(s => s.type === QuestionType.TWK)!;
    expect(twk.score).toBe(65);
    expect(twk.isPassing).toBe(true);
  });

  it('should set isPassing false when score < passingGrade', () => {
    // TWK passing grade = 65. Make 12 correct TWK answers (12 * 5 = 60)
    const answers = Array.from({ length: 12 }, (_, i) =>
      makeTWK(i + 1, 'A', 'A', 5)
    );
    const result = calculateScore(answers);

    const twk = result.scoresByType.find(s => s.type === QuestionType.TWK)!;
    expect(twk.score).toBe(60);
    expect(twk.isPassing).toBe(false);
  });
});

// ============================================================================
// updateAnswerCorrectness
// ============================================================================

describe('updateAnswerCorrectness', () => {
  let mockTx: { answer: { update: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTx = {
      answer: { update: vi.fn().mockResolvedValue({}) },
    };
  });

  it('should call tx.answer.update for each answer', async () => {
    const answers = [
      makeTWK(1, 'A', 'A', 5),
      makeTWK(2, 'B', 'A', 5),
      makeTWK(3, 'C', 'C', 5),
    ];

    await updateAnswerCorrectness(mockTx as any, answers);

    expect(mockTx.answer.update).toHaveBeenCalledTimes(3);
  });

  it('should update TWK correct answer with isCorrect true', async () => {
    const answers = [makeTWK(1, 'A', 'A', 5)];

    await updateAnswerCorrectness(mockTx as any, answers);

    expect(mockTx.answer.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isCorrect: true, score: 5 },
    });
  });

  it('should update TWK wrong answer with isCorrect false', async () => {
    const answers = [makeTWK(1, 'B', 'A', 5)];

    await updateAnswerCorrectness(mockTx as any, answers);

    expect(mockTx.answer.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isCorrect: false, score: 0 },
    });
  });

  it('should update TKP with isCorrect null and weighted score', async () => {
    const scores = { A: 5, B: 4, C: 3, D: 2, E: 1 };
    const answers = [makeTKP(1, 'B', scores)];

    await updateAnswerCorrectness(mockTx as any, answers);

    expect(mockTx.answer.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isCorrect: null, score: 4 },
    });
  });

  it('should update null selectedOption with score 0 and isCorrect null', async () => {
    const answers = [makeTWK(1, null, 'A', 5)];

    await updateAnswerCorrectness(mockTx as any, answers);

    expect(mockTx.answer.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isCorrect: null, score: 0 },
    });
  });
});

// ============================================================================
// isPassingScore
// ============================================================================

describe('isPassingScore', () => {
  it('should return true for exact passing percentage', () => {
    expect(isPassingScore(60, 100, 60)).toBe(true);
  });

  it('should return true for score above passing', () => {
    expect(isPassingScore(75, 100, 60)).toBe(true);
  });

  it('should return false for score below passing', () => {
    expect(isPassingScore(59, 100, 60)).toBe(false);
  });

  it('should return false for maxScore 0', () => {
    expect(isPassingScore(0, 0, 60)).toBe(false);
  });

  it('should use default 60% when passingPercentage not provided', () => {
    expect(isPassingScore(60, 100)).toBe(true);
    expect(isPassingScore(59, 100)).toBe(false);
  });

  it('should return true for 100% score', () => {
    expect(isPassingScore(100, 100, 60)).toBe(true);
  });
});

// ============================================================================
// getScoreGrade
// ============================================================================

describe('getScoreGrade', () => {
  it('should return A for >= 90%', () => {
    expect(getScoreGrade(90, 100)).toBe('A');
    expect(getScoreGrade(95, 100)).toBe('A');
  });

  it('should return B for 80-89%', () => {
    expect(getScoreGrade(80, 100)).toBe('B');
    expect(getScoreGrade(85, 100)).toBe('B');
  });

  it('should return C for 70-79%', () => {
    expect(getScoreGrade(70, 100)).toBe('C');
    expect(getScoreGrade(75, 100)).toBe('C');
  });

  it('should return D for 60-69%', () => {
    expect(getScoreGrade(60, 100)).toBe('D');
    expect(getScoreGrade(65, 100)).toBe('D');
  });

  it('should return E for < 60%', () => {
    expect(getScoreGrade(50, 100)).toBe('E');
    expect(getScoreGrade(0, 100)).toBe('E');
  });

  it('should return E for maxScore 0', () => {
    expect(getScoreGrade(0, 0)).toBe('E');
  });

  it('should return A for perfect score', () => {
    expect(getScoreGrade(100, 100)).toBe('A');
  });
});

// ============================================================================
// calculateScoreStatistics
// ============================================================================

describe('calculateScoreStatistics', () => {
  it('should return all zeros for empty array', () => {
    const result = calculateScoreStatistics([]);
    expect(result).toEqual({ average: 0, min: 0, max: 0, median: 0, total: 0 });
  });

  it('should calculate stats for single value', () => {
    const result = calculateScoreStatistics([75]);
    expect(result).toEqual({ average: 75, min: 75, max: 75, median: 75, total: 1 });
  });

  it('should calculate correct stats for multiple values', () => {
    const result = calculateScoreStatistics([60, 80, 90, 70]);
    expect(result.average).toBe(75); // (60+80+90+70)/4 = 75
    expect(result.min).toBe(60);
    expect(result.max).toBe(90);
    expect(result.total).toBe(4);
  });

  it('should calculate median for odd count', () => {
    const result = calculateScoreStatistics([10, 20, 30]);
    // sorted: [10, 20, 30], floor(3/2)=1 → median = 20
    expect(result.median).toBe(20);
  });

  it('should calculate median for even count', () => {
    const result = calculateScoreStatistics([10, 20, 30, 40]);
    // sorted: [10, 20, 30, 40], floor(4/2)=2 → median = 30
    expect(result.median).toBe(30);
  });

  it('should round average correctly', () => {
    const result = calculateScoreStatistics([33, 33, 34]);
    // (33+33+34)/3 = 33.33... → Math.round → 33
    expect(result.average).toBe(33);
  });
});
