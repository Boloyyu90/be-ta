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
 * Calculate risk score based on proctoring events
 * Algorithm considers frequency and severity of violations
 */
const calculateRiskScore = (
  events: Array<{ eventType: ProctoringEventType; severity: string }>
): { score: number; level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } => {
  // Base weights for each event type (0-100 scale)
  const weights: Record<ProctoringEventType, number> = {
    FACE_DETECTED: 0, // Positive event, no penalty
    NO_FACE_DETECTED: 20, // High concern - user absent
    MULTIPLE_FACES: 25, // Very high concern - potential helper
    LOOKING_AWAY: 5, // Minor concern - could be thinking
  };

  // Severity multipliers
  const severityMultiplier: Record<string, number> = {
    LOW: 1.0,
    MEDIUM: 1.5,
    HIGH: 2.0,
  };

  let totalScore = 0;

  // Calculate weighted score
  for (const event of events) {
    // Skip positive events
    if (event.eventType === ProctoringEventType.FACE_DETECTED) {
      continue;
    }

    const baseWeight = weights[event.eventType] || 0;
    const multiplier = severityMultiplier[event.severity] || 1.0;
    totalScore += baseWeight * multiplier;
  }

  // Normalize to 0-100 scale
  const normalizedScore = Math.min(100, totalScore);

  // Determine risk level based on thresholds
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
 *
 * This mock implementation simulates realistic detection scenarios:
 * - 85% chance of detecting face when present
 * - 5% chance of detecting multiple faces
 * - 10% chance of detecting looking away behavior
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
  logger.info('Running face detection analysis (MOCK)');

  // Simulate processing delay (real ML inference takes 300-800ms)
  await new Promise((resolve) => setTimeout(resolve, 300));

  try {
    // Mock detection logic with realistic probabilities
    const random = Math.random();

    // 85% chance face detected
    const detected = random > 0.15;

    // 5% chance of multiple faces
    const faceCount = random > 0.95 ? 2 : detected ? 1 : 0;

    // Confidence between 0.75 and 0.98
    const confidence = detected ? 0.75 + Math.random() * 0.23 : 0;

    // Mock head pose estimation (yaw: left-right, pitch: up-down, roll: tilt)
    // Normal range: yaw ±20°, pitch ±15°, roll ±10°
    // Looking away: yaw > 30° or pitch > 25°
    const headPose = detected
      ? {
        yaw: -30 + Math.random() * 60, // -30° to 30°
        pitch: -20 + Math.random() * 40, // -20° to 20°
        roll: -10 + Math.random() * 20, // -10° to 10°
      }
      : undefined;

    // Mock bounding boxes
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

    logger.info(
      {
        detected,
        faceCount,
        confidence: confidence.toFixed(2),
        headPose,
      },
      'Face detection completed (MOCK)'
    );

    return { detected, faceCount, confidence, headPose, boundingBoxes };
  } catch (error) {
    logger.error({ error }, 'Face detection failed');
    throw new Error('Failed to analyze image');
  }
};

// ==================== SERVICE FUNCTIONS ====================

/**
 * Log a single proctoring event
 */
