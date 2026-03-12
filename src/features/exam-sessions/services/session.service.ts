/**
 * Session Service — Exam session lifecycle management
 *
 * Handles starting exams, resuming sessions, and retrieving session data.
 *
 * Functions:
 * - startExam: Start new or resume existing exam session
 * - getUserExams: Get user's exam sessions (paginated)
 * - getUserExam: Get single exam session details
 *
 * @module exam-sessions/services/session.service
 */

import { Prisma, ExamStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import {
  NotFoundError,
  BadRequestError,
  BusinessLogicError,
  ConflictError,
  UnauthorizedError,
} from '@/shared/errors/app-errors';
import { logger } from '@/shared/utils/logger';

import {
  getRemainingTime,
  buildSessionResponse,
} from '../exam-sessions.helpers';

import { calculateScore } from '../exam-sessions.score';

import { checkExamAccess } from '@/features/transactions/transactions.service';

import type {
  GetUserExamsQuery,
  UserExamListItem,
  AnswerWithQuestion,
} from '../exam-sessions.validation';

// ==================== PRISMA SELECT CONSTANTS ====================

/**
 * Select for user exam list items
 */
const USER_EXAM_LIST_SELECT = {
  id: true,
  examId: true,
  userId: true,
  startedAt: true,
  submittedAt: true,
  totalScore: true,
  status: true,
  attemptNumber: true,
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
  _count: {
    select: {
      answers: true,
    },
  },
} as const;

/**
 * Select for user exam details
 */
const USER_EXAM_DETAIL_SELECT = {
  id: true,
  examId: true,
  userId: true,
  startedAt: true,
  submittedAt: true,
  totalScore: true,
  status: true,
  exam: {
    select: {
      id: true,
      title: true,
      description: true,
      durationMinutes: true,
      passingScore: true,
      allowRetake: true,
      maxAttempts: true,
      examQuestions: {
        select: {
          id: true,
          orderNumber: true,
          question: {
            select: {
              id: true,
              content: true,
              questionType: true,
              defaultScore: true,
            },
          },
        },
        orderBy: {
          orderNumber: 'asc' as const,
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

// ==================== SERVICE FUNCTIONS ====================

/**
 * Start exam or continue existing session
 *
 * Flow:
 * 1. Validate exam exists & has questions
 * 2. Check for IN_PROGRESS session (allow resume)
 * 3. If no IN_PROGRESS session, check previous attempts and retake rules
 * 4. Create new attempt or throw error if not allowed
 * 5. Return questions + existing answers
 */
export const startExam = async (userId: number, examId: number) => {
  // Fetch exam with questions and retake settings
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      examQuestions: {
        include: { question: true },
        orderBy: { orderNumber: 'asc' },
      },
    },
  });

  if (!exam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND, ERROR_CODES.EXAM_NOT_FOUND, {
      examId,
      userId,
    });
  }

  // Validate exam setup
  if (exam.examQuestions.length === 0) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.EXAM_HAS_NO_QUESTIONS,
      ERROR_CODES.EXAM_NO_QUESTIONS,
      { examId, userId }
    );
  }

  if (!exam.durationMinutes) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.EXAM_HAS_NO_DURATION_SET,
      ERROR_CODES.EXAM_NO_DURATION,
      { examId, userId }
    );
  }

  // Check exam access (payment required for paid exams)
  const accessCheck = await checkExamAccess(userId, examId);
  if (!accessCheck.hasAccess) {
    if (accessCheck.reason === 'pending') {
      throw new BusinessLogicError(
        'Payment is pending. Please complete payment to access this exam.',
        'PAYMENT_PENDING',
        {
          examId,
          userId,
          transactionId: accessCheck.transaction?.id,
          snapRedirectUrl: accessCheck.transaction?.snapRedirectUrl,
        }
      );
    }
    throw new BusinessLogicError(
      'Payment required to access this exam.',
      'PAYMENT_REQUIRED',
      {
        examId,
        userId,
        price: accessCheck.exam.price,
      }
    );
  }

  // Check for IN_PROGRESS session (allow resume)
  const inProgressSession = await prisma.userExam.findFirst({
    where: {
      userId,
      examId,
      status: ExamStatus.IN_PROGRESS,
    },
    include: { answers: true },
  });

  // Resume existing IN_PROGRESS session
  if (inProgressSession) {
    const userExam = await prisma.userExam.findUnique({
      where: { id: inProgressSession.id },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: { question: true },
              orderBy: { orderNumber: 'asc' },
            },
          },
        },
        answers: true,
      },
    });

    logger.info(
      { userId, examId, userExamId: inProgressSession.id, attemptNumber: inProgressSession.attemptNumber },
      'Resuming existing exam session'
    );

    if (!userExam) {
      throw new BadRequestError(ERROR_MESSAGES.FAILED_TO_CREATE_OR_RETRIEVE_EXAM_SESSION, ERROR_CODES.EXAM_SESSION_CREATE_FAILED, {
        examId,
        userId,
      });
    }

    // Build and return standardized session response
    return buildSessionResponse(userExam, exam.durationMinutes, inProgressSession.attemptNumber);
  }

  // No IN_PROGRESS session - check previous attempts
  const previousAttempts = await prisma.userExam.findMany({
    where: {
      userId,
      examId,
      status: { in: [ExamStatus.FINISHED, ExamStatus.TIMEOUT, ExamStatus.CANCELLED] },
    },
    orderBy: { attemptNumber: 'desc' },
    take: 1,
  });

  let newAttemptNumber = 1;

  // If there are previous attempts, validate retake rules
  if (previousAttempts.length > 0) {
    const lastAttempt = previousAttempts[0];
    newAttemptNumber = lastAttempt.attemptNumber + 1;

    // Check if retakes are allowed
    if (!exam.allowRetake) {
      throw new BusinessLogicError(
        ERROR_MESSAGES.EXAM_RETAKE_DISABLED,
        ERROR_CODES.EXAM_SESSION_RETAKE_DISABLED,
        {
          examId,
          userId,
          previousAttempts: lastAttempt.attemptNumber,
          message: 'This exam does not allow retakes',
        }
      );
    }

    // Check max attempts limit
    if (exam.maxAttempts && lastAttempt.attemptNumber >= exam.maxAttempts) {
      throw new BusinessLogicError(
        ERROR_MESSAGES.EXAM_MAX_ATTEMPTS_REACHED,
        ERROR_CODES.EXAM_SESSION_MAX_ATTEMPTS,
        {
          examId,
          userId,
          maxAttempts: exam.maxAttempts,
          currentAttempts: lastAttempt.attemptNumber,
          message: `Maximum ${exam.maxAttempts} attempts allowed`,
        }
      );
    }

  }

  // Create new attempt — wrapped in try-catch to handle race condition
  // The partial unique index "user_exams_active_session_unique" ensures only
  // one IN_PROGRESS session per user+exam at the database level.
  // startedAt is omitted — filled by DB DEFAULT NOW() for time authority.
  let userExam;
  try {
    userExam = await prisma.userExam.create({
      data: {
        userId,
        examId,
        attemptNumber: newAttemptNumber,
        status: ExamStatus.IN_PROGRESS,
        transactionId: accessCheck.transaction?.orderId ?? null,
      },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: { question: true },
              orderBy: { orderNumber: 'asc' },
            },
          },
        },
        answers: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictError(
        ERROR_MESSAGES.EXAM_SESSION_ACTIVE_EXISTS,
        ERROR_CODES.EXAM_SESSION_ACTIVE_CONFLICT,
        { examId, userId }
      );
    }
    throw error;
  }

  logger.info(
    { userId, examId, userExamId: userExam.id, attemptNumber: newAttemptNumber },
    'New exam session created'
  );

  // Build and return standardized session response
  return buildSessionResponse(userExam, exam.durationMinutes, newAttemptNumber);
};

