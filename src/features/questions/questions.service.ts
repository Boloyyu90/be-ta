import { Prisma, QuestionType } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { NotFoundError, BadRequestError, BusinessLogicError } from '@/shared/errors/app-errors';
import type {
  CreateQuestionInput,
  UpdateQuestionInput,
  GetQuestionsQuery,
  BulkCreateQuestionsInput,
} from './questions.validation';

// ==================== TYPES ====================

type QuestionOptions = {
  A: string;
  B: string;
  C: string;
  D: string;
  E: string;
};

// ==================== PRISMA SELECT OBJECTS ====================

/**
 * Standard question select object
 */
const QUESTION_SELECT = {
  id: true,
  content: true,
  options: true,
  correctAnswer: true,
  questionType: true,
  defaultScore: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ==================== VALIDATION HELPERS ====================

/**
 * Validate question options format
 * Must have exactly 5 keys: A, B, C, D, E with non-empty string values
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
 * Validate correct answer matches one of the option keys
 */
const validateCorrectAnswer = (correctAnswer: string, options: QuestionOptions): boolean => {
  const validKeys = ['A', 'B', 'C', 'D', 'E'] as const;

  // Check 1: Is correctAnswer a valid key?
  if (!validKeys.includes(correctAnswer as any)) return false;

  // Check 2: Does that key exist in options? (redundant karena type QuestionOptions sudah strict)
  // Ini sebenarnya tidak perlu karena QuestionOptions PASTI punya A-E
  return true;
};
// ==================== SERVICE FUNCTIONS ====================

/**
 * Create a new question
 *
 * @param input - Question creation data
 * @returns Created question data
 * @throws {BadRequestError} If options format is invalid
 */
export const createQuestion = async (input: CreateQuestionInput) => {
  const { content, options, correctAnswer, questionType, defaultScore } = input;

  // Validate options format
  if (!validateOptions(options)) {
    throw new BadRequestError(ERROR_MESSAGES.INVALID_OPTIONS_FORMAT, {
      providedKeys: Object.keys(options),
      expectedKeys: ['A', 'B', 'C', 'D', 'E'],
      errorCode: ERROR_CODES.QUESTION_INVALID_OPTIONS,
    });
  }

  // Validate correct answer
  if (!validateCorrectAnswer(correctAnswer, options)) {
    throw new BadRequestError(ERROR_MESSAGES.INVALID_CORRECT_ANSWER, {
      correctAnswer,
      availableOptions: Object.keys(options),
      errorCode: ERROR_CODES.QUESTION_INVALID_ANSWER,
    });
  }

  // Create question
  const question = await prisma.questionBank.create({
    data: {
      content,
      options: options as Prisma.JsonObject,
      correctAnswer,
      questionType,
      defaultScore: defaultScore || 1,
    },
    select: QUESTION_SELECT,
  });

  return question;
};

/**
 * Get questions list with filters and pagination
 *
 * @param filter - Query filters
 * @returns Paginated list of questions
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

  // Execute queries in parallel
  const [questions, total] = await Promise.all([
    prisma.questionBank.findMany({
      where,
      select: QUESTION_SELECT,
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
 *
 * @param id - Question ID
 * @returns Question data
 * @throws {NotFoundError} If question not found
 */
export const getQuestionById = async (id: number) => {
  const question = await prisma.questionBank.findUnique({
    where: { id },
    select: QUESTION_SELECT,
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
 *
 * @param id - Question ID
 * @param data - Update data
 * @returns Updated question data
 * @throws {NotFoundError} If question not found
 * @throws {BadRequestError} If options or correct answer invalid
 */
export const updateQuestion = async (id: number, data: UpdateQuestionInput) => {
  // Check if question exists
  const existingQuestion = await prisma.questionBank.findUnique({
    where: { id },
    select: { id: true, options: true, correctAnswer: true },
  });

  if (!existingQuestion) {
    throw new NotFoundError(ERROR_MESSAGES.QUESTION_NOT_FOUND, {
      questionId: id,
      errorCode: ERROR_CODES.QUESTION_NOT_FOUND,
    });
  }

  // Validate options if provided
  if (data.options && !validateOptions(data.options)) {
    throw new BadRequestError(ERROR_MESSAGES.INVALID_OPTIONS_FORMAT, {
      providedKeys: Object.keys(data.options),
      expectedKeys: ['A', 'B', 'C', 'D', 'E'],
      errorCode: ERROR_CODES.QUESTION_INVALID_OPTIONS,
    });
  }

  // Validate correct answer against new or existing options
  if (data.correctAnswer) {
    const optionsToCheck = (data.options || existingQuestion.options) as QuestionOptions;
    if (!validateCorrectAnswer(data.correctAnswer, optionsToCheck)) {
      throw new BadRequestError(ERROR_MESSAGES.INVALID_CORRECT_ANSWER, {
        correctAnswer: data.correctAnswer,
        availableOptions: Object.keys(optionsToCheck),
        errorCode: ERROR_CODES.QUESTION_INVALID_ANSWER,
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
    select: QUESTION_SELECT,
  });

  return question;
};

/**
 * Delete question by ID
 * Cannot delete if question is used in any exam
 *
 * @param id - Question ID
 * @throws {NotFoundError} If question not found
 * @throws {BusinessLogicError} If question is used in exams
 */
export const deleteQuestion = async (id: number) => {
  // Check if question exists
  const question = await prisma.questionBank.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          examQuestions: true,
        },
      },
    },
  });

  if (!question) {
    throw new NotFoundError(ERROR_MESSAGES.QUESTION_NOT_FOUND, {
      questionId: id,
      errorCode: ERROR_CODES.QUESTION_NOT_FOUND,
    });
  }

  // Check if question is used in any exam
  if (question._count.examQuestions > 0) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.CANNOT_DELETE_QUESTION_IN_USE,
      ERROR_CODES.QUESTION_IN_USE,
      {
        questionId: id,
        usedInExams: question._count.examQuestions,
      }
    );
  }

  // Delete question
  await prisma.questionBank.delete({
    where: { id },
  });

  return { success: true, message: 'Question deleted successfully' };
};

