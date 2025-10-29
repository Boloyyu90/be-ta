import { Prisma, ProctoringEventType } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { NotFoundError, BusinessLogicError, UnauthorizedError, BadRequestError } from '@/shared/errors/app-errors';
import type {
  LogEventInput,
  LogEventsBatchInput,
  GetEventsQuery,
  GetAdminEventsQuery,
  DetectFaceInput,
  ProctoringEvent,
  ProctoringStatsResponse,
  FaceDetectionResult,
} from './proctoring.validation';

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate risk score based on proctoring events
 */
const calculateRiskScore = (
  events: Array<{ eventType: ProctoringEventType; severity: string }>
): { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } => {
  const weights: Record<ProctoringEventType, number> = {
    FACE_DETECTED: 0,
    NO_FACE_DETECTED: 20,
    MULTIPLE_FACES: 25,
    LOOKING_AWAY: 5,
  };

  const severityMultiplier: Record<string, number> = {
    LOW: 1.0,
    MEDIUM: 1.5,
    HIGH: 2.0,
  };

  let totalScore = 0;

  for (const event of events) {
    if (event.eventType === ProctoringEventType.FACE_DETECTED) {
      continue;
    }

    const baseWeight = weights[event.eventType] || 0;
    const multiplier = severityMultiplier[event.severity] || 1.0;
    totalScore += baseWeight * multiplier;
  }

  const normalizedScore = Math.min(100, totalScore);

  let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  if (normalizedScore < 20) level = 'LOW';
  else if (normalizedScore < 40) level = 'MEDIUM';
  else if (normalizedScore < 70) level = 'HIGH';
  else level = 'CRITICAL';

  return { score: Math.round(normalizedScore), level };
};

/**
 * Mock face detection analysis
 * TODO: Replace with actual YOLO/ML service integration
 */
const analyzeFaceDetection = async (
  imageBase64: string
): Promise<{
  detected: boolean;
  faceCount: number;
  confidence: number;
  headPose?: { yaw: number; pitch: number; roll: number };
  boundingBoxes: Array<{ x: number; y: number; width: number; height: number; confidence: number }>;
}> => {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    const random = Math.random();
    const detected = random > 0.15;
    const faceCount = random > 0.95 ? 2 : detected ? 1 : 0;
    const confidence = detected ? 0.75 + Math.random() * 0.23 : 0;

    const headPose = detected
      ? {
        yaw: -30 + Math.random() * 60,
        pitch: -20 + Math.random() * 40,
        roll: -10 + Math.random() * 20,
      }
      : undefined;

    const boundingBoxes =
      faceCount > 0
        ? Array.from({ length: faceCount }, (_, i) => ({
          x: 100 + i * 300 + Math.random() * 50,
          y: 80 + Math.random() * 40,
          width: 200 + Math.random() * 50,
          height: 250 + Math.random() * 50,
          confidence: 0.85 + Math.random() * 0.13,
        }))
        : [];

    return { detected, faceCount, confidence, headPose, boundingBoxes };
  } catch (error) {
    throw new BadRequestError(ERROR_MESSAGES.FAILED_TO_ANALYZE_IMAGE, {
      errorCode: ERROR_CODES.PROCTORING_DETECTION_FAILED,
    });
  }
};

// ==================== SERVICE FUNCTIONS ====================

/**
 * Log a single proctoring event
 */
export const logEvent = async (input: LogEventInput) => {
  const { userExamId, eventType, metadata, severity } = input;

  // Validate user exam exists and is active
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    select: {
      id: true,
      submittedAt: true,
      status: true,
    },
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.USER_EXAM_NOT_FOUND, {
      userExamId,
      errorCode: ERROR_CODES.SESSION_NOT_FOUND,
    });
  }

  // Prevent logging events for already submitted exams
  if (userExam.submittedAt) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.CANNOT_LOG_EVENT_SUBMITTED_EXAM,
      ERROR_CODES.SESSION_ALREADY_SUBMITTED,
      {
        userExamId,
        submittedAt: userExam.submittedAt,
      }
    );
  }

  // Create proctoring event
  const event = await prisma.proctoringEvent.create({
    data: {
      userExamId,
      eventType,
      metadata: metadata as Prisma.JsonObject,
      severity,
      timestamp: new Date(),
    },
  });

  return {
    message: 'Event logged successfully',
    event: {
      id: event.id,
      userExamId: event.userExamId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      metadata: event.metadata as Record<string, any> | null,
      severity: event.severity,
    },
  };
};

/**
 * Log multiple proctoring events in batch
 */
