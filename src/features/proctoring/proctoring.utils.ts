import { ProctoringEventType } from '@prisma/client';
import { prisma } from '@/config/database';
import { PROCTORING_CONFIG } from '@/config/constants';

/**
 * Violation count result
 */
export interface ViolationCount {
  high: number;
  medium: number;
  low: number;
  total: number;
  weightedScore: number;
}

/**
 * Violation check result
 */
export interface ViolationCheckResult {
  counts: ViolationCount;
  shouldCancel: boolean;
  warningLevel: 'none' | 'first' | 'second' | 'final';
  message: string | null;
}

/**
 * Count violations by severity for a user exam
 */
export const countViolations = async (userExamId: number): Promise<ViolationCount> => {
  const events = await prisma.proctoringEvent.findMany({
    where: {
      userExamId,
      severity: { in: ['HIGH', 'MEDIUM', 'LOW'] },
    },
    select: {
      severity: true,
    },
  });

  const high = events.filter((e) => e.severity === 'HIGH').length;
  const medium = events.filter((e) => e.severity === 'MEDIUM').length;
  const low = events.filter((e) => e.severity === 'LOW').length;

  // Calculate weighted score (HIGH=1.0, MEDIUM=0.5, LOW=0.0)
  const weightedScore =
    high * PROCTORING_CONFIG.SEVERITY_WEIGHTS.HIGH +
    medium * PROCTORING_CONFIG.SEVERITY_WEIGHTS.MEDIUM +
    low * PROCTORING_CONFIG.SEVERITY_WEIGHTS.LOW;

  return {
    high,
    medium,
    low,
    total: high + medium + low,
    weightedScore,
  };
};

/**
 * Check if violations exceed threshold and determine action
 */
export const checkViolationThreshold = async (
  userExamId: number
): Promise<ViolationCheckResult> => {
  const counts = await countViolations(userExamId);

  // Check if should cancel based on HIGH violations
  const shouldCancelHigh = counts.high >= PROCTORING_CONFIG.MAX_HIGH_VIOLATIONS;

  // Check if should cancel based on MEDIUM violations
  const shouldCancelMedium = counts.medium >= PROCTORING_CONFIG.MAX_MEDIUM_VIOLATIONS;

  const shouldCancel = shouldCancelHigh || shouldCancelMedium;

  // Determine warning level based on HIGH violations (most critical)
  let warningLevel: 'none' | 'first' | 'second' | 'final' = 'none';
  let message: string | null = null;

  if (counts.high === 1) {
    warningLevel = 'first';
    message = `Warning 1/3: Proctoring violation detected. ${PROCTORING_CONFIG.MAX_HIGH_VIOLATIONS - counts.high} more violations will cancel your exam.`;
  } else if (counts.high === 2) {
    warningLevel = 'second';
    message = `Warning 2/3: Another violation detected. 1 more violation will cancel your exam.`;
  } else if (counts.high >= 3) {
    warningLevel = 'final';
    message = `Exam terminated: Maximum violations (${PROCTORING_CONFIG.MAX_HIGH_VIOLATIONS}) exceeded.`;
  }

  return {
    counts,
    shouldCancel,
    warningLevel,
    message,
  };
};

/**
 * Get severity for event type
 */
export const getSeverityForEventType = (eventType: ProctoringEventType): string => {
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