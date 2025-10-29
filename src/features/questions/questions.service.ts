import { Prisma, QuestionType } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { NotFoundError, ConflictError, BusinessLogicError, BadRequestError } from '@/shared/errors/app-errors';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
  GetQuestionsQuery,
  BulkCreateQuestionsInput,
  BulkDeleteQuestionsInput,
  QuestionOptions,
} from './questions.validation';

// ==================== PRISMA SELECT OBJECTS ====================

const QUESTION_PUBLIC_SELECT = {
  id: true,
  content: true,
  options: true,
  correctAnswer: true,
  defaultScore: true,
  questionType: true,
  createdAt: true,
} as const;

const QUESTION_DETAIL_SELECT = {
  ...QUESTION_PUBLIC_SELECT,
  _count: {
    select: {
      examQuestions: true,
    },
  },
} as const;

const QUESTION_WITHOUT_ANSWER_SELECT = {
  id: true,
  content: true,
  options: true,
  defaultScore: true,
  questionType: true,
} as const;

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate that options object has correct structure
 */
const validateOptions = (options: any): options is QuestionOptions => {
  if (typeof options !== 'object' || options === null) return false;
  const keys = Object.keys(options);
  if (keys.length !== 5) return false;
  return ['A', 'B', 'C', 'D', 'E'].every((key) => {
    return keys.includes(key) && typeof options[key] === 'string' && options[key].length > 0;
  });
};

/**
 * Validate that correct answer exists in options
 */
const validateCorrectAnswer = (correctAnswer: string, options: QuestionOptions): boolean => {
  return correctAnswer in options;
};

// ==================== SERVICE FUNCTIONS ====================

/**
 * Create a new question
 */
export const createQuestion = async (input: CreateQuestionInput) => {
  const { content, options, correctAnswer, defaultScore, questionType } = input;

  // Additional validation
  if (!validateOptions(options)) {
    throw new BadRequestError(ERROR_MESSAGES.INVALID_OPTIONS_FORMAT, {
      errorCode: ERROR_CODES.QUESTION_INVALID_FORMAT,
    });
  }

  if (!validateCorrectAnswer(correctAnswer, options as QuestionOptions)) {
    throw new BadRequestError(ERROR_MESSAGES.CORRECT_ANSWER_NOT_IN_OPTIONS, {
      correctAnswer,
      errorCode: ERROR_CODES.QUESTION_INVALID_FORMAT,
    });
  }

  // Check for duplicate content
  const existingQuestion = await prisma.questionBank.findFirst({
    where: {
      content: {
        equals: content,
        mode: 'insensitive',
      },
    },
  });

  if (existingQuestion) {
    throw new ConflictError(ERROR_MESSAGES.DUPLICATE_QUESTION_CONTENT, {
      content: content.substring(0, 100),
      existingQuestionId: existingQuestion.id,
    });
  }

  // Create question
  const question = await prisma.questionBank.create({
    data: {
      content,
      options: options as Prisma.JsonObject,
      correctAnswer,
      defaultScore,
      questionType,
    },
    select: QUESTION_DETAIL_SELECT,
  });

  return question;
};

/**
 * Get list of questions with filters and pagination
 */
