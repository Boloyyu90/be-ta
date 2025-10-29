import { Prisma, QuestionType } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { logger } from '@/shared/utils/logger';
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
 * This is additional validation beyond Zod
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
 *
 * Business rules:
 * - Content must be unique (soft constraint, not enforced by DB)
 * - Options must have exactly A-E
 * - Correct answer must be one of the options
 *
 * @param input - Question data
 * @returns Created question
 */
export const createQuestion = async (input: CreateQuestionInput) => {
  const { content, options, correctAnswer, defaultScore, questionType } = input;

  logger.info({ questionType, score: defaultScore }, 'Creating new question');

  // Additional validation
  if (!validateOptions(options)) {
    throw new BadRequestError(ERROR_MESSAGES.INVALID_OPTIONS_FORMAT);
  }

  if (!validateCorrectAnswer(correctAnswer, options as QuestionOptions)) {
    throw new BadRequestError(`${ERROR_MESSAGES.CORRECT_ANSWER_NOT_IN_OPTIONS}: '${correctAnswer}'`);
  }

  // Optional: Check for duplicate content
  const existingQuestion = await prisma.questionBank.findFirst({
    where: {
      content: {
        equals: content,
        mode: 'insensitive',
      },
    },
  });

  if (existingQuestion) {
    logger.warn({ content: content.substring(0, 50) }, 'Question creation failed - duplicate content');
    throw new ConflictError(ERROR_MESSAGES.DUPLICATE_QUESTION_CONTENT);
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

  logger.info({ questionId: question.id, type: questionType }, 'Question created successfully');

  return question;
};

/**
 * Get list of questions with filters and pagination
 *
 * @param filter - Query parameters
 * @returns Paginated list of questions
 */
export const getQuestions = async (filter: GetQuestionsQuery) => {
  const { page, limit, type, search, sortBy, sortOrder } = filter;

  logger.debug({ filter }, 'Fetching questions list');

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

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Determine sort field
  const orderBy: Prisma.QuestionBankOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  // Execute queries in parallel
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

  logger.info({ total, page, limit }, 'Questions fetched successfully');

  return createPaginatedResponse(questions, page, limit, total);
};

/**
 * Get single question by ID
 *
 * @param id - Question ID
 * @returns Question details with usage count
 */
export const getQuestionById = async (id: number) => {
  logger.debug({ questionId: id }, 'Fetching question by ID');

  const question = await prisma.questionBank.findUnique({
    where: { id },
    select: QUESTION_DETAIL_SELECT,
  });

  if (!question) {
    logger.warn({ questionId: id }, 'Question not found');
    throw new NotFoundError(ERROR_MESSAGES.QUESTION_NOT_FOUND);
  }

  logger.info({ questionId: id }, 'Question fetched successfully');

  return question;
};

/**
 * Update question by ID
 *
 * Business rules:
 * - Cannot update if question is currently used in active exams
 * - If updating options, must still have A-E
 * - If updating correctAnswer, must exist in options
 *
 * @param id - Question ID
 * @param data - Fields to update
 * @returns Updated question
 */
export const updateQuestion = async (id: number, data: UpdateQuestionInput) => {
  logger.info({ questionId: id, updates: Object.keys(data) }, 'Updating question');

  // Check if question exists
  const existingQuestion = await prisma.questionBank.findUnique({
    where: { id },
  });

  if (!existingQuestion) {
    logger.warn({ questionId: id }, 'Question update failed - not found');
    throw new NotFoundError(ERROR_MESSAGES.QUESTION_NOT_FOUND);
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
    logger.warn({ questionId: id, activeUsage }, 'Cannot update question in active exams');
    throw new BusinessLogicError(ERROR_MESSAGES.QUESTION_IN_ACTIVE_EXAM);
  }

  // Validate options if provided
  if (data.options && !validateOptions(data.options)) {
    throw new BadRequestError(ERROR_MESSAGES.INVALID_OPTIONS_FORMAT);
  }

  // Validate correctAnswer if provided
  if (data.correctAnswer) {
    const optionsToCheck = (data.options || existingQuestion.options) as QuestionOptions;
    if (!validateCorrectAnswer(data.correctAnswer, optionsToCheck)) {
      throw new BadRequestError(`${ERROR_MESSAGES.CORRECT_ANSWER_NOT_IN_OPTIONS}: '${data.correctAnswer}'`);
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

  logger.info({ questionId: id }, 'Question updated successfully');

  return question;
};

/**
 * Delete question by ID
 *
 * Business rules:
 * - Cannot delete if question is used in any exam (use RESTRICT in schema)
 * - This is enforced by database foreign key constraint
 *
 * @param id - Question ID
 * @returns Success message
 */
export const deleteQuestion = async (id: number) => {
  logger.info({ questionId: id }, 'Deleting question');

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
    logger.warn({ questionId: id }, 'Question deletion failed - not found');
    throw new NotFoundError(ERROR_MESSAGES.QUESTION_NOT_FOUND);
  }

  // Check if question is used in any exam
  if (existingQuestion._count.examQuestions > 0) {
    logger.warn(
      { questionId: id, usageCount: existingQuestion._count.examQuestions },
      'Cannot delete question in use'
    );
    throw new BusinessLogicError(
      `${ERROR_MESSAGES.QUESTION_IN_USE} (used in ${existingQuestion._count.examQuestions} exam(s))`
    );
  }

  // Delete question
  await prisma.questionBank.delete({
    where: { id },
  });

  logger.info({ questionId: id }, 'Question deleted successfully');

  return { message: 'Question deleted successfully' };
};

/**
 * Bulk create questions
 * Useful for importing questions from file
 *
 * @param input - Array of questions
 * @returns Created questions
 */
export const bulkCreateQuestions = async (input: BulkCreateQuestionsInput) => {
  const { questions } = input;

  logger.info({ count: questions.length }, 'Bulk creating questions');

  // Validate all questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!validateOptions(q.options)) {
      throw new BadRequestError(`Question ${i + 1}: ${ERROR_MESSAGES.INVALID_OPTIONS_FORMAT}`);
    }
    if (!validateCorrectAnswer(q.correctAnswer, q.options as QuestionOptions)) {
      throw new BadRequestError(`Question ${i + 1}: ${ERROR_MESSAGES.CORRECT_ANSWER_NOT_IN_OPTIONS}`);
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

  logger.info({ created: created.count }, 'Questions bulk created successfully');

  return {
    message: `Successfully created ${created.count} question(s)`,
    created: created.count,
    questions: createdQuestions,
  };
};

/**
 * Bulk delete questions
 *
 * Business rules:
 * - Only deletes questions that are not used in any exam
 * - Returns count of deleted questions
 *
 * @param input - Array of question IDs
 * @returns Delete count
 */
export const bulkDeleteQuestions = async (input: BulkDeleteQuestionsInput) => {
  const { questionIds } = input;

  logger.info({ count: questionIds.length }, 'Bulk deleting questions');

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
    logger.warn({ inUseIds }, 'No questions can be deleted - all in use');
    throw new BusinessLogicError(ERROR_MESSAGES.ALL_QUESTIONS_IN_USE);
  }

  // Delete questions
  const result = await prisma.questionBank.deleteMany({
    where: {
      id: { in: deletableIds },
    },
  });

  logger.info({ deleted: result.count, skipped: inUseIds.length }, 'Questions bulk deleted');

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
 * Useful for admin dashboard
 *
 * @returns Statistics about questions
 */
export const getQuestionStats = async () => {
  logger.debug('Fetching question statistics');

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

  logger.info({ total }, 'Question statistics fetched');

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
 * This will be used when participant starts an exam
 *
 * @param questionIds - Array of question IDs
 * @returns Questions without correct answers
 */
export const getQuestionsForParticipant = async (questionIds: number[]) => {
  logger.debug({ count: questionIds.length }, 'Fetching questions for participant');

  const questions = await prisma.questionBank.findMany({
    where: {
      id: { in: questionIds },
    },
    select: QUESTION_WITHOUT_ANSWER_SELECT,
  });

  return questions;
};