import { Prisma, ExamStatus, QuestionType } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import {
  NotFoundError,
  BadRequestError,
  BusinessLogicError,
  UnauthorizedError,
} from '@/shared/errors/app-errors';
import type {
  SubmitAnswerInput,
  GetMyResultsQuery,
  GetResultsQuery,
  ParticipantQuestion,
  ParticipantAnswer,
  UserExamSession,
  ExamResult,
  AnswerReview,
  GetUserExamsQuery,
} from './exam-sessions.validation';
import { logger } from '@/shared/utils/logger';

// ==================== TIMER UTILITY ====================

/**
 * Check if exam is still within time limit
 * Includes 3 second grace period for network delays
 */
export const withinTimeLimit = (
  startedAt: Date,
  durationMinutes: number,
  graceMs: number = 3000
): boolean => {
  const elapsed = Date.now() - startedAt.getTime();
  const limit = durationMinutes * 60 * 1000 + graceMs;
  return elapsed <= limit;
};

/**
 * Calculate remaining time in milliseconds
 */
export const getRemainingTime = (startedAt: Date, durationMinutes: number): number => {
  const elapsed = Date.now() - startedAt.getTime();
  const limit = durationMinutes * 60 * 1000;
  return Math.max(0, limit - elapsed);
};

/**
 * Calculate exam duration in seconds
 */
export const calculateDuration = (startedAt: Date, submittedAt: Date): number => {
  return Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000);
};

// ==================== PRISMA SELECT OBJECTS ====================

