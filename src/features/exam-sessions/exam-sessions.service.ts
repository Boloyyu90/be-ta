/**
 * Exam Sessions Service
 *
 * Complete service layer for exam session management with all CRUD operations.
 *
 * Business Rules:
 * - User can only have 1 active session per exam
 * - Cannot restart submitted exams
 * - Auto-timeout if exceeding duration + grace period
 * - Transaction-safe answer submission and exam finalization
 *
 * @module exam-sessions.service
 */

import { Prisma, ExamStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import {
  NotFoundError,
  BadRequestError,
  BusinessLogicError,
  UnauthorizedError,
} from '@/shared/errors/app-errors';
import { logger } from '@/shared/utils/logger';

// Import helpers
import {
  withinTimeLimit,
  getRemainingTime,
  calculateDuration,
  isAbandonedSession,
  calculateProgress,
} from './exam-sessions.helpers';

// Import scoring logic
import {
  calculateScore,
  updateAnswerCorrectness,
} from './exam-sessions.score';

// Import transaction service for exam access check
import { checkExamAccess } from '@/features/transactions/transactions.service';

// Import types from validation (single source of truth)
import type {
  SubmitAnswerInput,
  GetMyResultsQuery,
  GetResultsQuery,
  GetUserExamsQuery,
  ParticipantQuestion,
  ParticipantAnswer,
  UserExamSession,
  ExamResult,
  AnswerReview,
  CleanupResult,
  TokenCleanupResult,
  AnswerWithQuestion,
  UserExamListItem,
} from './exam-sessions.validation';

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

/**
 * Select for exam results
 */
const EXAM_RESULT_SELECT = {
  id: true,
  userId: true,
  examId: true,
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
      passingScore: true,
      examQuestions: {
        select: {
          id: true,
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
  answers: {
    select: {
      id: true,
      selectedOption: true,
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
      throw new BadRequestError(ERROR_MESSAGES.FAILED_TO_CREATE_OR_RETRIEVE_EXAM_SESSION, {
        examId,
        userId,
        errorCode: ERROR_CODES.EXAM_SESSION_CREATE_FAILED,
      });
    }

    // Prepare and return session response
    const remainingTimeMs = getRemainingTime(userExam.startedAt!, exam.durationMinutes);
    const questions: ParticipantQuestion[] = userExam.exam.examQuestions.map((eq) => ({
      id: eq.question.id,
      examQuestionId: eq.id,
      content: eq.question.content,
      options: eq.question.options as any,
      questionType: eq.question.questionType,
      orderNumber: eq.orderNumber,
    }));

    const answers: ParticipantAnswer[] = questions.map((q) => {
      const existingAnswer = userExam.answers.find((a) => a.examQuestionId === q.examQuestionId);
      return {
        examQuestionId: q.examQuestionId,
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
      attemptNumber: inProgressSession.attemptNumber,
    };

    return {
      userExam: session,
      questions,
      answers,
    };
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

  // Create new attempt
  const userExam = await prisma.userExam.create({
    data: {
      userId,
      examId,
      attemptNumber: newAttemptNumber,
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

  logger.info(
    { userId, examId, userExamId: userExam.id, attemptNumber: newAttemptNumber },
    'New exam session created'
  );

  if (!userExam) {
    throw new BadRequestError(ERROR_MESSAGES.FAILED_TO_CREATE_OR_RETRIEVE_EXAM_SESSION, {
      examId,
      userId,
      errorCode: ERROR_CODES.EXAM_SESSION_CREATE_FAILED,
    });
  }

  // Prepare response
  const remainingTimeMs = getRemainingTime(userExam.startedAt!, exam.durationMinutes);

  const questions: ParticipantQuestion[] = userExam.exam.examQuestions.map((eq) => ({
    id: eq.question.id,
    examQuestionId: eq.id,
    content: eq.question.content,
    options: eq.question.options as any,
    questionType: eq.question.questionType,
    orderNumber: eq.orderNumber,
  }));

  const answers: ParticipantAnswer[] = questions.map((q) => {
    const existingAnswer = userExam.answers.find((a) => a.examQuestionId === q.examQuestionId);
    return {
      examQuestionId: q.examQuestionId,
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
    attemptNumber: newAttemptNumber,
  };

  return {
    userExam: session,
    questions,
    answers,
  };
};

/**
 * Submit or update answer (auto-save)
 * Transaction-safe to prevent race conditions
 */
export const submitAnswer = async (
  userExamId: number,
  userId: number,
  data: SubmitAnswerInput
) => {
  return await prisma.$transaction(async (tx) => {
    const userExam = await tx.userExam.findUnique({
      where: { id: userExamId },
      include: {
        exam: { include: { examQuestions: true } },
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
      throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_EXAM_SESSION, {
        userExamId,
        userId,
        ownerId: userExam.userId,
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }

    if (userExam.submittedAt) {
      throw new BusinessLogicError(
        ERROR_MESSAGES.UNABLE_SUBMIT_ANSWER_EXAM_FINISHED,
        ERROR_CODES.EXAM_SESSION_ALREADY_SUBMITTED,
        { userExamId, userId, submittedAt: userExam.submittedAt }
      );
    }

    if (!withinTimeLimit(userExam.startedAt!, userExam.exam.durationMinutes!)) {
      await tx.userExam.update({
        where: { id: userExamId },
        data: {
          status: ExamStatus.TIMEOUT,
          submittedAt: new Date(),
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
        percentage: calculateProgress(totalAnswered, totalQuestions),
      },
    };
  });
};

/**
 * Submit exam and calculate score
 * Transaction-safe scoring and status update
 */
export const submitExam = async (userExamId: number, userId: number) => {
  const now = new Date();

  return await prisma.$transaction(
    async (tx) => {
      const userExam = await tx.userExam.findUnique({
        where: { id: userExamId },
        include: {
          exam: {
            include: {
              examQuestions: { include: { question: true } },
            },
          },
          answers: true,
          user: {
            select: { id: true, name: true, email: true },
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

      if (userExam.submittedAt) {
        throw new BusinessLogicError(
          ERROR_MESSAGES.EXAM_ALREADY_SUBMITTED,
          ERROR_CODES.EXAM_SESSION_ALREADY_SUBMITTED,
          { userExamId, userId, submittedAt: userExam.submittedAt }
        );
      }

      if (!withinTimeLimit(userExam.startedAt!, userExam.exam.durationMinutes!)) {
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

      // ✅ FIX: Safe mapping with validation
      const answersWithQuestions: AnswerWithQuestion[] = userExam.answers
        .map((answer) => {
          const examQuestion = userExam.exam.examQuestions.find(
            (eq) => eq.id === answer.examQuestionId
          );

          // Skip if exam question not found (data integrity issue)
          if (!examQuestion) {
            logger.warn(
              { answerId: answer.id, examQuestionId: answer.examQuestionId },
              'Answer references missing exam question'
            );
            return null;
          }

          // Map to AnswerWithQuestion structure
          return {
            id: answer.id,
            selectedOption: answer.selectedOption,
            examQuestionId: answer.examQuestionId,
            examQuestion: {
              question: {
                questionType: examQuestion.question.questionType,
                correctAnswer: examQuestion.question.correctAnswer,
                defaultScore: examQuestion.question.defaultScore,
              },
            },
          };
        })
        .filter((item): item is AnswerWithQuestion => item !== null);

      const { totalScore, scoresByType } = calculateScore(answersWithQuestions);

      await updateAnswerCorrectness(tx, answersWithQuestions);

      await tx.userExam.update({
        where: { id: userExamId },
        data: {
          status: ExamStatus.FINISHED,
          submittedAt: now,
          totalScore,
        },
      });

      logger.info(
        {
          userExamId,
          userId,
          examId: userExam.examId,
          totalScore,
          duration: calculateDuration(userExam.startedAt!, now),
        },
        'Exam submitted successfully'
      );

      const result: ExamResult = {
        id: userExam.id,
        exam: {
          id: userExam.exam.id,
          title: userExam.exam.title,
          description: userExam.exam.description,
          passingScore: userExam.exam.passingScore,
        },
        attemptNumber: userExam.attemptNumber,
        user: userExam.user,
        startedAt: userExam.startedAt!,
        submittedAt: now,
        totalScore,
        status: ExamStatus.FINISHED,
        duration: calculateDuration(userExam.startedAt!, now),
        answeredQuestions: userExam.answers.filter((a) => a.selectedOption !== null).length,
        totalQuestions: userExam.exam.examQuestions.length,
        scoresByType,
      };

      return result;
    },
    {
      timeout: 10000,
    }
  );
};

/**
 * Get user's exam sessions with pagination
 */
export const getUserExams = async (userId: number, query: GetUserExamsQuery) => {
  const { page, limit, status } = query;

  const where: Prisma.UserExamWhereInput = {
    userId,
    ...(status && { status }),
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
    totalQuestions: (ue.exam as any)._count?.examQuestions ?? 0,
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
    throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, {
      userExamId,
      userId,
      errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
    });
  }

  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_VIEW_EXAM_SESSION, {
      userExamId,
      userId,
      ownerId: userExam.userId,
      errorCode: ERROR_CODES.EXAM_SESSION_UNAUTHORIZED,
    });
  }

  // ✅ FIX: Calculate remainingTimeMs and add durationMinutes at root level
  // This ensures timer works correctly even when accessing via direct URL
  const durationMinutes = userExam.exam.durationMinutes;
  const remainingTimeMs =
    userExam.startedAt && !userExam.submittedAt && durationMinutes
      ? getRemainingTime(userExam.startedAt, durationMinutes)
      : null;

  return {
    ...userExam,
    durationMinutes,
    remainingTimeMs,
  };
};

/**
 * Get exam questions for active session
 */
export const getExamQuestions = async (userExamId: number, userId: number) => {
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    include: {
      exam: {
        include: {
          examQuestions: {
            include: { question: true },
            orderBy: { orderNumber: 'asc' },
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
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_EXAM_SESSION, {
      userExamId,
      userId,
      ownerId: userExam.userId,
      errorCode: ERROR_CODES.EXAM_SESSION_UNAUTHORIZED,
    });
  }

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
 * Get exam answers for review (after submission)
 */
export const getExamAnswers = async (userExamId: number, userId: number) => {
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
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

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, {
      userExamId,
      userId,
      errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
    });
  }

  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_EXAM_SESSION, {
      userExamId,
      userId,
      ownerId: userExam.userId,
      errorCode: ERROR_CODES.EXAM_SESSION_UNAUTHORIZED,
    });
  }

  if (!userExam.submittedAt) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.REVIEW_NOT_AVAILABLE_BEFORE_SUBMIT,
      ERROR_CODES.EXAM_SESSION_ALREADY_SUBMITTED,
      { userExamId, userId }
    );
  }

  const answers: AnswerReview[] = userExam.exam.examQuestions.map((eq) => {
    const answer = userExam.answers.find((a) => a.examQuestionId === eq.id);

    return {
      examQuestionId: eq.id,
      questionContent: eq.question.content,
      questionType: eq.question.questionType,
      options: eq.question.options as any,
      selectedOption: answer?.selectedOption || null,
      correctAnswer: eq.question.correctAnswer,
      isCorrect: answer?.isCorrect ?? null,
      score: answer?.isCorrect ? eq.question.defaultScore : 0,
    };
  });

  return answers;
};

/**
 * Get user's exam results (participant view)
 */
export const getMyResults = async (userId: number, query: GetMyResultsQuery) => {
  const { page, limit, status, examId } = query;

  const where: Prisma.UserExamWhereInput = {
    userId,
    ...(status
        ? { status }
        : { status: { not: ExamStatus.IN_PROGRESS } }
    ),
    ...(examId && { examId }),
  };

  const skip = (page - 1) * limit;

  const [userExams, total] = await Promise.all([
    prisma.userExam.findMany({
      where,
      select: EXAM_RESULT_SELECT,
      skip,
      take: limit,
      orderBy: {
        submittedAt: 'desc',
      },
    }),
    prisma.userExam.count({ where }),
  ]);

  const data: ExamResult[] = userExams.map((ue) => ({
    id: ue.id,
    exam: {
      id: ue.exam.id,
      title: ue.exam.title,
      description: ue.exam.description,
      passingScore: ue.exam.passingScore,
    },
    attemptNumber: ue.attemptNumber,
    user: ue.user,
    startedAt: ue.startedAt!,
    submittedAt: ue.submittedAt,
    totalScore: ue.totalScore,
    status: ue.status,
    duration: ue.startedAt && ue.submittedAt
      ? calculateDuration(ue.startedAt, ue.submittedAt)
      : null,
    answeredQuestions: ue.answers.filter((a) => a.selectedOption !== null).length,
    totalQuestions: ue.exam.examQuestions.length,
    scoresByType: [], // Can be populated if needed
  }));

  return createPaginatedResponse(data, page, limit, total);
};

/**
 * Get all exam results (admin view)
 */
export const getResults = async (query: GetResultsQuery) => {
  const { page, limit, examId, userId, status } = query;

  const where: Prisma.UserExamWhereInput = {
    ...(examId && { examId }),
    ...(userId && { userId }),
    ...(status && { status }),
  };

  const skip = (page - 1) * limit;

  const [userExams, total] = await Promise.all([
    prisma.userExam.findMany({
      where,
      select: EXAM_RESULT_SELECT,
      skip,
      take: limit,
      orderBy: {
        submittedAt: 'desc',
      },
    }),
    prisma.userExam.count({ where }),
  ]);

  const data: ExamResult[] = userExams.map((ue) => ({
    id: ue.id,
    exam: {
      id: ue.exam.id,
      title: ue.exam.title,
      description: ue.exam.description,
      passingScore: ue.exam.passingScore,
    },
    user: ue.user,
    startedAt: ue.startedAt!,
    submittedAt: ue.submittedAt,
    totalScore: ue.totalScore,
    status: ue.status,
    duration: ue.startedAt && ue.submittedAt
      ? calculateDuration(ue.startedAt, ue.submittedAt)
      : null,
    answeredQuestions: ue.answers.filter((a) => a.selectedOption !== null).length,
    totalQuestions: ue.exam.examQuestions.length,
    attemptNumber: ue.attemptNumber,
    scoresByType: [],
  }));

  return createPaginatedResponse(data, page, limit, total);
};

/**
 * Clean up abandoned exam sessions
 */
export const cleanupAbandonedSessions = async (): Promise<CleanupResult> => {
  const startTime = Date.now();
  let cleaned = 0;
  let errors = 0;

  try {
    logger.info('Starting cleanup of abandoned sessions...');

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
        if (!isAbandonedSession(session.startedAt!, session.exam.durationMinutes!)) {
          continue;
        }

        const answers = await prisma.answer.findMany({
          where: { userExamId: session.id },
          include: {
            examQuestion: { include: { question: true } },
          },
        });

        const { totalScore } = calculateScore(answers as any);

        for (const answer of answers) {
          const isCorrect =
            answer.selectedOption === answer.examQuestion.question.correctAnswer;

          if (answer.isCorrect === null) {
            await prisma.answer.update({
              where: { id: answer.id },
              data: { isCorrect },
            });
          }
        }

        await prisma.userExam.update({
          where: { id: session.id },
          data: {
            status: ExamStatus.TIMEOUT,
            submittedAt: new Date(),
            totalScore,
          },
        });

        cleaned++;
        logger.info({ userExamId: session.id, totalScore }, 'Session cleaned');
      } catch (error) {
        errors++;
        logger.error({ error, userExamId: session.id }, 'Failed to clean session');
      }
    }

    logger.info(
      { cleaned, errors, durationMs: Date.now() - startTime },
      'Cleanup complete'
    );

    return { cleaned, errors };
  } catch (error) {
    logger.error({ error }, 'Cleanup job failed');
    throw error;
  }
};

/**
 * Clean up expired tokens
 */
export const cleanupExpiredTokens = async (): Promise<TokenCleanupResult> => {
  const result = await prisma.token.deleteMany({
    where: { expires: { lt: new Date() } },
  });

  logger.info({ deleted: result.count }, 'Expired tokens cleaned');

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