/**
 * Bulk create questions from array
 * Validates all questions before creating any
 *
 * @param input - Bulk creation data
 * @returns Creation result with counts
 * @throws {BadRequestError} If any question has invalid format
 */
export const bulkCreateQuestions = async (input: BulkCreateQuestionsInput) => {
  const { questions } = input;

  // Validate all questions first
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // Validate options
    if (!validateOptions(q.options)) {
      throw new BadRequestError(
        `Question ${i + 1}: ${ERROR_MESSAGES.INVALID_OPTIONS_FORMAT}`,
        {
          questionIndex: i + 1,
          providedKeys: Object.keys(q.options),
          expectedKeys: ['A', 'B', 'C', 'D', 'E'],
          errorCode: ERROR_CODES.QUESTION_INVALID_OPTIONS,
        }
      );
    }

    // Validate correct answer
    if (!validateCorrectAnswer(q.correctAnswer, q.options)) {
      throw new BadRequestError(
        `Question ${i + 1}: ${ERROR_MESSAGES.INVALID_CORRECT_ANSWER}`,
        {
          questionIndex: i + 1,
          correctAnswer: q.correctAnswer,
          availableOptions: Object.keys(q.options),
          errorCode: ERROR_CODES.QUESTION_INVALID_ANSWER,
        }
      );
    }
  }

  // Create all questions
  const createdQuestions = await prisma.$transaction(
    questions.map((q) =>
      prisma.questionBank.create({
        data: {
          content: q.content,
          options: q.options as Prisma.JsonObject,
          correctAnswer: q.correctAnswer,
          questionType: q.questionType,
          defaultScore: q.defaultScore || 1,
        },
        select: QUESTION_SELECT,
      })
    )
  );

  return {
    created: createdQuestions.length,
    questions: createdQuestions,
  };
};