export const getQuestions = async (filter: GetQuestionsQuery) => {
  const { page, limit, type, search, sortBy, sortOrder } = filter;

  // Build where clause
  const where: Prisma.QuestionBankWhereInput = {
    ...(type && { questionType: type }),
    ...(search && {
      content: {
        contains: search,
        mode: 'insensitive',
      },
    }),
  };

  const skip = (page - 1) * limit;
  const orderBy: Prisma.QuestionBankOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  const [questions, total] = await Promise.all([
    prisma.questionBank.findMany({
      where,
      select: QUESTION_PUBLIC_SELECT,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.questionBank.count({ where }),
  ]);

  return createPaginatedResponse(questions, page, limit, total);
};

/**
 * Get single question by ID
 */
export const getQuestionById = async (id: number) => {
  const question = await prisma.questionBank.findUnique({
    where: { id },
    select: QUESTION_DETAIL_SELECT,
  });

  if (!question) {
    throw new NotFoundError(ERROR_MESSAGES.QUESTION_NOT_FOUND, {
      questionId: id,
      errorCode: ERROR_CODES.QUESTION_NOT_FOUND,
    });
  }

  return question;
};

/**
 * Update question by ID
 */
export const updateQuestion = async (id: number, data: UpdateQuestionInput) => {
  // Check if question exists
  const existingQuestion = await prisma.questionBank.findUnique({
    where: { id },
  });

  if (!existingQuestion) {
    throw new NotFoundError(ERROR_MESSAGES.QUESTION_NOT_FOUND, {
      questionId: id,
      errorCode: ERROR_CODES.QUESTION_NOT_FOUND,
    });
  }

  // Check if question is used in active exams
  const activeUsage = await prisma.examQuestion.count({
    where: {
      questionId: id,
      exam: {
        userExams: {
          some: {
            status: 'IN_PROGRESS',
          },
        },
      },
    },
  });

  if (activeUsage > 0) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.QUESTION_IN_ACTIVE_EXAM,
      ERROR_CODES.QUESTION_IN_USE,
      {
        questionId: id,
        activeExamSessions: activeUsage,
      }
    );
  }

  // Validate options if provided
  if (data.options && !validateOptions(data.options)) {
    throw new BadRequestError(ERROR_MESSAGES.INVALID_OPTIONS_FORMAT, {
      questionId: id,
      errorCode: ERROR_CODES.QUESTION_INVALID_FORMAT,
    });
  }

  // Validate correctAnswer if provided
  if (data.correctAnswer) {
    const optionsToCheck = (data.options || existingQuestion.options) as QuestionOptions;
    if (!validateCorrectAnswer(data.correctAnswer, optionsToCheck)) {
      throw new BadRequestError(ERROR_MESSAGES.CORRECT_ANSWER_NOT_IN_OPTIONS, {
        questionId: id,
        correctAnswer: data.correctAnswer,
        errorCode: ERROR_CODES.QUESTION_INVALID_FORMAT,
      });
    }
  }

  // Update question
  const updateData: Prisma.QuestionBankUpdateInput = {
    ...data,
    ...(data.options && { options: data.options as Prisma.JsonObject }),
  };

  const question = await prisma.questionBank.update({
    where: { id },
    data: updateData,
    select: QUESTION_DETAIL_SELECT,
  });

  return question;
};

/**
 * Delete question by ID
 */
export const deleteQuestion = async (id: number) => {
  // Check if question exists
  const existingQuestion = await prisma.questionBank.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          examQuestions: true,
        },
      },
    },
  });

  if (!existingQuestion) {
    throw new NotFoundError(ERROR_MESSAGES.QUESTION_NOT_FOUND, {
      questionId: id,
      errorCode: ERROR_CODES.QUESTION_NOT_FOUND,
    });
  }

  // Check if question is used in any exam
  if (existingQuestion._count.examQuestions > 0) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.QUESTION_IN_USE,
      ERROR_CODES.QUESTION_IN_USE,
      {
        questionId: id,
        usageCount: existingQuestion._count.examQuestions,
      }
    );
  }

  // Delete question
  await prisma.questionBank.delete({
    where: { id },
  });

  return { message: 'Question deleted successfully' };
};

/**
 * Bulk create questions
 */
