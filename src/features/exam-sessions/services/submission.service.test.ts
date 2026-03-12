/**
 * Submission Service Tests
 *
 * Tests for submitExam: validation, scoring, edge cases, response format.
 * ~22 test cases covering the full transaction-based exam submission flow.
 *
 * @module exam-sessions/services/submission.service.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExamStatus, QuestionType } from '@prisma/client';

// ==================== HOISTED MOCKS ====================

const mockTx = vi.hoisted(() => ({
  userExam: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

const mockPrismaTransaction = vi.hoisted(() => vi.fn());
const mockCalculateScore = vi.hoisted(() => vi.fn());
const mockUpdateAnswerCorrectness = vi.hoisted(() => vi.fn());
const mockWithinTimeLimit = vi.hoisted(() => vi.fn());
const mockCalculateDuration = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

// ==================== MODULE MOCKS ====================

vi.mock('@/config/database', () => ({
  prisma: {
    $transaction: mockPrismaTransaction.mockImplementation(async (cb: any, _opts?: any) => cb(mockTx)),
  },
}));

vi.mock('@/shared/utils/logger', () => ({
  logger: mockLogger,
}));

vi.mock('@/shared/errors/app-errors', () => {
  class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly errorCode?: string;
    public readonly context?: Record<string, any>;
    constructor(message: string, statusCode = 500, errorCode?: string, context?: Record<string, any>) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true;
      this.errorCode = errorCode;
      this.context = context;
    }
  }
  class NotFoundError extends AppError {
    constructor(message = 'Not found', errorCode?: string, context?: Record<string, any>) {
      super(message, 404, errorCode, context);
    }
  }
  class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', errorCode?: string, context?: Record<string, any>) {
      super(message, 401, errorCode, context);
    }
  }
  class BusinessLogicError extends AppError {
    constructor(message: string, errorCode?: string, context?: Record<string, any>) {
      super(message, 400, errorCode, context);
    }
  }
  return { AppError, NotFoundError, UnauthorizedError, BusinessLogicError };
});

vi.mock('../exam-sessions.score', () => ({
  calculateScore: mockCalculateScore,
  updateAnswerCorrectness: mockUpdateAnswerCorrectness,
}));

vi.mock('../exam-sessions.helpers', () => ({
  withinTimeLimit: mockWithinTimeLimit,
  calculateDuration: mockCalculateDuration,
}));

vi.mock('@/config/constants', () => ({
  ERROR_MESSAGES: {
    EXAM_SESSION_NOT_FOUND: 'Exam session not found',
    UNAUTHORIZED: 'Unauthorized',
    EXAM_ALREADY_SUBMITTED: 'Exam already submitted',
    EXAM_TIMEOUT: 'Exam time limit exceeded',
  },
  ERROR_CODES: {
    EXAM_SESSION_NOT_FOUND: 'EXAM_SESSION_001',
    UNAUTHORIZED: 'UNAUTHORIZED_001',
    EXAM_SESSION_ALREADY_SUBMITTED: 'EXAM_SESSION_004',
    EXAM_SESSION_TIMEOUT: 'EXAM_SESSION_003',
  },
}));

// ==================== IMPORT SUT ====================

import { submitExam } from './submission.service';

// ==================== TEST HELPERS ====================

const NOW = new Date('2025-06-15T10:30:00Z');

const makeUserExam = (overrides: Record<string, any> = {}) => ({
  id: 1,
  userId: 100,
  examId: 10,
  attemptNumber: 1,
  status: ExamStatus.IN_PROGRESS,
  startedAt: new Date('2025-06-15T10:00:00Z'),
  submittedAt: null,
  totalScore: null,
  exam: {
    id: 10,
    title: 'CPNS Tryout 2025',
    description: 'Simulasi CPNS',
    passingScore: 311,
    durationMinutes: 100,
    examQuestions: [
      {
        id: 101,
        orderNumber: 1,
        question: {
          id: 201,
          questionType: QuestionType.TWK,
          correctAnswer: 'A',
          defaultScore: 5,
          optionScores: null,
        },
      },
      {
        id: 102,
        orderNumber: 2,
        question: {
          id: 202,
          questionType: QuestionType.TIU,
          correctAnswer: 'B',
          defaultScore: 5,
          optionScores: null,
        },
      },
    ],
  },
  answers: [
    { id: 301, examQuestionId: 101, selectedOption: 'A', answeredAt: new Date() },
    { id: 302, examQuestionId: 102, selectedOption: 'C', answeredAt: new Date() },
  ],
  user: { id: 100, name: 'Test User', email: 'test@example.com' },
  ...overrides,
});

// ==================== TESTS ====================

describe('submitExam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    // Default happy-path mocks
    mockWithinTimeLimit.mockReturnValue(true);
    mockCalculateDuration.mockReturnValue(1800); // 30 minutes
    mockCalculateScore.mockReturnValue({
      totalScore: 10,
      scoresByType: [
        {
          type: QuestionType.TWK,
          score: 5,
          maxScore: 5,
          correctAnswers: 1,
          totalQuestions: 1,
          passingGrade: 65,
          isPassing: false,
        },
        {
          type: QuestionType.TIU,
          score: 5,
          maxScore: 5,
          correctAnswers: 1,
          totalQuestions: 1,
          passingGrade: 80,
          isPassing: false,
        },
      ],
    });
    mockUpdateAnswerCorrectness.mockResolvedValue(undefined);
    mockTx.userExam.findUnique.mockResolvedValue(makeUserExam());
    mockTx.userExam.update.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==================== VALIDATION ====================

  describe('validation', () => {
    it('should throw NotFoundError when session does not exist', async () => {
      mockTx.userExam.findUnique.mockResolvedValue(null);

      await expect(submitExam(999, 100)).rejects.toThrow('Exam session not found');
      await expect(submitExam(999, 100)).rejects.toMatchObject({
        statusCode: 404,
        errorCode: 'EXAM_SESSION_001',
      });
    });

    it('should throw UnauthorizedError when userId does not match owner', async () => {
      mockTx.userExam.findUnique.mockResolvedValue(makeUserExam({ userId: 200 }));

      await expect(submitExam(1, 100)).rejects.toThrow('Unauthorized');
      await expect(submitExam(1, 100)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('should throw BusinessLogicError when exam already submitted', async () => {
      mockTx.userExam.findUnique.mockResolvedValue(
        makeUserExam({ submittedAt: new Date('2025-06-15T10:20:00Z') })
      );

      await expect(submitExam(1, 100)).rejects.toThrow('Exam already submitted');
      await expect(submitExam(1, 100)).rejects.toMatchObject({
        statusCode: 400,
        errorCode: 'EXAM_SESSION_004',
      });
    });

    it('should update status to TIMEOUT and throw when time limit exceeded', async () => {
      mockWithinTimeLimit.mockReturnValue(false);

      await expect(submitExam(1, 100)).rejects.toThrow('Exam time limit exceeded');

      // Verify TIMEOUT update was called BEFORE the throw
      expect(mockTx.userExam.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: ExamStatus.TIMEOUT,
          submittedAt: NOW,
        },
      });
    });

    it('should call withinTimeLimit with startedAt and durationMinutes', async () => {
      const userExam = makeUserExam();
      mockTx.userExam.findUnique.mockResolvedValue(userExam);

      await submitExam(1, 100);

      expect(mockWithinTimeLimit).toHaveBeenCalledWith(
        userExam.startedAt,
        userExam.exam.durationMinutes
      );
    });

    it('should pass transaction options with timeout 10000', async () => {
      await submitExam(1, 100);

      expect(mockPrismaTransaction).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 10000 }
      );
    });
  });

  // ==================== SCORING ====================

  describe('scoring', () => {
    it('should call calculateScore with mapped AnswerWithQuestion array', async () => {
      await submitExam(1, 100);

      expect(mockCalculateScore).toHaveBeenCalledWith([
        {
          id: 301,
          selectedOption: 'A',
          examQuestionId: 101,
          examQuestion: {
            question: {
              questionType: QuestionType.TWK,
              correctAnswer: 'A',
              defaultScore: 5,
            },
          },
        },
        {
          id: 302,
          selectedOption: 'C',
          examQuestionId: 102,
          examQuestion: {
            question: {
              questionType: QuestionType.TIU,
              correctAnswer: 'B',
              defaultScore: 5,
            },
          },
        },
      ]);
    });

    it('should call updateAnswerCorrectness with tx and mapped answers', async () => {
      await submitExam(1, 100);

      expect(mockUpdateAnswerCorrectness).toHaveBeenCalledWith(
        mockTx,
        expect.arrayContaining([
          expect.objectContaining({ id: 301, selectedOption: 'A' }),
          expect.objectContaining({ id: 302, selectedOption: 'C' }),
        ])
      );
    });

    it('should update userExam to FINISHED with totalScore', async () => {
      mockCalculateScore.mockReturnValue({
        totalScore: 250,
        scoresByType: [],
      });

      await submitExam(1, 100);

      expect(mockTx.userExam.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: ExamStatus.FINISHED,
          submittedAt: NOW,
          totalScore: 250,
        },
      });
    });

    it('should set submittedAt to current time', async () => {
      await submitExam(1, 100);

      expect(mockTx.userExam.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submittedAt: NOW,
          }),
        })
      );
    });
  });

  // ==================== EDGE CASES ====================

  describe('edge cases', () => {
    it('should warn and skip answers with missing examQuestion', async () => {
      const userExam = makeUserExam({
        answers: [
          { id: 301, examQuestionId: 101, selectedOption: 'A', answeredAt: new Date() },
          { id: 303, examQuestionId: 999, selectedOption: 'B', answeredAt: new Date() }, // orphan
        ],
      });
      mockTx.userExam.findUnique.mockResolvedValue(userExam);

      await submitExam(1, 100);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        { answerId: 303, examQuestionId: 999 },
        'Answer references missing exam question'
      );
      // Only 1 answer mapped (the valid one)
      expect(mockCalculateScore).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 301 }),
        ])
      );
      const calledWith = mockCalculateScore.mock.calls[0][0];
      expect(calledWith).toHaveLength(1);
    });

    it('should handle empty answers array gracefully', async () => {
      mockTx.userExam.findUnique.mockResolvedValue(makeUserExam({ answers: [] }));
      mockCalculateScore.mockReturnValue({ totalScore: 0, scoresByType: [] });

      const result = await submitExam(1, 100);

      expect(mockCalculateScore).toHaveBeenCalledWith([]);
      expect(result.totalScore).toBe(0);
      expect(result.answeredQuestions).toBe(0);
    });

    it('should count answeredQuestions from non-null selectedOption', async () => {
      const userExam = makeUserExam({
        answers: [
          { id: 301, examQuestionId: 101, selectedOption: 'A', answeredAt: new Date() },
          { id: 302, examQuestionId: 102, selectedOption: null, answeredAt: null }, // unanswered
        ],
      });
      mockTx.userExam.findUnique.mockResolvedValue(userExam);

      const result = await submitExam(1, 100);

      expect(result.answeredQuestions).toBe(1);
      expect(result.totalQuestions).toBe(2);
    });
  });

  // ==================== RESPONSE FORMAT ====================

  describe('response format', () => {
    it('should return complete ExamResult object', async () => {
      const result = await submitExam(1, 100);

      expect(result).toMatchObject({
        id: 1,
        exam: {
          id: 10,
          title: 'CPNS Tryout 2025',
          description: 'Simulasi CPNS',
          passingScore: 311,
        },
        attemptNumber: 1,
        user: { id: 100, name: 'Test User', email: 'test@example.com' },
        startedAt: expect.any(Date),
        submittedAt: NOW,
        totalScore: 10,
        status: ExamStatus.FINISHED,
        duration: 1800,
        answeredQuestions: 2,
        totalQuestions: 2,
      });
    });

    it('should include scoresByType from calculateScore', async () => {
      const scoresByType = [
        {
          type: QuestionType.TWK,
          score: 5,
          maxScore: 5,
          correctAnswers: 1,
          totalQuestions: 1,
          passingGrade: 65,
          isPassing: false,
        },
      ];
      mockCalculateScore.mockReturnValue({ totalScore: 5, scoresByType });

      const result = await submitExam(1, 100);

      expect(result.scoresByType).toEqual(scoresByType);
    });

    it('should call calculateDuration with startedAt and now', async () => {
      await submitExam(1, 100);

      expect(mockCalculateDuration).toHaveBeenCalledWith(
        new Date('2025-06-15T10:00:00Z'),
        NOW
      );
    });

    it('should log successful submission', async () => {
      await submitExam(1, 100);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          userExamId: 1,
          userId: 100,
          examId: 10,
          totalScore: 10,
          duration: 1800,
        }),
        'Exam submitted successfully'
      );
    });

    it('should set status to FINISHED in result', async () => {
      const result = await submitExam(1, 100);

      expect(result.status).toBe(ExamStatus.FINISHED);
    });

    it('should return totalQuestions based on examQuestions length', async () => {
      const result = await submitExam(1, 100);

      expect(result.totalQuestions).toBe(2);
    });
  });
});
