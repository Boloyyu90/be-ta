import { Prisma, ExamStatus, QuestionType } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { logger } from '@/shared/utils/logger';
import type {
  SubmitAnswerInput,
  GetMyResultsQuery,
  GetResultsQuery,
  GetExamQuestionsQuery,
  ParticipantQuestion,
  ParticipantAnswer,
  UserExamSession,
  ExamResult,
  AnswerReview,
} from './exam-sessions.validation';

// ==================== TIMER UTILITY ====================

/**
 * Check if exam is still within time limit
 * Includes grace period for network delays
 *
 * @param startedAt - When exam was started
 * @param durationMinutes - Exam duration in minutes
 * @param graceMs - Grace period in milliseconds (default 3 seconds)
 * @returns true if still within time
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
 *
 * @param startedAt - When exam was started
 * @param durationMinutes - Exam duration in minutes
 * @returns remaining time in ms, or 0 if expired
 */
export const getRemainingTime = (startedAt: Date, durationMinutes: number): number => {
  const elapsed = Date.now() - startedAt.getTime();
  const limit = durationMinutes * 60 * 1000;
  const remaining = limit - elapsed;
  return Math.max(0, remaining);
};

/**
 * Calculate exam duration in seconds
 *
 * @param startedAt - When exam was started
 * @param finishedAt - When exam was finished
 * @returns duration in seconds
 */
export const calculateDuration = (startedAt: Date, finishedAt: Date): number => {
  return Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000);
};

// ==================== PRISMA SELECT OBJECTS ====================

