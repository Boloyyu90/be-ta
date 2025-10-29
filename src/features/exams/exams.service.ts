import { Prisma } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { logger } from '@/shared/utils/logger';
import { NotFoundError, ConflictError, BusinessLogicError, ForbiddenError, BadRequestError } from '@/shared/errors/app-errors';
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
 *
 * Business rules:
 * - Title must be unique per creator (soft constraint, not enforced by DB)
 * - Duration is required for timer functionality
 * - startTime and endTime are optional for scheduled exams
 *
 * @param userId - ID of the admin creating the exam
 * @param input - Exam data
 * @returns Created exam with creator details
 */
export const createExam = async (userId: number, input: CreateExamInput) => {
  const { title, description, startTime, endTime, durationMinutes } = input;

  logger.info({ userId, title }, 'Creating new exam');

  // Optional: Check for duplicate title by same creator
  // This is a soft check, you can remove if not needed
  const existingExam = await prisma.exam.findFirst({
    where: {
      createdBy: userId,
      title: {
        equals: title,
        mode: 'insensitive', // Case-insensitive comparison
      },
    },
  });

  if (existingExam) {
    logger.warn({ userId, title }, 'Exam creation failed - duplicate title');
    throw new ConflictError(`${ERROR_MESSAGES.DUPLICATE_EXAM_TITLE}: "${title}"`);
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

  logger.info({ examId: exam.id, title }, 'Exam created successfully');

  return exam;
};

/**
 * Get list of exams with filters and pagination
 *
 * For Admin: Returns all exams
 * For Participant: Returns only published/available exams (can be filtered)
 *
 * @param filter - Query parameters for filtering and pagination
 * @param isAdmin - Whether requester is admin
 * @returns Paginated list of exams
 */
export const getExams = async (filter: GetExamsQuery, isAdmin: boolean = false) => {
  const { page, limit, search, sortBy, sortOrder } = filter;

  logger.debug({ filter, isAdmin }, 'Fetching exams list');

  // Build where clause
  const where: Prisma.ExamWhereInput = {
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    // For participants, only show exams that are "available"
    // You can define "available" as you like, for now: has questions and not ended
    ...(!isAdmin && {
      examQuestions: {
        some: {}, // Has at least one question
      },
      // Optional: Filter by time (not ended yet)
      // endTime: {
      //   gte: new Date(), // End time is in the future or null
      // },
    }),
  };

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Determine sort field
  const orderBy: Prisma.ExamOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  // Execute queries in parallel
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

  logger.info({ total, page, limit, isAdmin }, 'Exams fetched successfully');

  return createPaginatedResponse(exams, page, limit, total);
};

/**
 * Get single exam by ID with full details
 *
 * @param id - Exam ID
 * @param includeQuestions - Whether to include questions list
 * @returns Exam details with creator and counts
 */
export const getExamById = async (id: number, includeQuestions: boolean = false) => {
  logger.debug({ examId: id, includeQuestions }, 'Fetching exam by ID');

  const exam = await prisma.exam.findUnique({
    where: { id },
    select: includeQuestions ? EXAM_WITH_QUESTIONS_SELECT : EXAM_DETAIL_SELECT,
  });

  if (!exam) {
    logger.warn({ examId: id }, 'Exam not found');
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND);
  }

  logger.info({ examId: id }, 'Exam fetched successfully');

  return exam;
};

/**
 * Update exam by ID
 *
 * Business rules:
 * - Only creator (admin) can update
 * - Cannot update if exam has active sessions (optional constraint)
 *
 * @param id - Exam ID
 * @param userId - ID of admin updating (for authorization)
 * @param data - Fields to update
 * @returns Updated exam
 */
export const updateExam = async (id: number, userId: number, data: UpdateExamInput) => {
  logger.info({ examId: id, userId, updates: Object.keys(data) }, 'Updating exam');

  // Check if exam exists and user is the creator
  const existingExam = await prisma.exam.findUnique({
    where: { id },
  });

  if (!existingExam) {
    logger.warn({ examId: id }, 'Exam update failed - exam not found');
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND);
  }

  // Authorization check: only creator can update
  if (existingExam.createdBy !== userId) {
    logger.warn({ examId: id, userId }, 'Exam update failed - not creator');
    throw new ForbiddenError(ERROR_MESSAGES.NOT_EXAM_CREATOR);
  }

  // Optional: Check if exam has active sessions
  // If yes, prevent certain updates (like duration change)
  const hasActiveSessions = await prisma.userExam.count({
    where: {
      examId: id,
      status: 'IN_PROGRESS',
    },
  });

  if (hasActiveSessions > 0 && data.durationMinutes) {
    logger.warn({ examId: id }, 'Cannot update duration - has active sessions');
    throw new BusinessLogicError(ERROR_MESSAGES.CANNOT_UPDATE_ACTIVE_EXAM_DURATION);
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

  logger.info({ examId: id }, 'Exam updated successfully');

  return exam;
};