/**
 * Get user's exam sessions with pagination
 */
export const getUserExams = async (userId: number, query: GetUserExamsQuery) => {
  const { page, limit, status, examId } = query;

  const where: Prisma.UserExamWhereInput = {
    userId,
    ...(status && { status }),
    ...(examId && { examId }),
  };

  const skip = (page - 1) * limit;

  const [userExams, total] = await Promise.all([
    prisma.userExam.findMany({
      where,
      select: USER_EXAM_LIST_SELECT,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.userExam.count({ where }),
  ]);

  // Map to response format with remaining time
  const data: UserExamListItem[] = userExams.map((ue) => ({
    id: ue.id,
    examId: ue.examId,
    attemptNumber: ue.attemptNumber,
    exam: {
      id: ue.exam.id,
      title: ue.exam.title,
      description: ue.exam.description,
    },
    status: ue.status,
    startedAt: ue.startedAt,
    submittedAt: ue.submittedAt,
    totalScore: ue.totalScore,
    remainingTimeMs:
      ue.startedAt && !ue.submittedAt && ue.exam.durationMinutes
        ? getRemainingTime(ue.startedAt, ue.exam.durationMinutes)
        : null,
    durationMinutes: ue.exam.durationMinutes,
    answeredQuestions: ue._count.answers,
    totalQuestions: (ue.exam as { _count?: { examQuestions?: number } })._count?.examQuestions ?? 0,
  }));

  return createPaginatedResponse(data, page, limit, total);
};

/**
 * Get user exam session details
 *
 * ✅ FIX: Now returns remainingTimeMs and durationMinutes at root level
 * (consistent with getUserExams list response)
 */
export const getUserExam = async (userExamId: number, userId: number) => {
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    select: USER_EXAM_DETAIL_SELECT,
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, ERROR_CODES.EXAM_SESSION_NOT_FOUND, {
      userExamId,
      userId,
    });
  }

  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_VIEW_EXAM_SESSION, ERROR_CODES.EXAM_SESSION_UNAUTHORIZED, {
      userExamId,
      userId,
      ownerId: userExam.userId,
    });
  }

  // ✅ FIX: Calculate remainingTimeMs and add durationMinutes at root level
  // This ensures timer works correctly even when accessing via direct URL
  const durationMinutes = userExam.exam.durationMinutes;
  const remainingTimeMs =
    userExam.startedAt && !userExam.submittedAt && durationMinutes
      ? getRemainingTime(userExam.startedAt, durationMinutes)
      : null;

  // ✅ Calculate scoresByType for completed sessions
  // Reuses calculateScore() from exam-sessions.score.ts (same logic as submit)
  let scoresByType: Array<{
    type: string;
    score: number;
    maxScore: number;
    correctAnswers: number;
    totalQuestions: number;
    passingGrade: number;
    isPassing: boolean;
  }> = [];

  if (userExam.status === ExamStatus.FINISHED || userExam.status === ExamStatus.TIMEOUT) {
    const answers = await prisma.answer.findMany({
      where: { userExamId: userExam.id },
      include: {
        examQuestion: {
          include: {
            question: {
              select: {
                questionType: true,
                correctAnswer: true,
                defaultScore: true,
                optionScores: true,
              },
            },
          },
        },
      },
    });

    const scoreResult = calculateScore(answers as unknown as AnswerWithQuestion[]);
    scoresByType = scoreResult.scoresByType;
  }

  return {
    ...userExam,
    durationMinutes,
    remainingTimeMs,
    scoresByType,
  };
};
