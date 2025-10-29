import { Prisma } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { NotFoundError, ConflictError, BusinessLogicError, ForbiddenError } from '@/shared/errors/app-errors';
import type {
  CreateExamInput,
  UpdateExamInput,
  GetExamsQuery,
  AttachQuestionsInput,
  DetachQuestionsInput,
  GetExamQuestionsQuery,
} from './exams.validation';

// ==================== PRISMA SELECT OBJECTS ====================

const EXAM_PUBLIC_SELECT = {
  id: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  durationMinutes: true,
  createdBy: true,
  createdAt: true,
} as const;

const EXAM_DETAIL_SELECT = {
  ...EXAM_PUBLIC_SELECT,
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  _count: {
    select: {
      examQuestions: true,
      userExams: true,
    },
  },
} as const;

const EXAM_WITH_QUESTIONS_SELECT = {
  ...EXAM_DETAIL_SELECT,
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
} as const;

// ==================== SERVICE FUNCTIONS ====================

/**
 * Create a new exam (Admin only)
 */
export const createExam = async (userId: number, input: CreateExamInput) => {
  const { title, description, startTime, endTime, durationMinutes } = input;

  // Check for duplicate title by same creator
  const existingExam = await prisma.exam.findFirst({
    where: {
      createdBy: userId,
      title: {
        equals: title,
        mode: 'insensitive',
      },
    },
  });

  if (existingExam) {
    throw new ConflictError(ERROR_MESSAGES.DUPLICATE_EXAM_TITLE, {
      title,
      userId,
      existingExamId: existingExam.id,
      errorCode: ERROR_CODES.EXAM_DUPLICATE_TITLE,
    });
  }

  // Create exam
  const exam = await prisma.exam.create({
    data: {
      title,
      description: description || null,
      startTime: startTime || null,
      endTime: endTime || null,
      durationMinutes,
      createdBy: userId,
    },
    select: EXAM_DETAIL_SELECT,
  });

  return exam;
};

/**
 * Get list of exams with filters and pagination
 */
export const getExams = async (filter: GetExamsQuery, isAdmin: boolean = false) => {
  const { page, limit, search, sortBy, sortOrder } = filter;

  // Build where clause
  const where: Prisma.ExamWhereInput = {
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(!isAdmin && {
      examQuestions: {
        some: {},
      },
    }),
  };

  const skip = (page - 1) * limit;
  const orderBy: Prisma.ExamOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      select: EXAM_PUBLIC_SELECT,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.exam.count({ where }),
  ]);

  return createPaginatedResponse(exams, page, limit, total);
};

/**
 * Get single exam by ID with full details
 */
export const getExamById = async (id: number, includeQuestions: boolean = false) => {
  const exam = await prisma.exam.findUnique({
    where: { id },
    select: includeQuestions ? EXAM_WITH_QUESTIONS_SELECT : EXAM_DETAIL_SELECT,
  });

  if (!exam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND, {
      examId: id,
      errorCode: ERROR_CODES.EXAM_NOT_FOUND,
    });
  }

  return exam;
};

/**
 * Update exam by ID
 */
export const updateExam = async (id: number, userId: number, data: UpdateExamInput) => {
  // Check if exam exists and user is the creator
  const existingExam = await prisma.exam.findUnique({
    where: { id },
  });

  if (!existingExam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND, {
      examId: id,
      errorCode: ERROR_CODES.EXAM_NOT_FOUND,
    });
  }

  // Authorization check: only creator can update
  if (existingExam.createdBy !== userId) {
    throw new ForbiddenError(ERROR_MESSAGES.NOT_EXAM_CREATOR, {
      examId: id,
      userId,
      createdBy: existingExam.createdBy,
      errorCode: ERROR_CODES.EXAM_NOT_CREATOR,
    });
  }

  // Check if exam has active sessions
  const hasActiveSessions = await prisma.userExam.count({
    where: {
      examId: id,
      status: 'IN_PROGRESS',
    },
  });

  if (hasActiveSessions > 0 && data.durationMinutes) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.CANNOT_UPDATE_ACTIVE_EXAM_DURATION,
      ERROR_CODES.EXAM_CANNOT_UPDATE,
      {
        examId: id,
        activeSessions: hasActiveSessions,
        attemptedChange: 'durationMinutes',
      }
    );
  }

  // Update exam
  const updateData: Prisma.ExamUpdateInput = {
    ...data,
  };

  const exam = await prisma.exam.update({
    where: { id },
    data: updateData,
    select: EXAM_DETAIL_SELECT,
  });

  return exam;
};