/**
 * Delete exam by ID
 *
 * Business rules:
 * - Only creator can delete
 * - Cannot delete if exam has completed sessions (data preservation)
 * - Cascade will delete exam_questions (but not the questions themselves)
 *
 * @param id - Exam ID
 * @param userId - ID of admin deleting
 * @returns Success message
 */
export const deleteExam = async (id: number, userId: number) => {
  logger.info({ examId: id, userId }, 'Deleting exam');

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
    logger.warn({ examId: id }, 'Exam deletion failed - exam not found');
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND);
  }

  if (existingExam.createdBy !== userId) {
    logger.warn({ examId: id, userId }, 'Exam deletion failed - not creator');
    throw new ForbiddenError(ERROR_MESSAGES.CANNOT_DELETE_EXAM_NOT_CREATOR);
  }

  // Prevent deletion if exam has been taken
  if (existingExam._count.userExams > 0) {
    logger.warn({ examId: id, attempts: existingExam._count.userExams }, 'Cannot delete exam with attempts');
    throw new BusinessLogicError(
      `${ERROR_MESSAGES.CANNOT_DELETE_EXAM_WITH_ATTEMPTS} (${existingExam._count.userExams} attempt(s))`
    );
  }

  // Delete exam (cascade will handle exam_questions)
  await prisma.exam.delete({
    where: { id },
  });

  logger.info({ examId: id }, 'Exam deleted successfully');

  return { message: 'Exam deleted successfully' };
};

/**
 * Attach questions to exam
 *
 * Creates ExamQuestion records with auto-incrementing orderNumber
 * Prevents duplicate questions in same exam
 *
 * @param examId - Exam ID
 * @param input - List of question IDs to attach
 * @returns Count of attached questions
 */
export const attachQuestions = async (examId: number, input: AttachQuestionsInput) => {
  const { questionIds } = input;

  logger.info({ examId, questionCount: questionIds.length }, 'Attaching questions to exam');

  // Check if exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    logger.warn({ examId }, 'Attach questions failed - exam not found');
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND);
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
    logger.warn({ examId, missingIds }, 'Some questions not found');
    throw new NotFoundError(`${ERROR_MESSAGES.QUESTIONS_NOT_FOUND}: ${missingIds.join(', ')}`);
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
    logger.info({ examId }, 'All questions already attached');
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

  logger.info({ examId, attached: newQuestionIds.length }, 'Questions attached successfully');

  return {
    message: `Successfully attached ${newQuestionIds.length} question(s) to exam`,
    attached: newQuestionIds.length,
  };
};

/**
 * Detach questions from exam
 *
 * Removes ExamQuestion records
 * Does not delete the questions themselves from question bank
 *
 * @param examId - Exam ID
 * @param input - List of question IDs to detach
 * @returns Count of detached questions
 */
export const detachQuestions = async (examId: number, input: DetachQuestionsInput) => {
  const { questionIds } = input;

  logger.info({ examId, questionCount: questionIds.length }, 'Detaching questions from exam');

  // Check if exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    logger.warn({ examId }, 'Detach questions failed - exam not found');
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND);
  }

  // Delete exam questions
  const result = await prisma.examQuestion.deleteMany({
    where: {
      examId,
      questionId: { in: questionIds },
    },
  });

  logger.info({ examId, detached: result.count }, 'Questions detached successfully');

  return {
    message: `Successfully detached ${result.count} question(s) from exam`,
    detached: result.count,
  };
};

/**
 * Get questions for a specific exam
 *
 * Optionally filter by question type
 *
 * @param examId - Exam ID
 * @param filter - Query filters
 * @returns List of questions with order
 */
export const getExamQuestions = async (examId: number, filter: GetExamQuestionsQuery) => {
  const { type } = filter;

  logger.debug({ examId, type }, 'Fetching exam questions');

  // Check if exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    logger.warn({ examId }, 'Get exam questions failed - exam not found');
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND);
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
          correctAnswer: true, // Admin can see correct answer
        },
      },
    },
    orderBy: {
      orderNumber: 'asc',
    },
  });

  logger.info({ examId, count: examQuestions.length }, 'Exam questions fetched successfully');

  return examQuestions;
};