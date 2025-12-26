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

/**
 * Basic exam data for public listing
 */
const EXAM_PUBLIC_SELECT = {
  id: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  durationMinutes: true,
  passingScore: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  allowRetake: true,
  maxAttempts: true,
  _count: {
    select: {
      examQuestions: true,
    },
  },
} as const;

/**
 * Detailed exam data with relationships
 */
const EXAM_DETAIL_SELECT = {
  id: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  durationMinutes: true,
  passingScore: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  allowRetake: true,
  maxAttempts: true,
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

/**
 * Exam with questions
 */
const EXAM_WITH_QUESTIONS_SELECT = {
  id: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  durationMinutes: true,
  passingScore: true,      // ← ADD THIS LINE
  createdBy: true,
  createdAt: true,
  updatedAt: true,
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
          options: true,
          correctAnswer: true,
        },
      },
    },
    orderBy: {
      orderNumber: 'asc' as const,
    },
  },
} as const;


// ==================== HELPER FUNCTIONS ====================

/**
 * Verify exam ownership
 * Throws ForbiddenError if user is not the creator
 */
const verifyOwnership = async (examId: number, userId: number) => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { createdBy: true },
  });

  if (!exam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND, {
      examId,
      errorCode: ERROR_CODES.EXAM_NOT_FOUND,
    });
  }

  if (exam.createdBy !== userId) {
    throw new ForbiddenError(ERROR_MESSAGES.NOT_EXAM_CREATOR, {
      examId,
      userId,
      createdBy: exam.createdBy,
      errorCode: ERROR_CODES.EXAM_NOT_CREATOR,
    });
  }

  return exam;
};

/**
 * Check if exam has active sessions
 */
const hasActiveSessions = async (examId: number): Promise<boolean> => {
  const count = await prisma.userExam.count({
    where: {
      examId,
      status: 'IN_PROGRESS',
    },
  });

  return count > 0;
};

/**
 * Check if exam can be deleted
 */
const canDeleteExam = async (examId: number): Promise<{ canDelete: boolean; reason?: string; attempts?: number }> => {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      _count: {
        select: {
          userExams: true,
        },
      },
    },
  });

  if (!exam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND, {
      examId,
      errorCode: ERROR_CODES.EXAM_NOT_FOUND,
    });
  }

  if (exam._count.userExams > 0) {
    return {
      canDelete: false,
      reason: 'Exam has participant attempts',
      attempts: exam._count.userExams,
    };
  }

  return { canDelete: true };
};

// ==================== SERVICE FUNCTIONS ====================
/**
 * Create a new exam (Admin only)
 *
 * @param userId - Creator user ID
 * @param input - Exam creation data
 * @returns Created exam data
 * @throws {ConflictError} If exam title already exists for user
 */
export const createExam = async (userId: number, input: CreateExamInput) => {
  const { title, description, startTime, endTime, durationMinutes, passingScore, allowRetake, maxAttempts } = input;

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
      passingScore: passingScore ?? 0,
      allowRetake: allowRetake ?? false,
      maxAttempts: maxAttempts || null,
      createdBy: userId,
    },
    select: EXAM_DETAIL_SELECT,
  });

  return exam;
};

/**
 * Get list of exams with filters and pagination
 *
 * @param filter - Query filters
 * @param isAdmin - Whether user is admin
 * @param userId - Current user ID (for filtering own exams)
 * @returns Paginated list of exams
 */
