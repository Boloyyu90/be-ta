import { Prisma, ProctoringEventType } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { NotFoundError, UnauthorizedError, BadRequestError } from '@/shared/errors/app-errors';
import type { LogEventInput, GetEventsQuery, GetAdminEventsQuery } from './proctoring.validation';

// ==================== PRISMA SELECT OBJECTS ====================

/**
 * Standard proctoring event select object
 */
const PROCTORING_EVENT_SELECT = {
  id: true,
  userExamId: true,
  eventType: true,
  metadata: true,
  timestamp: true,
} as const;

/**
 * Detailed event with user exam info
 */
const PROCTORING_EVENT_WITH_EXAM_SELECT = {
  ...PROCTORING_EVENT_SELECT,
  userExam: {
    select: {
      id: true,
      userId: true,
      examId: true,
      status: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      exam: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  },
} as const;

// ==================== ML MOCK SERVICE ====================

/**
 * Mock face detection analysis
 * Simulates ML model response
 *
 * @param imageBase64 - Base64 encoded image
 * @returns Analysis result with confidence scores
 */
const analyzeFaceDetectionMock = async (imageBase64: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    if (!imageBase64 || imageBase64.length < 100) {
      throw new Error('Invalid image data');
    }

    const random = Math.random();

    if (random < 0.1) {
      return {
        faceDetected: false,
        faceCount: 0,
        confidence: 0,
        lookingAway: false,
        message: 'No face detected in the image',
      };
    } else if (random < 0.2) {
      return {
        faceDetected: true,
        faceCount: Math.floor(Math.random() * 3) + 2,
        confidence: 0.85 + Math.random() * 0.1,
        lookingAway: false,
        message: 'Multiple faces detected',
      };
    } else if (random < 0.3) {
      return {
        faceDetected: true,
        faceCount: 1,
        confidence: 0.8 + Math.random() * 0.15,
        lookingAway: true,
        message: 'User appears to be looking away',
      };
    } else {
      return {
        faceDetected: true,
        faceCount: 1,
        confidence: 0.9 + Math.random() * 0.1,
        lookingAway: false,
        message: 'Face detected successfully',
      };
    }
  } catch (error) {
    throw new BadRequestError(ERROR_MESSAGES.FAILED_TO_ANALYZE_IMAGE, {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: ERROR_CODES.PROCTORING_ANALYSIS_FAILED,
    });
  }
};

// ==================== SERVICE FUNCTIONS ====================

/**
 * Log a proctoring event
 *
 * @param input - Event data
 * @returns Created event
 */
export const logEvent = async (input: LogEventInput) => {
  const { userExamId, eventType, metadata } = input; // ✅ CHANGED: destructure metadata directly

  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    select: { id: true, status: true },
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.USER_EXAM_NOT_FOUND, {
      userExamId,
      errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
    });
  }

  // ✅ CHANGED: Use metadata directly without mapping
  const event = await prisma.proctoringEvent.create({
    data: {
      userExamId,
      eventType,
      ...(metadata && { metadata: metadata as Prisma.InputJsonValue }),
      timestamp: new Date(),
    },
    select: PROCTORING_EVENT_SELECT,
  });

  return { event };
};

/**
 * Get proctoring events for a user exam
 * Only the exam participant can view their own events
 *
 * @param userExamId - User exam ID
 * @param userId - Current user ID
 * @param filter - Event filters
 * @returns Paginated list of events
 */
export const getEvents = async (userExamId: number, userId: number, filter: GetEventsQuery) => {
  const { page, limit, eventType, startDate, endDate, sortOrder } = filter;

  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    select: { userId: true },
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.USER_EXAM_NOT_FOUND, {
      userExamId,
      errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
    });
  }

  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_VIEW_EVENTS, {
      userExamId,
      userId,
      errorCode: ERROR_CODES.EXAM_SESSION_UNAUTHORIZED,
    });
  }

  const where: Prisma.ProctoringEventWhereInput = {
    userExamId,
    ...(eventType && { eventType }),
  };

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const orderBy: Prisma.ProctoringEventOrderByWithRelationInput = {
    timestamp: sortOrder,
  };

  const [events, total] = await Promise.all([
    prisma.proctoringEvent.findMany({
      where,
      select: PROCTORING_EVENT_SELECT,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.proctoringEvent.count({ where }),
  ]);

  return createPaginatedResponse(events, page, limit, total);
};

/**
 * Get all proctoring events (Admin only)
 *
 * @param filter - Event filters
 * @returns Paginated list of events with user/exam info
 */
export const getAdminEvents = async (filter: GetAdminEventsQuery) => {
  const { page, limit, eventType, startDate, endDate, sortOrder, userExamId } = filter;

  const where: Prisma.ProctoringEventWhereInput = {
    ...(eventType && { eventType }),
    ...(userExamId && { userExamId }),
  };

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate);
    if (endDate) where.timestamp.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const orderBy: Prisma.ProctoringEventOrderByWithRelationInput = {
    timestamp: sortOrder,
  };

  const [events, total] = await Promise.all([
    prisma.proctoringEvent.findMany({
      where,
      select: PROCTORING_EVENT_WITH_EXAM_SELECT,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.proctoringEvent.count({ where }),
  ]);

  return createPaginatedResponse(events, page, limit, total);
};

/**
 * Analyze face detection from webcam image
 *
 * @param userExamId - User exam ID
 * @param userId - Current user ID
 * @param imageBase64 - Base64 encoded image
 * @returns Analysis result
 */
export const analyzeFace = async (userExamId: number, userId: number, imageBase64: string) => {
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    select: { userId: true, status: true },
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.USER_EXAM_NOT_FOUND, {
      userExamId,
      errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
    });
  }

  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_EXAM_SESSION, {
      userExamId,
      userId,
      errorCode: ERROR_CODES.EXAM_SESSION_UNAUTHORIZED,
    });
  }

  const analysis = await analyzeFaceDetectionMock(imageBase64);

  let eventType: ProctoringEventType | null = null;

  if (!analysis.faceDetected) {
    eventType = ProctoringEventType.NO_FACE_DETECTED;
  } else if (analysis.faceCount > 1) {
    eventType = ProctoringEventType.MULTIPLE_FACES;
  } else if (analysis.lookingAway) {
    eventType = ProctoringEventType.LOOKING_AWAY;
  }

  // ✅ CHANGED: Use metadata consistently
  if (eventType) {
    const eventMetadata = {
      ...analysis,
      autoGenerated: true,
    } as Prisma.InputJsonValue;

    await prisma.proctoringEvent.create({
      data: {
        userExamId,
        eventType,
        metadata: eventMetadata,
        timestamp: new Date(),
      },
    });
  }

  return {
    analysis,
    eventLogged: eventType !== null,
    eventType,
  };
};