const USER_EXAM_SELECT = {
  id: true,
  examId: true,
  userId: true,
  startedAt: true,
  finishedAt: true,
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

// ==================== SERVICE FUNCTIONS ====================

/**
 * Start an exam session
 *
 * Business rules:
 * - User can only start exam once (@@unique constraint)
 * - If already started but not submitted, return existing session
 * - If already submitted, prevent restart
 * - Exam must have questions
 *
 * @param userId - Participant user ID
 * @param examId - Exam ID to start
 * @returns User exam session with questions
 */
export const startExam = async (userId: number, examId: number) => {
  logger.info({ userId, examId }, 'Starting exam session');

  // Check if exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
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
  });

  if (!exam) {
    logger.warn({ examId }, 'Exam not found');
    throw new Error(ERROR_MESSAGES.EXAM_NOT_FOUND);
  }

  // Check if exam has questions
  if (exam.examQuestions.length === 0) {
    logger.warn({ examId }, 'Exam has no questions');
    throw new Error('This exam has no questions yet');
  }

  // Check if exam duration is set
  if (!exam.durationMinutes) {
    logger.warn({ examId }, 'Exam has no duration set');
    throw new Error('This exam has no duration set');
  }

  // Check for existing user exam
  const existingUserExam = await prisma.userExam.findUnique({
    where: {
      userId_examId: {
        userId,
        examId,
      },
    },
    include: {
      answers: true,
    },
  });

  // If already finished, prevent restart
  if (existingUserExam?.finishedAt) {
    logger.warn({ userId, examId, status: existingUserExam.status }, 'Exam already completed');
    throw new Error(ERROR_MESSAGES.EXAM_ALREADY_STARTED);
  }

  let userExam;

  // If not started yet, create new session
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

    logger.info({ userExamId: userExam.id, userId, examId }, 'Exam session created');
  } else {
    // Return existing in-progress session
    userExam = await prisma.userExam.findUnique({
      where: { id: existingUserExam.id },
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

    logger.info({ userExamId: existingUserExam.id, userId, examId }, 'Returning existing exam session');
  }

  if (!userExam) {
    throw new Error('Failed to create or retrieve exam session');
  }

  // Calculate remaining time
  const remainingTimeMs = getRemainingTime(userExam.startedAt!, exam.durationMinutes);

  // Prepare questions (without correct answers)
  const questions: ParticipantQuestion[] = userExam.exam.examQuestions.map((eq) => ({
    id: eq.question.id,
    examQuestionId: eq.id,
    content: eq.question.content,
    options: eq.question.options as any,
    questionType: eq.question.questionType,
    orderNumber: eq.orderNumber,
  }));

  // Prepare existing answers
  const answers: ParticipantAnswer[] = userExam.exam.examQuestions.map((eq) => {
    const existingAnswer = userExam.answers.find((a) => a.examQuestionId === eq.id);
    return {
      examQuestionId: eq.id,
      selectedOption: existingAnswer?.selectedOption || null,
      answeredAt: existingAnswer?.answeredAt || null,
    };
  });

  // Prepare session data
  const session: UserExamSession = {
    id: userExam.id,
    examId: userExam.examId,
    examTitle: userExam.exam.title,
    durationMinutes: exam.durationMinutes,
    startedAt: userExam.startedAt!,
    finishedAt: userExam.finishedAt,
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
 * Uses UPSERT to allow autosave functionality
 * Does NOT validate correctness (happens on submit)
 *
 * @param userExamId - User exam session ID
 * @param userId - User ID (for authorization)
 * @param data - Answer data
 * @returns Updated answer
 */
export const submitAnswer = async (
  userExamId: number,
  userId: number,
  data: SubmitAnswerInput
) => {
  logger.debug({ userExamId, userId, ...data }, 'Submitting answer');

  // Get user exam with exam details
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    include: {
      exam: {
        include: {
          examQuestions: true,
        },
      },
    },
  });

  if (!userExam) {
    throw new Error('Exam session not found');
  }

  // Authorization check
  if (userExam.userId !== userId) {
    throw new Error('Unauthorized to submit answer for this exam session');
  }

  // Check if exam is already finished
  if (userExam.finishedAt) {
    throw new Error('Cannot submit answer - exam already finished');
  }

  // Check if still within time limit
  if (!withinTimeLimit(userExam.startedAt!, userExam.exam.durationMinutes!)) {
    // Auto-timeout the exam
    await prisma.userExam.update({
      where: { id: userExamId },
      data: {
        status: ExamStatus.TIMEOUT,
        finishedAt: new Date(),
      },
    });
    throw new Error(ERROR_MESSAGES.EXAM_TIMEOUT);
  }

  // Verify exam question belongs to this exam
  const examQuestion = userExam.exam.examQuestions.find((eq) => eq.id === data.examQuestionId);

  if (!examQuestion) {
    throw new Error('Invalid exam question ID for this exam');
  }

  // Upsert answer (create or update)
  const answer = await prisma.answer.upsert({
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

  // Get progress
  const totalAnswered = await prisma.answer.count({
    where: {
      userExamId,
      selectedOption: { not: null },
    },
  });

  const totalQuestions = userExam.exam.examQuestions.length;

  logger.info({ userExamId, examQuestionId: data.examQuestionId }, 'Answer submitted');

  return {
    message: 'Answer saved successfully',
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
};

/**
 * Submit exam and calculate score
 *
 * Business rules:
 * - Must be within time limit (with grace period)
 * - If timeout, set status TIMEOUT and don't calculate score
 * - Calculate score by comparing with correct answers
 * - Group scores by question type
 *
 * @param userExamId - User exam session ID
 * @param userId - User ID (for authorization)
 * @returns Exam result with scores
 */
export const submitExam = async (userExamId: number, userId: number) => {
  logger.info({ userExamId, userId }, 'Submitting exam');

  // Get user exam with all related data
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    include: {
      exam: {
        include: {
          examQuestions: {
            include: {
              question: true,
            },
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
    throw new Error('Exam session not found');
  }

  // Authorization check
  if (userExam.userId !== userId) {
    throw new Error('Unauthorized to submit this exam');
  }

  // Check if already submitted
  if (userExam.finishedAt) {
    throw new Error('Exam already submitted');
  }

  const now = new Date();

  // Check time limit
  const isWithinTime = withinTimeLimit(
    userExam.startedAt!,
    userExam.exam.durationMinutes!
  );

  if (!isWithinTime) {
    // TIMEOUT - don't calculate score
    await prisma.userExam.update({
      where: { id: userExamId },
      data: {
        status: ExamStatus.TIMEOUT,
        finishedAt: now,
      },
    });

    logger.warn({ userExamId }, 'Exam submission failed - timeout');
    throw new Error(ERROR_MESSAGES.EXAM_TIMEOUT);
  }

  // Calculate scores
  let totalScore = 0;
  const scoresByType: Map<
    QuestionType,
    { score: number; maxScore: number; correct: number; total: number }
  > = new Map();

  // Initialize score tracking by type
  for (const type of Object.values(QuestionType)) {
    scoresByType.set(type, { score: 0, maxScore: 0, correct: 0, total: 0 });
  }

  // Process each answer
  for (const answer of userExam.answers) {
    const examQuestion = userExam.exam.examQuestions.find(
      (eq) => eq.id === answer.examQuestionId
    );

    if (!examQuestion) continue;

    const question = examQuestion.question;
    const isCorrect = answer.selectedOption === question.correctAnswer;
    const scoreEarned = isCorrect ? question.defaultScore : 0;

    // Update answer with correctness
    await prisma.answer.update({
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

  // Update user exam
  await prisma.userExam.update({
    where: { id: userExamId },
    data: {
      status: ExamStatus.FINISHED,
      finishedAt: now,
      totalScore,
    },
  });

  logger.info({ userExamId, totalScore }, 'Exam submitted successfully');

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
    finishedAt: now,
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

  return {
    message: 'Exam submitted successfully',
    result,
  };
};

/**
 * Get user exam session details
 *
 * @param userExamId - User exam ID
 * @param userId - User ID (for authorization)
 * @returns User exam session data
 */
export const getUserExam = async (userExamId: number, userId: number) => {
  logger.debug({ userExamId, userId }, 'Fetching user exam');

  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    select: USER_EXAM_SELECT,
  });

  if (!userExam) {
    throw new Error('Exam session not found');
  }

  // Authorization check (users can only view their own)
  if (userExam.userId !== userId) {
    throw new Error('Unauthorized to view this exam session');
  }

  return userExam;
};

/**
 * Get user's exam results (their own results only)
 *
 * @param userId - User ID
 * @param filter - Query filters
 * @returns Paginated results
 */
export const getMyResults = async (userId: number, filter: GetMyResultsQuery) => {
  const { page, limit, status } = filter;

  logger.debug({ userId, filter }, 'Fetching user results');

  const where: Prisma.UserExamWhereInput = {
    userId,
    ...(status && { status }),
  };

  const skip = (page - 1) * limit;

  const [userExams, total] = await Promise.all([
    prisma.userExam.findMany({
      where,
      select: USER_EXAM_SELECT,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
    finishedAt: ue.finishedAt,
    totalScore: ue.totalScore,
    status: ue.status,
    duration: ue.startedAt && ue.finishedAt ? calculateDuration(ue.startedAt, ue.finishedAt) : null,
    answeredQuestions: ue._count.answers,
    totalQuestions: ue.exam._count.examQuestions,
    scoresByType: [], // Simplified for list view
  }));

  return createPaginatedResponse(results, page, limit, total);
};

/**
 * Get all exam results (admin only)
 *
 * @param filter - Query filters
 * @returns Paginated results
 */
export const getResults = async (filter: GetResultsQuery) => {
  const { page, limit, examId, userId, status, sortBy, sortOrder } = filter;

  logger.debug({ filter }, 'Fetching all results');

  const where: Prisma.UserExamWhereInput = {
    ...(examId && { examId }),
    ...(userId && { userId }),
    ...(status && { status }),
  };

  const skip = (page - 1) * limit;

  const orderBy: Prisma.UserExamOrderByWithRelationInput = {
    [sortBy]: sortOrder,
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
    finishedAt: ue.finishedAt,
    totalScore: ue.totalScore,
    status: ue.status,
    duration: ue.startedAt && ue.finishedAt ? calculateDuration(ue.startedAt, ue.finishedAt) : null,
    answeredQuestions: ue._count.answers,
    totalQuestions: ue.exam._count.examQuestions,
    scoresByType: [], // Simplified for list view
  }));

  return createPaginatedResponse(results, page, limit, total);
};

/**
 * Get exam questions for active session
 *
 * @param userExamId - User exam ID
 * @param userId - User ID (for authorization)
 * @param filter - Question filters
 * @returns Questions without correct answers
 */
export const getExamQuestions = async (
  userExamId: number,
  userId: number,
  filter: GetExamQuestionsQuery
) => {
  const { type } = filter;

  logger.debug({ userExamId, userId, type }, 'Fetching exam questions');

  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    include: {
      exam: {
        include: {
          examQuestions: {
            where: type ? { question: { questionType: type } } : undefined,
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
    throw new Error('Exam session not found');
  }

  if (userExam.userId !== userId) {
    throw new Error('Unauthorized');
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
 *
 * @param userExamId - User exam ID
 * @param userId - User ID (for authorization)
 * @returns Answers with correct answers shown
 */
export const getExamAnswers = async (userExamId: number, userId: number) => {
  logger.debug({ userExamId, userId }, 'Fetching exam answers for review');

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
    throw new Error('Exam session not found');
  }

  if (userExam.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Can only review after submission
  if (!userExam.finishedAt) {
    throw new Error('Cannot review answers before submitting exam');
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