export const logEvent = async (input: LogEventInput) => {
  const { userExamId, eventType, metadata, severity } = input;

  logger.debug({ userExamId, eventType, severity }, 'Logging proctoring event');

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
    throw new Error('User exam session not found');
  }

  // Prevent logging events for already submitted exams
  if (userExam.submittedAt) {
    throw new Error('Cannot log events for submitted exam');
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

  logger.info({ eventId: event.id, eventType, severity }, 'Proctoring event logged successfully');

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
 * Useful for frontend buffering and sending events in batches
 */
export const logEventsBatch = async (input: LogEventsBatchInput) => {
  const { events } = input;

  logger.info({ count: events.length }, 'Logging batch proctoring events');

  // Validate all user exams exist
  const userExamIds = [...new Set(events.map((e) => e.userExamId))];
  const userExams = await prisma.userExam.findMany({
    where: { id: { in: userExamIds } },
    select: { id: true, submittedAt: true },
  });

  if (userExams.length !== userExamIds.length) {
    throw new Error('One or more user exam sessions not found');
  }

  // Check for submitted exams
  const submittedExams = userExams.filter((ue) => ue.submittedAt !== null);
  if (submittedExams.length > 0) {
    throw new Error(
      `Cannot log events for submitted exam(s): ${submittedExams.map((e) => e.id).join(', ')}`
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

  // Fetch created events to return with IDs
  const createdEvents = await prisma.proctoringEvent.findMany({
    where: { userExamId: { in: userExamIds } },
    orderBy: { timestamp: 'desc' },
    take: events.length,
  });

  logger.info({ logged: createdEvents.length }, 'Batch events logged successfully');

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
 * Used by participants to review their own events
 */
export const getEvents = async (userExamId: number, userId: number, filter: GetEventsQuery) => {
  const { eventType, severity, page, limit } = filter;

  logger.debug({ userExamId, userId, filter }, 'Fetching proctoring events');

  // Verify ownership
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    select: { userId: true },
  });

  if (!userExam) {
    throw new Error('User exam session not found');
  }

  if (userExam.userId !== userId) {
    throw new Error('Unauthorized to view these events');
  }

  // Build query filters
  const where: Prisma.ProctoringEventWhereInput = {
    userExamId,
    ...(eventType && { eventType }),
    ...(severity && { severity }),
  };

  const skip = (page - 1) * limit;

  // Execute queries
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
 * Provides comprehensive analytics about proctoring activity
 */
export const getStats = async (
  userExamId: number,
  userId: number
): Promise<ProctoringStatsResponse> => {
  logger.debug({ userExamId, userId }, 'Calculating proctoring statistics');

  // Verify ownership and get exam details
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    include: {
      user: { select: { name: true } },
      exam: { select: { title: true } },
    },
  });

  if (!userExam) {
    throw new Error('User exam session not found');
  }

  if (userExam.userId !== userId) {
    throw new Error('Unauthorized to view these statistics');
  }

  // Fetch all events for this exam session
  const events = await prisma.proctoringEvent.findMany({
    where: { userExamId },
    orderBy: { timestamp: 'asc' },
  });

  const totalEvents = events.length;

  // Count suspicious events (exclude FACE_DETECTED which is positive)
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

  // Timeline (last 50 events for chart)
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

  logger.info({ userExamId, riskScore, riskLevel }, 'Statistics calculated successfully');

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
 * Supports filtering by exam, user, event type, etc.
 */
export const getAdminEvents = async (filter: GetAdminEventsQuery) => {
  const { userExamId, examId, userId, eventType, severity, page, limit, sortBy, sortOrder } =
    filter;

  logger.debug({ filter }, 'Fetching admin proctoring events');

  // Build query filters
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

  // Execute queries with user exam details
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
 * This is the main integration point with computer vision
 */
export const detectFace = async (
  input: DetectFaceInput,
  userId: number
): Promise<FaceDetectionResult> => {
  const { userExamId, imageBase64, timestamp } = input;

  logger.info({ userExamId, userId }, 'Processing face detection request');

  // Verify user exam exists and belongs to user
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    select: { userId: true, submittedAt: true },
  });

  if (!userExam) {
    throw new Error('User exam session not found');
  }

  if (userExam.userId !== userId) {
    throw new Error('Unauthorized');
  }

  if (userExam.submittedAt) {
    throw new Error('Cannot process detection for submitted exam');
  }

  // Run face detection analysis
  const detection = await analyzeFaceDetection(imageBase64);

  const { detected, faceCount, confidence, headPose, boundingBoxes } = detection;

  // Determine event type and severity based on detection results
  let eventType: ProctoringEventType;
  let severity: 'LOW' | 'MEDIUM' | 'HIGH';
  const warnings: string[] = [];

  if (!detected || faceCount === 0) {
    // No face detected - user not present
    eventType = ProctoringEventType.NO_FACE_DETECTED;
    severity = 'HIGH';
    warnings.push('No face detected - user may have left seat');
  } else if (faceCount > 1) {
    // Multiple faces - potential helper
    eventType = ProctoringEventType.MULTIPLE_FACES;
    severity = 'HIGH';
    warnings.push(`Multiple faces detected (${faceCount})`);
  } else if (confidence < 0.7) {
    // Low confidence - possible looking away or obscured face
    eventType = ProctoringEventType.LOOKING_AWAY;
    severity = 'MEDIUM';
    warnings.push('Low confidence detection - face may be obscured');
  } else if (headPose && (Math.abs(headPose.yaw) > 30 || Math.abs(headPose.pitch) > 25)) {
    // Head pose indicates looking away
    eventType = ProctoringEventType.LOOKING_AWAY;
    severity = Math.abs(headPose.yaw) > 45 || Math.abs(headPose.pitch) > 35 ? 'HIGH' : 'MEDIUM';
    warnings.push(
      `Looking away detected (yaw: ${headPose.yaw.toFixed(1)}°, pitch: ${headPose.pitch.toFixed(1)}°)`
    );
  } else {
    // Normal - face detected and looking at screen
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

  logger.info({ eventId: event.id, eventType, severity }, 'Face detection event logged');

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