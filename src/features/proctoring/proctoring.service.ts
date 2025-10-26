import { Prisma, ProctoringEventType } from '@prisma/client';
import { prisma } from '@/config/database';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { logger } from '@/shared/utils/logger';
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
 * Calculate risk score based on events
 */
const calculateRiskScore = (
  events: Array<{ eventType: ProctoringEventType; severity: string }>
): { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } => {
  const weights: Record<ProctoringEventType, number> = {
    FACE_DETECTED: 0,
    NO_FACE_DETECTED: 15,
    MULTIPLE_FACES: 20,
    LOOKING_AWAY: 5,
    TAB_SWITCH: 10,
    COPY_PASTE: 15,
    RIGHT_CLICK: 5,
    FULLSCREEN_EXIT: 10,
    SUSPICIOUS_BEHAVIOR: 25,
  };

  const severityMultiplier: Record<string, number> = {
    LOW: 1.0,
    MEDIUM: 1.2,
    HIGH: 1.5,
  };

  let totalScore = 0;

  for (const event of events) {
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
 * Analyze image for face detection
 * TODO: Replace with actual YOLO/ML integration
 */
const analyzeFaceDetection = async (
  imageBase64: string
): Promise<{
  detected: boolean;
  faceCount: number;
  confidence: number;
  boundingBoxes: Array<{ x: number; y: number; width: number; height: number; confidence: number }>;
}> => {
  logger.info('Running face detection analysis');

  try {
    // Mock implementation - replace with actual ML inference
    const mockResult = {
      detected: Math.random() > 0.2,
      faceCount: Math.random() > 0.9 ? 2 : 1,
      confidence: 0.85 + Math.random() * 0.15,
      boundingBoxes: [
        {
          x: 100 + Math.random() * 50,
          y: 80 + Math.random() * 40,
          width: 200 + Math.random() * 50,
          height: 250 + Math.random() * 50,
          confidence: 0.9 + Math.random() * 0.1,
        },
      ],
    };

    logger.info(
      { detected: mockResult.detected, faceCount: mockResult.faceCount },
      'Face detection completed'
    );

    return mockResult;
  } catch (error) {
    logger.error({ error }, 'Face detection failed');
    throw new Error('Failed to analyze image');
  }
};

// ==================== SERVICE FUNCTIONS ====================

export const logEvent = async (input: LogEventInput) => {
  const { userExamId, eventType, metadata, severity } = input;

  logger.debug({ userExamId, eventType }, 'Logging proctoring event');

  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
  });

  if (!userExam) {
    throw new Error('User exam not found');
  }

  const event = await prisma.proctoringEvent.create({
    data: {
      userExamId,
      eventType,
      metadata: metadata as Prisma.JsonObject,
      severity,
      timestamp: new Date(),
    },
  });

  logger.info({ eventId: event.id }, 'Event logged');

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

export const logEventsBatch = async (input: LogEventsBatchInput) => {
  const { events } = input;

  logger.info({ count: events.length }, 'Logging batch events');

  const userExamIds = [...new Set(events.map((e) => e.userExamId))];
  const userExams = await prisma.userExam.findMany({
    where: { id: { in: userExamIds } },
    select: { id: true },
  });

  if (userExams.length !== userExamIds.length) {
    throw new Error('One or more user exams not found');
  }

  const createdEvents = await prisma.proctoringEvent.createMany({
    data: events.map((e) => ({
      userExamId: e.userExamId,
      eventType: e.eventType,
      metadata: (e.metadata as Prisma.JsonObject) || undefined,
      severity: e.severity || 'LOW',
      timestamp: new Date(),
    })),
  });

  const fetchedEvents = await prisma.proctoringEvent.findMany({
    where: { userExamId: { in: userExamIds } },
    orderBy: { timestamp: 'desc' },
    take: events.length,
  });

  logger.info({ logged: createdEvents.count }, 'Batch logged');

  return {
    message: `Successfully logged ${createdEvents.count} event(s)`,
    logged: createdEvents.count,
    events: fetchedEvents.map((e) => ({
      id: e.id,
      userExamId: e.userExamId,
      eventType: e.eventType,
      timestamp: e.timestamp,
      metadata: e.metadata as Record<string, any> | null,
      severity: e.severity,
    })),
  };
};

export const getEvents = async (userExamId: number, filter: GetEventsQuery) => {
  const { eventType, severity, page, limit } = filter;

  logger.debug({ userExamId, filter }, 'Fetching events');

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

export const getStats = async (userExamId: number): Promise<ProctoringStatsResponse> => {
  logger.debug({ userExamId }, 'Calculating stats');

  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
  });

  if (!userExam) {
    throw new Error('User exam not found');
  }

  const events = await prisma.proctoringEvent.findMany({
    where: { userExamId },
    orderBy: { timestamp: 'asc' },
  });

  const totalEvents = events.length;

  const suspiciousEvents = events.filter(
    (e) =>
      e.eventType !== ProctoringEventType.FACE_DETECTED &&
      e.eventType !== ProctoringEventType.RIGHT_CLICK
  );
  const suspiciousCount = suspiciousEvents.length;
  const suspiciousPercentage =
    totalEvents > 0 ? Math.round((suspiciousCount / totalEvents) * 100) : 0;

  const eventTypeMap = new Map<ProctoringEventType, number>();
  for (const event of events) {
    eventTypeMap.set(event.eventType, (eventTypeMap.get(event.eventType) || 0) + 1);
  }

  const eventsByType = Array.from(eventTypeMap.entries()).map(([type, count]) => ({
    eventType: type,
    count,
    percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
  }));

  const severityMap = new Map<string, number>();
  for (const event of events) {
    severityMap.set(event.severity, (severityMap.get(event.severity) || 0) + 1);
  }

  const eventsBySeverity = Array.from(severityMap.entries()).map(([severity, count]) => ({
    severity,
    count,
    percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
  }));

  const timeline = events.slice(-50).map((e) => ({
    timestamp: e.timestamp,
    eventType: e.eventType,
    severity: e.severity,
  }));

  const { score: riskScore, level: riskLevel } = calculateRiskScore(
    events.map((e) => ({
      eventType: e.eventType,
      severity: e.severity,
    }))
  );

  logger.info({ userExamId, riskScore, riskLevel }, 'Stats calculated');

  return {
    userExamId,
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

export const getAdminEvents = async (filter: GetAdminEventsQuery) => {
  const { userExamId, examId, userId, eventType, severity, page, limit, sortBy, sortOrder } =
    filter;

  logger.debug({ filter }, 'Fetching admin events');

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

export const detectFace = async (input: DetectFaceInput): Promise<FaceDetectionResult> => {
  const { userExamId, imageBase64, timestamp } = input;

  logger.info({ userExamId }, 'Processing face detection');

  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
  });

  if (!userExam) {
    throw new Error('User exam not found');
  }

  if (userExam.submittedAt) {
    throw new Error('Cannot process for submitted exam');
  }

  const detection = await analyzeFaceDetection(imageBase64);

  const { detected, faceCount, confidence, boundingBoxes } = detection;

  let eventType: ProctoringEventType;
  let severity: 'LOW' | 'MEDIUM' | 'HIGH';
  const warnings: string[] = [];

  if (!detected || faceCount === 0) {
    eventType = ProctoringEventType.NO_FACE_DETECTED;
    severity = 'HIGH';
    warnings.push('No face detected');
  } else if (faceCount > 1) {
    eventType = ProctoringEventType.MULTIPLE_FACES;
    severity = 'HIGH';
    warnings.push(`Multiple faces (${faceCount})`);
  } else if (confidence < 0.7) {
    eventType = ProctoringEventType.LOOKING_AWAY;
    severity = 'MEDIUM';
    warnings.push('Low confidence');
  } else {
    eventType = ProctoringEventType.FACE_DETECTED;
    severity = 'LOW';
  }

  const event = await prisma.proctoringEvent.create({
    data: {
      userExamId,
      eventType,
      severity,
      timestamp: new Date(timestamp),
      metadata: {
        faceCount,
        confidence,
        boundingBoxes,
      } as Prisma.JsonObject,
    },
  });

  logger.info({ eventId: event.id, eventType }, 'Face detection logged');

  return {
    detected,
    faceCount,
    confidence,
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