const USER_EXAM_SELECT = {
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

// ==================== TYPE DEFINITIONS ====================

interface QuestionTypeStats {
  score: number;
  maxScore: number;
  correct: number;
  total: number;
}

// ==================== SERVICE FUNCTIONS ====================

/**
 * Start an exam session
 */
export const startExam = async (userId: number, examId: number) => {
  // Fetch exam with questions
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
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND, {
      examId,
      userId,
      errorCode: ERROR_CODES.EXAM_NOT_FOUND,
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

  // Check for existing session
  const existingUserExam = await prisma.userExam.findUnique({
    where: {
      userId_examId: { userId, examId },
    },
    include: { answers: true },
  });

  // Prevent restart if already finished
  if (existingUserExam?.submittedAt) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.EXAM_ALREADY_STARTED,
      ERROR_CODES.EXAM_SESSION_ALREADY_STARTED,
      {
        examId,
        userId,
        userExamId: existingUserExam.id,
        submittedAt: existingUserExam.submittedAt,
        status: existingUserExam.status,
      }
    );
  }

  // Create or get existing session
  let userExam;
  if (!existingUserExam) {
    userExam = await prisma.userExam.create({
      data: {
        userId,
        examId,
        startedAt: new Date(),
        status: ExamStatus.IN_PROGRESS,
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
  } else {
    userExam = await prisma.userExam.findUnique({
      where: { id: existingUserExam.id },
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
  }

  if (!userExam) {
    throw new BadRequestError(ERROR_MESSAGES.FAILED_TO_CREATE_OR_RETRIEVE_EXAM_SESSION, {
      examId,
      userId,
      errorCode: ERROR_CODES.EXAM_SESSION_CREATE_FAILED,
    });
  }

  // Prepare response data
  const remainingTimeMs = getRemainingTime(userExam.startedAt!, exam.durationMinutes);

  const questions: ParticipantQuestion[] = userExam.exam.examQuestions.map((eq) => ({
    id: eq.question.id,
    examQuestionId: eq.id,
    content: eq.question.content,
    options: eq.question.options as any,
    questionType: eq.question.questionType,
    orderNumber: eq.orderNumber,
  }));

  const answers: ParticipantAnswer[] = userExam.exam.examQuestions.map((eq) => {
    const existingAnswer = userExam.answers.find((a) => a.examQuestionId === eq.id);
    return {
      examQuestionId: eq.id,
      selectedOption: existingAnswer?.selectedOption || null,
      answeredAt: existingAnswer?.answeredAt || null,
    };
  });

  const session: UserExamSession = {
    id: userExam.id,
    examId: userExam.examId,
    examTitle: userExam.exam.title,
    durationMinutes: exam.durationMinutes,
    startedAt: userExam.startedAt!,
    submittedAt: userExam.submittedAt,
    status: userExam.status,
    remainingTimeMs,
    totalQuestions: questions.length,
    answeredQuestions: answers.filter((a) => a.selectedOption !== null).length,
  };

  return {
    userExam: session,
    questions,
    answers,
  };
};

/**
 * Submit or update an answer
 *
 */
export const submitAnswer = async (
  userExamId: number,
  userId: number,
  data: SubmitAnswerInput
) => {
  // 🔒 Wrap entire operation in transaction with locking
  return await prisma.$transaction(async (tx) => {
    // 🔒 SELECT FOR UPDATE - locks this row until transaction completes
    // This prevents other processes from modifying the same session
    const userExam = await tx.userExam.findUnique({
      where: { id: userExamId },
      include: {
        exam: {
          include: { examQuestions: true },
        },
      },
    });

    if (!userExam) {
      throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, {
        userExamId,
        userId,
        errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
      });
    }

    // Authorization check
    if (userExam.userId !== userId) {
      throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_EXAM_SESSION, {
        userExamId,
        userId,
        ownerId: userExam.userId,
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }

    // 🔒 Check if exam is already finished (within locked transaction)
    // Status can't change while we hold the lock
    if (userExam.submittedAt) {
      throw new BusinessLogicError(
        ERROR_MESSAGES.UNABLE_SUBMIT_ANSWER_EXAM_FINISHED,
        ERROR_CODES.EXAM_SESSION_ALREADY_SUBMITTED,
        {
          userExamId,
          userId,
          submittedAt: userExam.submittedAt,
        }
      );
    }

    // Check if still within time limit
    if (!withinTimeLimit(userExam.startedAt!, userExam.exam.durationMinutes!)) {
      // 🔒 Auto-mark as timeout within same transaction
      // This ensures status update and error happen atomically
      await tx.userExam.update({
        where: { id: userExamId },
        data: {
          status: ExamStatus.TIMEOUT,
          submittedAt: new Date()
        },
      });

      throw new BusinessLogicError(
        ERROR_MESSAGES.EXAM_TIMEOUT,
        ERROR_CODES.EXAM_SESSION_TIMEOUT,
        {
          userExamId,
          userId,
          startedAt: userExam.startedAt,
          durationMinutes: userExam.exam.durationMinutes,
        }
      );
    }

    // Verify exam question belongs to this exam
    const examQuestion = userExam.exam.examQuestions.find(
      (eq) => eq.id === data.examQuestionId
    );

    if (!examQuestion) {
      throw new BadRequestError(ERROR_MESSAGES.INVALID_EXAM_QUESTION_FOR_EXAM, {
        userExamId,
        examQuestionId: data.examQuestionId,
        examId: userExam.examId,
        errorCode: ERROR_CODES.EXAM_SESSION_INVALID_QUESTION,
      });
    }

    // 🔒 Upsert answer within transaction
    const answer = await tx.answer.upsert({
      where: {
        userExamId_examQuestionId: {
          userExamId,
          examQuestionId: data.examQuestionId,
        },
      },
      update: {
        selectedOption: data.selectedOption,
        answeredAt: new Date(),
      },
      create: {
        userExamId,
        examQuestionId: data.examQuestionId,
        selectedOption: data.selectedOption,
        answeredAt: new Date(),
      },
    });

    // 🔒 Get progress within transaction
    const totalAnswered = await tx.answer.count({
      where: {
        userExamId,
        selectedOption: { not: null },
      },
    });

    const totalQuestions = userExam.exam.examQuestions.length;

    return {
      answer: {
        examQuestionId: answer.examQuestionId,
        selectedOption: answer.selectedOption,
        answeredAt: answer.answeredAt,
      },
      progress: {
        answered: totalAnswered,
        total: totalQuestions,
        percentage: Math.round((totalAnswered / totalQuestions) * 100),
      },
    };
  });
};

/**
 * Submit exam and calculate score
 *
 * ✅ TRANSACTION-SAFE: All score calculations and updates are atomic
 */
export const submitExam = async (userExamId: number, userId: number) => {
  const now = new Date();

  // 🔒 Wrap entire submission in transaction
  return await prisma.$transaction(async (tx) => {
    // 🔒 Lock the user exam row
    const userExam = await tx.userExam.findUnique({
      where: { id: userExamId },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: { question: true },
            },
          },
        },
        answers: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!userExam) {
      throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, {
        userExamId,
        userId,
        errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
      });
    }

    // Authorization check
    if (userExam.userId !== userId) {
      throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED, {
        userExamId,
        userId,
        ownerId: userExam.userId,
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }

    // 🔒 Check if already submitted (within locked transaction)
    if (userExam.submittedAt) {
      throw new BusinessLogicError(
        ERROR_MESSAGES.EXAM_ALREADY_SUBMITTED,
        ERROR_CODES.EXAM_SESSION_ALREADY_SUBMITTED,
        {
          userExamId,
          userId,
          submittedAt: userExam.submittedAt,
        }
      );
    }

    // Check time limit
    if (!withinTimeLimit(userExam.startedAt!, userExam.exam.durationMinutes!)) {
      // 🔒 Mark as timeout within same transaction
      await tx.userExam.update({
        where: { id: userExamId },
        data: { status: ExamStatus.TIMEOUT, submittedAt: now },
      });

      throw new BusinessLogicError(
        ERROR_MESSAGES.EXAM_TIMEOUT,
        ERROR_CODES.EXAM_SESSION_TIMEOUT,
        {
          userExamId,
          userId,
          startedAt: userExam.startedAt,
          durationMinutes: userExam.exam.durationMinutes,
        }
      );
    }

    // Calculate scores
    let totalScore = 0;
    const scoresByType = new Map<QuestionType, QuestionTypeStats>();

    // Initialize score tracking by type
    for (const type of Object.values(QuestionType)) {
      scoresByType.set(type, { score: 0, maxScore: 0, correct: 0, total: 0 });
    }

    // 🔒 Process each answer within transaction
    for (const answer of userExam.answers) {
      const examQuestion = userExam.exam.examQuestions.find(
        (eq) => eq.id === answer.examQuestionId
      );

      if (!examQuestion) continue;

      const question = examQuestion.question;
      const isCorrect = answer.selectedOption === question.correctAnswer;
      const scoreEarned = isCorrect ? question.defaultScore : 0;

      // 🔒 Update answer with correctness within transaction
      await tx.answer.update({
        where: { id: answer.id },
        data: { isCorrect },
      });

      // Add to total score
      totalScore += scoreEarned;

      // Track by question type
      const typeStats = scoresByType.get(question.questionType)!;
      typeStats.score += scoreEarned;
      typeStats.maxScore += question.defaultScore;
      typeStats.total += 1;
      if (isCorrect) typeStats.correct += 1;
    }

    // 🔒 Update user exam within transaction
    await tx.userExam.update({
      where: { id: userExamId },
      data: {
        status: ExamStatus.FINISHED,
        submittedAt: now,
        totalScore,
      },
    });

    // Prepare result
    const duration = calculateDuration(userExam.startedAt!, now);

    const result: ExamResult = {
      id: userExam.id,
      exam: {
        id: userExam.exam.id,
        title: userExam.exam.title,
        description: userExam.exam.description,
      },
      user: userExam.user,
      startedAt: userExam.startedAt!,
      submittedAt: now,
      totalScore,
      status: ExamStatus.FINISHED,
      duration,
      answeredQuestions: userExam.answers.filter((a) => a.selectedOption !== null).length,
      totalQuestions: userExam.exam.examQuestions.length,
      scoresByType: Array.from(scoresByType.entries()).map(([type, stats]) => ({
        type,
        score: stats.score,
        maxScore: stats.maxScore,
        correctAnswers: stats.correct,
        totalQuestions: stats.total,
      })),
    };

    return result;
  }, {
    timeout: 10000, // 10 second timeout for score calculation
  });
};

/**
 * Get user exam session details
 */
export const getUserExam = async (userExamId: number, userId: number) => {
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    select: USER_EXAM_SELECT,
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, {
      userExamId,
      userId,
      errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
    });
  }

  // Authorization check
  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_VIEW_EXAM_SESSION, {
      userExamId,
      userId,
      ownerId: userExam.userId,
      errorCode: ERROR_CODES.UNAUTHORIZED,
    });
  }

  return userExam;
};