/**
 * Delete exam by ID
 */
export const deleteExam = async (id: number, userId: number) => {
  // Check if exam exists and user is creator
  const existingExam = await prisma.exam.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          userExams: true,
        },
      },
    },
  });

  if (!existingExam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND, {
      examId: id,
      errorCode: ERROR_CODES.EXAM_NOT_FOUND,
    });
  }

  if (existingExam.createdBy !== userId) {
    throw new ForbiddenError(ERROR_MESSAGES.CANNOT_DELETE_EXAM_NOT_CREATOR, {
      examId: id,
      userId,
      createdBy: existingExam.createdBy,
      errorCode: ERROR_CODES.EXAM_NOT_CREATOR,
    });
  }

  // Prevent deletion if exam has been taken
  if (existingExam._count.userExams > 0) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.CANNOT_DELETE_EXAM_WITH_ATTEMPTS,
      ERROR_CODES.EXAM_CANNOT_DELETE,
      {
        examId: id,
        attempts: existingExam._count.userExams,
      }
    );
  }

  // Delete exam (cascade will handle exam_questions)
  await prisma.exam.delete({
    where: { id },
  });

  return { message: 'Exam deleted successfully' };
};

/**
 * Attach questions to exam
 */
export const attachQuestions = async (examId: number, input: AttachQuestionsInput) => {
  const { questionIds } = input;

  // Check if exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND, {
      examId,
      errorCode: ERROR_CODES.EXAM_NOT_FOUND,
    });
  }

  // Check if all questions exist
  const questions = await prisma.questionBank.findMany({
    where: {
      id: { in: questionIds },
    },
  });

  if (questions.length !== questionIds.length) {
    const foundIds = questions.map((q) => q.id);
    const missingIds = questionIds.filter((id) => !foundIds.includes(id));
    throw new NotFoundError(ERROR_MESSAGES.QUESTIONS_NOT_FOUND, {
      examId,
      requestedIds: questionIds,
      missingIds,
      errorCode: ERROR_CODES.QUESTION_NOT_FOUND,
    });
  }

  // Get current max order number for this exam
  const maxOrderResult = await prisma.examQuestion.aggregate({
    where: { examId },
    _max: { orderNumber: true },
  });

  let nextOrderNumber = (maxOrderResult._max.orderNumber || 0) + 1;

  // Filter out questions that are already attached
  const existingQuestions = await prisma.examQuestion.findMany({
    where: {
      examId,
      questionId: { in: questionIds },
    },
    select: { questionId: true },
  });

  const existingQuestionIds = existingQuestions.map((eq) => eq.questionId);
  const newQuestionIds = questionIds.filter((id) => !existingQuestionIds.includes(id));

  if (newQuestionIds.length === 0) {
    return {
      message: 'All questions were already attached to this exam',
      attached: 0,
    };
  }

  // Create ExamQuestion records
  const examQuestions = newQuestionIds.map((questionId) => ({
    examId,
    questionId,
    orderNumber: nextOrderNumber++,
  }));

  await prisma.examQuestion.createMany({
    data: examQuestions,
  });

  return {
    message: `Successfully attached ${newQuestionIds.length} question(s) to exam`,
    attached: newQuestionIds.length,
  };
};

/**
 * Detach questions from exam
 */
export const detachQuestions = async (examId: number, input: DetachQuestionsInput) => {
  const { questionIds } = input;

  // Check if exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND, {
      examId,
      errorCode: ERROR_CODES.EXAM_NOT_FOUND,
    });
  }

  // Delete exam questions
  const result = await prisma.examQuestion.deleteMany({
    where: {
      examId,
      questionId: { in: questionIds },
    },
  });

  return {
    message: `Successfully detached ${result.count} question(s) from exam`,
    detached: result.count,
  };
};

/**
 * Get questions for a specific exam
 */
export const getExamQuestions = async (examId: number, filter: GetExamQuestionsQuery) => {
  const { type } = filter;

  // Check if exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND, {
      examId,
      errorCode: ERROR_CODES.EXAM_NOT_FOUND,
    });
  }

  // Build where clause
  const where: Prisma.ExamQuestionWhereInput = {
    examId,
    ...(type && {
      question: {
        questionType: type,
      },
    }),
  };

  // Fetch questions
  const examQuestions = await prisma.examQuestion.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      question: {
        select: {
          id: true,
          content: true,
          questionType: true,
          defaultScore: true,
          options: true,
          correctAnswer: true,
        },
      },
    },
    orderBy: {
      orderNumber: 'asc',
    },
  });

  return examQuestions;
};