export const bulkCreateQuestions = async (input: BulkCreateQuestionsInput) => {
  const { questions } = input;

  // Validate all questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!validateOptions(q.options)) {
      throw new BadRequestError(`Question ${i + 1}: ${ERROR_MESSAGES.INVALID_OPTIONS_FORMAT}`, {
        questionIndex: i,
        errorCode: ERROR_CODES.QUESTION_INVALID_FORMAT,
      });
    }
    if (!validateCorrectAnswer(q.correctAnswer, q.options as QuestionOptions)) {
      throw new BadRequestError(`Question ${i + 1}: ${ERROR_MESSAGES.CORRECT_ANSWER_NOT_IN_OPTIONS}`, {
        questionIndex: i,
        errorCode: ERROR_CODES.QUESTION_INVALID_FORMAT,
      });
    }
  }

  // Create all questions
  const created = await prisma.questionBank.createMany({
    data: questions.map((q) => ({
      content: q.content,
      options: q.options as Prisma.JsonObject,
      correctAnswer: q.correctAnswer,
      defaultScore: q.defaultScore,
      questionType: q.questionType,
    })),
  });

  // Fetch created questions
  const createdQuestions = await prisma.questionBank.findMany({
    select: QUESTION_PUBLIC_SELECT,
    orderBy: { createdAt: 'desc' },
    take: created.count,
  });

  return {
    message: `Successfully created ${created.count} question(s)`,
    created: created.count,
    questions: createdQuestions,
  };
};

/**
 * Bulk delete questions
 */
export const bulkDeleteQuestions = async (input: BulkDeleteQuestionsInput) => {
  const { questionIds } = input;

  // Check which questions are in use
  const questionsInUse = await prisma.examQuestion.findMany({
    where: {
      questionId: { in: questionIds },
    },
    select: {
      questionId: true,
    },
    distinct: ['questionId'],
  });

  const inUseIds = questionsInUse.map((eq) => eq.questionId);
  const deletableIds = questionIds.filter((id) => !inUseIds.includes(id));

  if (deletableIds.length === 0) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.ALL_QUESTIONS_IN_USE,
      ERROR_CODES.QUESTION_IN_USE,
      {
        requestedIds: questionIds,
        inUseIds,
      }
    );
  }

  // Delete questions
  const result = await prisma.questionBank.deleteMany({
    where: {
      id: { in: deletableIds },
    },
  });

  const message =
    inUseIds.length > 0
      ? `Deleted ${result.count} question(s). Skipped ${inUseIds.length} question(s) that are in use.`
      : `Successfully deleted ${result.count} question(s)`;

  return {
    message,
    deleted: result.count,
    skipped: inUseIds.length,
    skippedIds: inUseIds,
  };
};

/**
 * Get question statistics
 */
export const getQuestionStats = async () => {
  // Get total count
  const total = await prisma.questionBank.count();

  // Get count by type
  const byType = await prisma.questionBank.groupBy({
    by: ['questionType'],
    _count: true,
    _sum: {
      defaultScore: true,
    },
    _avg: {
      defaultScore: true,
    },
  });

  // Get most used questions
  const mostUsed = await prisma.examQuestion.groupBy({
    by: ['questionId'],
    _count: true,
    orderBy: {
      _count: {
        questionId: 'desc',
      },
    },
    take: 10,
  });

  // Fetch question details for most used
  const mostUsedDetails = await prisma.questionBank.findMany({
    where: {
      id: { in: mostUsed.map((q) => q.questionId) },
    },
    select: {
      id: true,
      content: true,
      questionType: true,
    },
  });

  // Combine most used data
  const mostUsedWithDetails = mostUsed.map((mu) => {
    const details = mostUsedDetails.find((d) => d.id === mu.questionId);
    return {
      id: mu.questionId,
      content: details?.content.substring(0, 100) || '',
      questionType: details?.questionType,
      usageCount: mu._count,
    };
  });

  return {
    total,
    byType: byType.map((bt) => ({
      type: bt.questionType,
      count: bt._count,
      totalScore: bt._sum.defaultScore || 0,
      averageScore: bt._avg.defaultScore || 0,
    })),
    mostUsed: mostUsedWithDetails,
  };
};

/**
 * Get questions for participant (without correct answer)
 */
export const getQuestionsForParticipant = async (questionIds: number[]) => {
  const questions = await prisma.questionBank.findMany({
    where: {
      id: { in: questionIds },
    },
    select: QUESTION_WITHOUT_ANSWER_SELECT,
  });

  return questions;
};