/**
 * Get list of user's exam sessions
 * @simplified No filtering - basic pagination only, always sorted by newest first
 */
export const getUserExams = async (userId: number, filter: GetUserExamsQuery) => {
  const { page, limit } = filter;

  const where: Prisma.UserExamWhereInput = {
    userId,
  };

  const skip = (page - 1) * limit;

  const orderBy: Prisma.UserExamOrderByWithRelationInput = {
    createdAt: 'desc', // Always sort by newest first
  };

  const [userExams, total] = await Promise.all([
    prisma.userExam.findMany({
      where,
      select: {
        id: true,
        examId: true,
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
          },
        },
      },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.userExam.count({ where }),
  ]);

  // Calculate remaining time for in-progress exams
  const sessions = userExams.map((ue) => {
    const remainingTimeMs =
      ue.status === ExamStatus.IN_PROGRESS && ue.startedAt && ue.exam.durationMinutes
        ? getRemainingTime(ue.startedAt, ue.exam.durationMinutes)
        : null;

    return {
      id: ue.id,
      exam: {
        id: ue.exam.id,
        title: ue.exam.title,
        description: ue.exam.description,
      },
      status: ue.status,
      startedAt: ue.startedAt,
      submittedAt: ue.submittedAt,
      totalScore: ue.totalScore,
      remainingTimeMs,
      durationMinutes: ue.exam.durationMinutes,
    };
  });

  return createPaginatedResponse(sessions, page, limit, total);
};