export const logEventsBatch = async (input: LogEventsBatchInput) => {
  const { events } = input;

  // Validate all user exams exist
  const userExamIds = [...new Set(events.map((e) => e.userExamId))];
  const userExams = await prisma.userExam.findMany({
    where: { id: { in: userExamIds } },
    select: { id: true, submittedAt: true },
  });

  if (userExams.length !== userExamIds.length) {
    const foundIds = userExams.map((ue) => ue.id);
    const missingIds = userExamIds.filter((id) => !foundIds.includes(id));
    throw new NotFoundError(ERROR_MESSAGES.ONE_OR_MORE_USER_EXAM_NOT_FOUND, {
      requestedIds: userExamIds,
      missingIds,
      errorCode: ERROR_CODES.SESSION_NOT_FOUND,
    });
  }

  // Check for submitted exams
  const submittedExams = userExams.filter((ue) => ue.submittedAt !== null);
  if (submittedExams.length > 0) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.CANNOT_LOG_EVENTS_SUBMITTED_EXAMS,
      ERROR_CODES.SESSION_ALREADY_SUBMITTED,
      {
        submittedExamIds: submittedExams.map((e) => e.id),
      }
    );
  }

  // Create events in batch
  await prisma.proctoringEvent.createMany({
    data: events.map((e) => ({
      userExamId: e.userExamId,
      eventType: e.eventType,
      metadata: (e.metadata as Prisma.JsonObject) || Prisma.JsonNull,
      severity: e.severity || 'LOW',
      timestamp: new Date(),
    })),
  });

  // Fetch created events
  const createdEvents = await prisma.proctoringEvent.findMany({
    where: { userExamId: { in: userExamIds } },
    orderBy: { timestamp: 'desc' },
    take: events.length,
  });

  return {
    message: `Successfully logged ${createdEvents.length} event(s)`,
    logged: createdEvents.length,
    events: createdEvents.map((e) => ({
      id: e.id,
      userExamId: e.userExamId,
      eventType: e.eventType,
      timestamp: e.timestamp,
      metadata: e.metadata as Record<string, any> | null,
      severity: e.severity,
    })),
  };
};

/**
 * Get proctoring events for a specific user exam
 */
export const getEvents = async (userExamId: number, userId: number, filter: GetEventsQuery) => {
  const { eventType, severity, page, limit } = filter;

  // Verify ownership
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    select: { userId: true },
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.USER_EXAM_NOT_FOUND, {
      userExamId,
      userId,
      errorCode: ERROR_CODES.SESSION_NOT_FOUND,
    });
  }

  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_VIEW_EVENTS, {
      userExamId,
      userId,
      ownerId: userExam.userId,
      errorCode: ERROR_CODES.PROCTORING_UNAUTHORIZED,
    });
  }

  // Build query filters
  const where: Prisma.ProctoringEventWhereInput = {
    userExamId,
    ...(eventType && { eventType }),
    ...(severity && { severity }),
  };

  const skip = (page - 1) * limit;

  const [events, total] = await Promise.all([
    prisma.proctoringEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: 'desc' },
    }),
    prisma.proctoringEvent.count({ where }),
  ]);

  const mappedEvents: ProctoringEvent[] = events.map((e) => ({
    id: e.id,
    userExamId: e.userExamId,
    eventType: e.eventType,
    timestamp: e.timestamp,
    metadata: e.metadata as Record<string, any> | null,
    severity: e.severity,
  }));

  return createPaginatedResponse(mappedEvents, page, limit, total);
};

/**
 * Get proctoring statistics for a user exam
 */
export const getStats = async (
  userExamId: number,
  userId: number
): Promise<ProctoringStatsResponse> => {
  // Verify ownership
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    include: {
      user: { select: { name: true } },
      exam: { select: { title: true } },
    },
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.USER_EXAM_NOT_FOUND, {
      userExamId,
      userId,
      errorCode: ERROR_CODES.SESSION_NOT_FOUND,
    });
  }

  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_VIEW_STATS, {
      userExamId,
      userId,
      ownerId: userExam.userId,
      errorCode: ERROR_CODES.PROCTORING_UNAUTHORIZED,
    });
  }

  // Fetch all events
  const events = await prisma.proctoringEvent.findMany({
    where: { userExamId },
    orderBy: { timestamp: 'asc' },
  });

  const totalEvents = events.length;

  const suspiciousEvents = events.filter(
    (e) => e.eventType !== ProctoringEventType.FACE_DETECTED
  );
  const suspiciousCount = suspiciousEvents.length;
  const suspiciousPercentage =
    totalEvents > 0 ? Math.round((suspiciousCount / totalEvents) * 100) : 0;

  // Group by event type
  const eventTypeMap = new Map<ProctoringEventType, number>();
  for (const event of events) {
    eventTypeMap.set(event.eventType, (eventTypeMap.get(event.eventType) || 0) + 1);
  }

  const eventsByType = Array.from(eventTypeMap.entries()).map(([type, count]) => ({
    eventType: type,
    count,
    percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
  }));

  // Group by severity
  const severityMap = new Map<string, number>();
  for (const event of events) {
    severityMap.set(event.severity, (severityMap.get(event.severity) || 0) + 1);
  }

  const eventsBySeverity = Array.from(severityMap.entries()).map(([severity, count]) => ({
    severity,
    count,
    percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
  }));

  // Timeline
  const timeline = events.slice(-50).map((e) => ({
    timestamp: e.timestamp,
    eventType: e.eventType,
    severity: e.severity,
  }));

  // Calculate risk score
  const { score: riskScore, level: riskLevel } = calculateRiskScore(
    events.map((e) => ({
      eventType: e.eventType,
      severity: e.severity,
    }))
  );

  return {
    userExamId,
    examTitle: userExam.exam.title,
    participantName: userExam.user.name,
    totalEvents,
    suspiciousCount,
    suspiciousPercentage,
    eventsByType,
    eventsBySeverity,
    timeline,
    riskScore,
    riskLevel,
  };
};

