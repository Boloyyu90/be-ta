import { Prisma, ProctoringEventType } from '@prisma/client';
import { prisma } from '@/config/database';
import { env } from '@/config/env';
import {
  ERROR_MESSAGES,
  ERROR_CODES,
  ML_ERROR_MESSAGES,
  ML_ERROR_CODES,
  ML_CONFIG,
} from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { withTimeout, TimeoutError } from '@/shared/utils/timeout';
import { logger } from '@/shared/utils/logger';
import { NotFoundError, UnauthorizedError, BadRequestError } from '@/shared/errors/app-errors';
import { getFaceAnalyzer, MockFaceAnalyzer } from './ml/analyzer.factory';
import type {
  LogEventInput,
  GetEventsQuery,
  GetAdminEventsQuery
} from './proctoring.validation';

// ==================== PRISMA SELECT OBJECTS ====================

const PROCTORING_EVENT_SELECT = {
  id: true,
  userExamId: true,
  eventType: true,
  metadata: true,
  timestamp: true,
  severity: true, // ✅ Added
} as const;

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

// ==================== SERVICE FUNCTIONS ====================

/**
 * Log a proctoring event
 */
export const logEvent = async (input: LogEventInput) => {
  const { userExamId, eventType, metadata } = input;

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

  // ✅ Determine severity based on event type
  const severity = determineSeverity(eventType);

  const event = await prisma.proctoringEvent.create({
    data: {
      userExamId,
      eventType,
      severity,
      ...(metadata && { metadata: metadata as Prisma.InputJsonValue }),
      timestamp: new Date(),
    },
    select: PROCTORING_EVENT_SELECT,
  });

  return { event };
};

/**
 * Get proctoring events for a user exam
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
 * ✅ NEW: Enhanced with timeout, fallback, and graceful degradation
 *
 * @param userExamId - User exam ID
 * @param userId - Current user ID
 * @param imageBase64 - Base64 encoded image
 * @returns Analysis result
 */
export const analyzeFace = async (userExamId: number, userId: number, imageBase64: string) => {
  const startTime = Date.now();

  // Verify user exam exists and belongs to user
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

  // ✅ Get analyzer with fallback capability
  const analyzer = getFaceAnalyzer();
  let analysis;
  let usedFallback = false;

  try {
    // ✅ Apply timeout to prevent hanging
    analysis = await withTimeout(
      analyzer.analyze(imageBase64),
      env.ML_ANALYSIS_TIMEOUT_MS
    );

    logger.debug(
      {
        userExamId,
        status: analysis.status,
        violations: analysis.violations,
        confidence: analysis.confidence,
        processingTimeMs: Date.now() - startTime,
      },
      '✅ Face analysis completed'
    );

  } catch (error) {
    // ✅ Handle timeout gracefully
    if (error instanceof TimeoutError) {
      logger.warn(
        {
          userExamId,
          timeoutMs: env.ML_ANALYSIS_TIMEOUT_MS,
          elapsedMs: Date.now() - startTime,
        },
        '⏱️ Face analysis timeout, attempting fallback'
      );

      // Use fallback if enabled
      if (env.ML_FALLBACK_TO_MOCK) {
        usedFallback = true;
        const fallbackAnalyzer = new MockFaceAnalyzer('success');
        analysis = await fallbackAnalyzer.analyze(imageBase64);
      } else {
        // Return neutral result - don't block exam
        analysis = {
          status: 'timeout' as const,
          violations: [],
          confidence: 0,
          message: 'Analysis timeout - exam continues',
          metadata: {
            processingTimeMs: Date.now() - startTime,
            error: 'timeout',
          },
        };
      }
    } else {
      // ✅ Handle other errors gracefully
      logger.error(
        {
          error,
          userExamId,
          elapsedMs: Date.now() - startTime,
        },
        '❌ Face analysis error'
      );

      // Use fallback if enabled
      if (env.ML_FALLBACK_TO_MOCK) {
        usedFallback = true;
        const fallbackAnalyzer = new MockFaceAnalyzer('success');
        analysis = await fallbackAnalyzer.analyze(imageBase64);
      } else {
        // Return error result - don't block exam
        analysis = {
          status: 'error' as const,
          violations: [],
          confidence: 0,
          message: 'Analysis failed - exam continues',
          metadata: {
            processingTimeMs: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }
  }

  const hasViolations = analysis.violations.some(
    (v: string) => v !== 'FACE_DETECTED'  // ✅ Add type annotation
  );

  if (hasViolations) {
    const eventType = mapViolationToEventType(analysis.violations[0]);

    if (eventType) {
      const severity = determineSeverity(eventType);  // ✅ NOW SAFE

      const eventMetadata = {
        confidence: analysis.confidence,
        violations: analysis.violations,
        usedFallback,
        processingTimeMs: analysis.metadata?.processingTimeMs || 0,
        autoGenerated: true,
      } as Prisma.InputJsonValue;

      await prisma.proctoringEvent.create({
        data: {
          userExamId,
          eventType,
          severity,
          metadata: eventMetadata,
          timestamp: new Date(),
        },
      });

      logger.info(
        {
          userExamId,
          eventType,
          severity,
          violations: analysis.violations,
        },
        '📝 Proctoring violation logged'
      );
    }
  }

  return {
    analysis,
    eventLogged: hasViolations,
    eventType: hasViolations ? mapViolationToEventType(analysis.violations[0]) : null,
    usedFallback,
  };
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Map violation type to proctoring event type
 */
const mapViolationToEventType = (violation: string): ProctoringEventType | null => {
  switch (violation) {
    case 'NO_FACE_DETECTED':
      return ProctoringEventType.NO_FACE_DETECTED;
    case 'MULTIPLE_FACES':
      return ProctoringEventType.MULTIPLE_FACES;
    case 'LOOKING_AWAY':
      return ProctoringEventType.LOOKING_AWAY;
    default:
      return null;
  }
};

/**
 * Determine severity based on event type
 */
const determineSeverity = (eventType: ProctoringEventType): string => {
  switch (eventType) {
    case ProctoringEventType.NO_FACE_DETECTED:
      return 'HIGH';
    case ProctoringEventType.MULTIPLE_FACES:
      return 'HIGH';
    case ProctoringEventType.LOOKING_AWAY:
      return 'MEDIUM';
    case ProctoringEventType.FACE_DETECTED:
      return 'LOW';
    default:
      return 'LOW';
  }
};