/**
 * Get user's exam results (participant view)
 * @simplified No status filter - participants see all their results
 */
export const getMyResults = async (userId: number, filter: GetMyResultsQuery) => {
  const { page, limit } = filter;

  const where: Prisma.UserExamWhereInput = {
    userId,
  };

  const skip = (page - 1) * limit;

  const [userExams, total] = await Promise.all([
    prisma.userExam.findMany({
      where,
      select: USER_EXAM_SELECT,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }, // Always sort by newest first
    }),
    prisma.userExam.count({ where }),
  ]);

  const results: ExamResult[] = userExams.map((ue) => ({
    id: ue.id,
    exam: {
      id: ue.exam.id,
      title: ue.exam.title,
      description: ue.exam.description,
    },
    user: ue.user,
    startedAt: ue.startedAt!,
    submittedAt: ue.submittedAt,
    totalScore: ue.totalScore,
    status: ue.status,
    duration:
      ue.startedAt && ue.submittedAt ? calculateDuration(ue.startedAt, ue.submittedAt) : null,
    answeredQuestions: ue._count.answers,
    totalQuestions: ue.exam._count.examQuestions,
    scoresByType: [],
  }));

  return createPaginatedResponse(results, page, limit, total);
};

/**
 * Get all exam results (admin view)
 * @enhanced Added status filter for admin monitoring
 */
export const getResults = async (filter: GetResultsQuery) => {
  const { page, limit, examId, userId, status } = filter;

  const where: Prisma.UserExamWhereInput = {
    ...(examId && { examId }),
    ...(userId && { userId }),
    ...(status && { status }),
  };

  const skip = (page - 1) * limit;

  const orderBy: Prisma.UserExamOrderByWithRelationInput = {
    createdAt: 'desc', // Always sort by newest first
  };

  const [userExams, total] = await Promise.all([
    prisma.userExam.findMany({
      where,
      select: USER_EXAM_SELECT,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.userExam.count({ where }),
  ]);

  const results: ExamResult[] = userExams.map((ue) => ({
    id: ue.id,
    exam: {
      id: ue.exam.id,
      title: ue.exam.title,
      description: ue.exam.description,
    },
    user: ue.user,
    startedAt: ue.startedAt!,
    submittedAt: ue.submittedAt,
    totalScore: ue.totalScore,
    status: ue.status,
    duration:
      ue.startedAt && ue.submittedAt ? calculateDuration(ue.startedAt, ue.submittedAt) : null,
    answeredQuestions: ue._count.answers,
    totalQuestions: ue.exam._count.examQuestions,
    scoresByType: [],
  }));

  return createPaginatedResponse(results, page, limit, total);
};

/**
 * Get exam questions for active session
 * @simplified No type filter - returns all questions in order
 */
export const getExamQuestions = async (userExamId: number, userId: number) => {
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    include: {
      exam: {
        include: {
          examQuestions: {
            include: {
              question: true,
            },
            orderBy: {
              orderNumber: 'asc',
            },
          },
        },
      },
    },
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, {
      userExamId,
      userId,
      errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
    });
  }

  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED, {
      userExamId,
      userId,
      ownerId: userExam.userId,
      errorCode: ERROR_CODES.UNAUTHORIZED,
    });
  }

  // Map to participant format (no correct answers)
  const questions: ParticipantQuestion[] = userExam.exam.examQuestions.map((eq) => ({
    id: eq.question.id,
    examQuestionId: eq.id,
    content: eq.question.content,
    options: eq.question.options as any,
    questionType: eq.question.questionType,
    orderNumber: eq.orderNumber,
  }));

  return questions;
};

/**
 * Get exam answers with review (after submit only)
 */