/**
 * Get all proctoring events (Admin only)
 */
export const getAdminEvents = async (filter: GetAdminEventsQuery) => {
  const { userExamId, examId, userId, eventType, severity, page, limit, sortBy, sortOrder } =
    filter;

  const where: Prisma.ProctoringEventWhereInput = {
    ...(userExamId && { userExamId }),
    ...(eventType && { eventType }),
    ...(severity && { severity }),
    ...(examId && { userExam: { examId } }),
    ...(userId && { userExam: { userId } }),
  };

  const skip = (page - 1) * limit;

  const orderBy: Prisma.ProctoringEventOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  const [events, total] = await Promise.all([
    prisma.proctoringEvent.findMany({
      where,
      include: {
        userExam: {
          select: {
            id: true,
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
      },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.proctoringEvent.count({ where }),
  ]);

  const mappedEvents = events.map((e) => ({
    id: e.id,
    userExamId: e.userExamId,
    eventType: e.eventType,
    timestamp: e.timestamp,
    metadata: e.metadata as Record<string, any> | null,
    severity: e.severity,
    userExam: e.userExam,
  }));

  return createPaginatedResponse(mappedEvents, page, limit, total);
};

/**
 * Process face detection from ML service
 */
export const detectFace = async (
  input: DetectFaceInput,
  userId: number
): Promise<FaceDetectionResult> => {
  const { userExamId, imageBase64, timestamp } = input;

  // Verify user exam exists and belongs to user
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    select: { userId: true, submittedAt: true },
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.USER_EXAM_NOT_FOUND, {
      userExamId,
      userId,
      errorCode: ERROR_CODES.SESSION_NOT_FOUND,
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
      ERROR_MESSAGES.CANNOT_PROCESS_DETECTION_SUBMITTED_EXAM,
      ERROR_CODES.SESSION_ALREADY_SUBMITTED,
      {
        userExamId,
        userId,
        submittedAt: userExam.submittedAt,
      }
    );
  }

  // Run face detection analysis
  const detection = await analyzeFaceDetection(imageBase64);

  const { detected, faceCount, confidence, headPose, boundingBoxes } = detection;

  // Determine event type and severity
  let eventType: ProctoringEventType;
  let severity: 'LOW' | 'MEDIUM' | 'HIGH';
  const warnings: string[] = [];

  if (!detected || faceCount === 0) {
    eventType = ProctoringEventType.NO_FACE_DETECTED;
    severity = 'HIGH';
    warnings.push('No face detected - user may have left seat');
  } else if (faceCount > 1) {
    eventType = ProctoringEventType.MULTIPLE_FACES;
    severity = 'HIGH';
    warnings.push(`Multiple faces detected (${faceCount})`);
  } else if (confidence < 0.7) {
    eventType = ProctoringEventType.LOOKING_AWAY;
    severity = 'MEDIUM';
    warnings.push('Low confidence detection - face may be obscured');
  } else if (headPose && (Math.abs(headPose.yaw) > 30 || Math.abs(headPose.pitch) > 25)) {
    eventType = ProctoringEventType.LOOKING_AWAY;
    severity = Math.abs(headPose.yaw) > 45 || Math.abs(headPose.pitch) > 35 ? 'HIGH' : 'MEDIUM';
    warnings.push(
      `Looking away detected (yaw: ${headPose.yaw.toFixed(1)}°, pitch: ${headPose.pitch.toFixed(1)}°)`
    );
  } else {
    eventType = ProctoringEventType.FACE_DETECTED;
    severity = 'LOW';
  }

  // Log the event
  const event = await prisma.proctoringEvent.create({
    data: {
      userExamId,
      eventType,
      severity,
      timestamp: new Date(timestamp),
      metadata: {
        faceCount,
        confidence: parseFloat(confidence.toFixed(3)),
        headPose: headPose
          ? {
            yaw: parseFloat(headPose.yaw.toFixed(2)),
            pitch: parseFloat(headPose.pitch.toFixed(2)),
            roll: parseFloat(headPose.roll.toFixed(2)),
          }
          : null,
        boundingBoxes: boundingBoxes.map((box) => ({
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          confidence: parseFloat(box.confidence.toFixed(3)),
        })),
      } as Prisma.JsonObject,
    },
  });

  return {
    detected,
    faceCount,
    confidence: parseFloat(confidence.toFixed(3)),
    headPose,
    boundingBoxes,
    warnings,
    eventLogged: true,
    event: {
      id: event.id,
      userExamId: event.userExamId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      metadata: event.metadata as Record<string, any> | null,
      severity: event.severity,
    },
  };
};