export const getExams = async (filter: GetExamsQuery, isAdmin: boolean = false, userId?: number) => {
  const { page, limit, search, sortBy, sortOrder, createdBy } = filter;

  // Build where clause
  const where: Prisma.ExamWhereInput = {
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    // Admin can filter by creator
    ...(isAdmin && createdBy && { createdBy }),
    // Participants only see exams with questions
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
 *
 * @param id - Exam ID
 * @param includeQuestions - Whether to include questions (admin view)
 * @param userId - Current user ID (for participant attempts info)
 * @returns Exam data with attempts info for participants
 * @throws {NotFoundError} If exam not found
 */
export const getExamById = async (id: number, includeQuestions: boolean = false, userId?: number) => {
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

  // For participants, include attempts information
  if (!includeQuestions && userId) {
    const attempts = await prisma.userExam.findMany({
      where: {
        userId,
        examId: id,
        status: { in: ['FINISHED', 'TIMEOUT', 'CANCELLED'] },
      },
      orderBy: {
        attemptNumber: 'asc',
      },
      select: {
        id: true,
        attemptNumber: true,
        totalScore: true,
        status: true,
        startedAt: true,
        submittedAt: true,
      },
    });

    const attemptsCount = attempts.length;
    const firstAttempt = attempts.length > 0 ? attempts[0] : null;
    const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

    return {
      exam,
      attemptsCount,
      firstAttempt,
      latestAttempt,
    };
  }

  return { exam };
};

/**
 * Update exam by ID
 * Only creator can update
 *
 * @param id - Exam ID
 * @param userId - Current user ID
 * @param data - Update data
 * @returns Updated exam data
 * @throws {NotFoundError} If exam not found
 * @throws {ForbiddenError} If user is not creator
 * @throws {BusinessLogicError} If updating duration with active sessions
 */
export const updateExam = async (id: number, userId: number, data: UpdateExamInput) => {
  // Verify ownership
  await verifyOwnership(id, userId);

  // Check if exam has active sessions when updating duration
  if (data.durationMinutes) {
    const hasActive = await hasActiveSessions(id);
    if (hasActive) {
      throw new BusinessLogicError(
        ERROR_MESSAGES.CANNOT_UPDATE_ACTIVE_EXAM_DURATION,
        ERROR_CODES.EXAM_CANNOT_UPDATE,
        {
          examId: id,
          attemptedChange: 'durationMinutes',
        }
      );
    }
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
 * Only creator can delete
 * Cannot delete exam with participant attempts
 *
 * @param id - Exam ID
 * @param userId - Current user ID
 * @returns Success indicator
 * @throws {NotFoundError} If exam not found
 * @throws {ForbiddenError} If user is not creator
 * @throws {BusinessLogicError} If exam has attempts
 */
export const deleteExam = async (id: number, userId: number) => {
  // Verify ownership
  await verifyOwnership(id, userId);

  // Check if exam can be deleted
  const { canDelete, reason, attempts } = await canDeleteExam(id);

  if (!canDelete) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.CANNOT_DELETE_EXAM_WITH_ATTEMPTS,
      ERROR_CODES.EXAM_CANNOT_DELETE,
      {
        examId: id,
        reason,
        attempts,
      }
    );
  }

  // Delete exam (cascade will handle exam_questions)
  await prisma.exam.delete({
    where: { id },
  });

  return { success: true };
};

/**
 * Attach questions to exam
 *
 * @param examId - Exam ID
 * @param userId - Current user ID
 * @param input - Question IDs to attach
 * @returns Attach result with counts
 * @throws {NotFoundError} If exam or questions not found
 * @throws {ForbiddenError} If user is not creator
 */
export const attachQuestions = async (examId: number, userId: number, input: AttachQuestionsInput) => {
  const { questionIds } = input;

  // Verify ownership
  await verifyOwnership(examId, userId);

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
      attached: 0,
      alreadyAttached: existingQuestionIds.length,
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
    attached: newQuestionIds.length,
    alreadyAttached: existingQuestionIds.length,
  };
};

/**
 * Detach questions from exam
 *
 * @param examId - Exam ID
 * @param userId - Current user ID
 * @param input - Question IDs to detach
 * @returns Detach result with count
 * @throws {NotFoundError} If exam not found
 * @throws {ForbiddenError} If user is not creator
 */
export const detachQuestions = async (examId: number, userId: number, input: DetachQuestionsInput) => {
  const { questionIds } = input;

  // Verify ownership
  await verifyOwnership(examId, userId);

  // Delete exam questions
  const result = await prisma.examQuestion.deleteMany({
    where: {
      examId,
      questionId: { in: questionIds },
    },
  });

  return {
    detached: result.count,
  };
};

/**
 * Get questions for a specific exam
 *
 * @param examId - Exam ID
 * @param userId - Current user ID
 * @param filter - Question filters
 * @returns List of exam questions
 * @throws {NotFoundError} If exam not found
 * @throws {ForbiddenError} If user is not creator
 */
export const getExamQuestions = async (examId: number, userId: number, filter: GetExamQuestionsQuery) => {
  const { type } = filter;

  // Verify ownership
  await verifyOwnership(examId, userId);

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