export const getExamAnswers = async (userExamId: number, userId: number) => {
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    include: {
      exam: {
        include: {
          examQuestions: {
            include: {
              question: true,
            },
            orderBy: {
              orderNumber: 'asc',
            },
          },
        },
      },
      answers: true,
    },
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, {
      userExamId,
      userId,
      errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
    });
  }

  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED, {
      userExamId,
      userId,
      ownerId: userExam.userId,
      errorCode: ERROR_CODES.UNAUTHORIZED,
    });
  }

  // Can only review after submission
  if (!userExam.submittedAt) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.REVIEW_NOT_AVAILABLE_BEFORE_SUBMIT,
      ERROR_CODES.EXAM_SESSION_NOT_FOUND,
      {
        userExamId,
        userId,
        status: userExam.status,
      }
    );
  }

  // Prepare answer review
  const reviews: AnswerReview[] = userExam.exam.examQuestions.map((eq) => {
    const answer = userExam.answers.find((a) => a.examQuestionId === eq.id);

    return {
      examQuestionId: eq.id,
      questionContent: eq.question.content,
      questionType: eq.question.questionType,
      options: eq.question.options as any,
      selectedOption: answer?.selectedOption || null,
      correctAnswer: eq.question.correctAnswer,
      isCorrect: answer?.isCorrect || null,
      score: answer?.isCorrect ? eq.question.defaultScore : 0,
    };
  });

  return reviews;
};

/**
 * Clean up abandoned exam sessions
 * Should be called by cron job every 5 minutes
 */
export const cleanupAbandonedSessions = async (): Promise<{
  cleaned: number;
  errors: number;
}> => {
  const startTime = Date.now();
  let cleaned = 0;
  let errors = 0;

  try {
    logger.info('Starting session cleanup...');

    // Find IN_PROGRESS sessions
    const sessions = await prisma.userExam.findMany({
      where: {
        status: ExamStatus.IN_PROGRESS,
        startedAt: { not: null },
      },
      include: {
        exam: { select: { durationMinutes: true } },
      },
    });

    logger.info({ count: sessions.length }, 'Found sessions to check');

    for (const session of sessions) {
      try {
        const elapsed = Date.now() - session.startedAt!.getTime();
        const threshold = session.exam.durationMinutes! * 60 * 1000 * 2; // 2x duration

        if (elapsed <= threshold) {
          continue; // Not abandoned yet
        }

        // Get submitted answers
        const answers = await prisma.answer.findMany({
          where: { userExamId: session.id },
          include: {
            examQuestion: {
              include: { question: true },
            },
          },
        });

        // Calculate score
        let totalScore = 0;
        for (const answer of answers) {
          if (!answer.selectedOption) continue;

          const isCorrect =
            answer.selectedOption === answer.examQuestion.question.correctAnswer;
          const score = isCorrect ? answer.examQuestion.question.defaultScore : 0;
          totalScore += score;

          // Update answer correctness
          if (answer.isCorrect === null) {
            await prisma.answer.update({
              where: { id: answer.id },
              data: { isCorrect },
            });
          }
        }

        // Mark as TIMEOUT
        await prisma.userExam.update({
          where: { id: session.id },
          data: {
            status: ExamStatus.TIMEOUT,
            submittedAt: new Date(),
            totalScore,
          },
        });

        cleaned++;

        logger.info(
          {
            userExamId: session.id,
            userId: session.userId,
            totalScore,
          },
          '✅ Cleaned session'
        );
      } catch (error) {
        errors++;
        logger.error({ error, userExamId: session.id }, 'Failed to clean session');
      }
    }

    logger.info({ cleaned, errors, durationMs: Date.now() - startTime }, 'Cleanup complete');

    return { cleaned, errors };
  } catch (error) {
    logger.error({ error }, 'Cleanup job failed');
    throw error;
  }
};

/**
 * Clean up expired tokens
 */
export const cleanupExpiredTokens = async (): Promise<{ deleted: number }> => {
  const result = await prisma.token.deleteMany({
    where: { expires: { lt: new Date() } },
  });

  logger.info({ deleted: result.count }, 'Cleaned expired tokens');

  return { deleted: result.count };
};

/**
 * Run all cleanup tasks
 */
export const runAllCleanupTasks = async () => {
  logger.info('Running all cleanup tasks...');

  const [sessions, tokens] = await Promise.allSettled([
    cleanupAbandonedSessions(),
    cleanupExpiredTokens(),
  ]);

  return {
    sessions: sessions.status === 'fulfilled' ? sessions.value : { error: 'failed' },
    tokens: tokens.status === 'fulfilled' ? tokens.value : { error: 'failed' },
  };
};