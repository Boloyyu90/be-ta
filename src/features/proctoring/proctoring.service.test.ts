/**
 * Proctoring Service Tests
 *
 * Tests pure business logic functions (determineSeverity, mapViolationToEventType)
 * and the analyzeFace service with mocked Prisma and ML analyzer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProctoringEventType, ProctoringSeverity } from '@prisma/client';

// ---------------------------------------------------------------------------
// Hoisted mocks (must be declared before vi.mock factories)
// ---------------------------------------------------------------------------
const { mockAnalyze } = vi.hoisted(() => ({
    mockAnalyze: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
vi.mock('@/config/database', () => ({
    prisma: {
        userExam: {
            findUnique: vi.fn(),
        },
        proctoringEvent: {
            create: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
        },
    },
}));

// Mock env
vi.mock('@/config/env', () => ({
    env: {
        ML_ANALYSIS_TIMEOUT_MS: 5000,
        ML_FALLBACK_TO_MOCK: true,
        YOLO_ENABLED: false,
    },
}));

// Mock logger (must include ALL methods used by the service)
vi.mock('@/shared/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock timeout utility
vi.mock('@/shared/utils/timeout', () => ({
    withTimeout: vi.fn((promise: Promise<unknown>) => promise),
    TimeoutError: class TimeoutError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'TimeoutError';
        }
    },
}));

// Mock ML analyzer factory (uses hoisted mockAnalyze)
vi.mock('./ml/analyzer.factory', () => {
    return {
        getFaceAnalyzer: vi.fn(() => ({
            analyze: mockAnalyze,
        })),
        MockFaceAnalyzer: vi.fn().mockImplementation(() => ({
            analyze: vi.fn().mockResolvedValue({
                status: 'ok',
                faces_detected: 1,
                violations: ['FACE_DETECTED'],
                detections: [],
                looking_away: false,
                confidence: 0.5,
            }),
        })),
    };
});

// Mock constants (matching actual constant values used by the service)
vi.mock('@/config/constants', () => ({
    ERROR_MESSAGES: {
        USER_EXAM_NOT_FOUND: 'User exam session not found',
        UNAUTHORIZED_EXAM_SESSION: 'Unauthorized to access this exam session',
    },
    ERROR_CODES: {
        EXAM_SESSION_NOT_FOUND: 'EXAM_SESSION_NOT_FOUND',
        EXAM_SESSION_UNAUTHORIZED: 'EXAM_SESSION_UNAUTHORIZED',
    },
    ML_ERROR_MESSAGES: {
        ANALYSIS_FAILED: 'ML analysis failed',
        TIMEOUT: 'ML analysis timed out',
    },
    ML_ERROR_CODES: {
        ANALYSIS_FAILED: 'ML_ANALYSIS_FAILED',
        TIMEOUT: 'ML_TIMEOUT',
    },
    ML_CONFIG: {
        TIMEOUT_MS: 5000,
    },
}));

// Mock pagination
vi.mock('@/shared/utils/pagination', () => ({
    createPaginatedResponse: vi.fn(),
}));

// Mock errors (defined inside factory to avoid vi.mock hoisting issues)
vi.mock('@/shared/errors/app-errors', () => {
    class NotFoundError extends Error {
        constructor(message?: string, _code?: string, _details?: unknown) {
            super(message || 'Not found');
            this.name = 'NotFoundError';
        }
    }
    class UnauthorizedError extends Error {
        constructor(message?: string, _code?: string, _details?: unknown) {
            super(message || 'Unauthorized');
            this.name = 'UnauthorizedError';
        }
    }
    class BadRequestError extends Error {
        constructor(message?: string, _code?: string, _details?: unknown) {
            super(message || 'Bad request');
            this.name = 'BadRequestError';
        }
    }
    return { NotFoundError, UnauthorizedError, BadRequestError };
});

// Import after mocks
import { determineSeverity, mapViolationToEventType, analyzeFace } from './proctoring.service';
import { prisma } from '@/config/database';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Proctoring Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // =========================================================================
    // determineSeverity
    // =========================================================================

    describe('determineSeverity', () => {
        it('should return HIGH for NO_FACE_DETECTED', () => {
            expect(determineSeverity(ProctoringEventType.NO_FACE_DETECTED)).toBe(ProctoringSeverity.HIGH);
        });

        it('should return HIGH for MULTIPLE_FACES', () => {
            expect(determineSeverity(ProctoringEventType.MULTIPLE_FACES)).toBe(ProctoringSeverity.HIGH);
        });

        it('should return MEDIUM for LOOKING_AWAY', () => {
            expect(determineSeverity(ProctoringEventType.LOOKING_AWAY)).toBe(ProctoringSeverity.MEDIUM);
        });

        it('should return LOW for FACE_DETECTED', () => {
            expect(determineSeverity(ProctoringEventType.FACE_DETECTED)).toBe(ProctoringSeverity.LOW);
        });
    });

    // =========================================================================
    // mapViolationToEventType
    // =========================================================================

    describe('mapViolationToEventType', () => {
        it('should map NO_FACE_DETECTED string to enum', () => {
            expect(mapViolationToEventType('NO_FACE_DETECTED')).toBe(ProctoringEventType.NO_FACE_DETECTED);
        });

        it('should map MULTIPLE_FACES string to enum', () => {
            expect(mapViolationToEventType('MULTIPLE_FACES')).toBe(ProctoringEventType.MULTIPLE_FACES);
        });

        it('should map LOOKING_AWAY string to enum', () => {
            expect(mapViolationToEventType('LOOKING_AWAY')).toBe(ProctoringEventType.LOOKING_AWAY);
        });

        it('should return null for unknown violation types', () => {
            expect(mapViolationToEventType('UNKNOWN_TYPE')).toBeNull();
        });

        it('should return null for empty string', () => {
            expect(mapViolationToEventType('')).toBeNull();
        });
    });

    // =========================================================================
    // analyzeFace
    // =========================================================================

    describe('analyzeFace', () => {
        const mockUserExam = {
            id: 1,
            userId: 100,
            examId: 1,
            status: 'IN_PROGRESS',
        };

        const mockFaceDetectedResult = {
            status: 'ok',
            faces_detected: 1,
            violations: ['FACE_DETECTED'],
            detections: [{ bbox: [0, 0, 100, 100], confidence: 0.95 }],
            looking_away: false,
        };

        const mockNoFaceResult = {
            status: 'violation',
            faces_detected: 0,
            violations: ['NO_FACE_DETECTED'],
            detections: [],
            looking_away: false,
        };

        beforeEach(() => {
            vi.mocked(prisma.userExam.findUnique).mockResolvedValue(mockUserExam as never);
            vi.mocked(prisma.proctoringEvent.create).mockResolvedValue({
                id: 1,
                userExamId: 1,
                eventType: ProctoringEventType.NO_FACE_DETECTED,
                severity: ProctoringSeverity.HIGH,
                createdAt: new Date(),
                metadata: null,
            } as never);
        });

        it('should throw NotFoundError when userExam not found', async () => {
            vi.mocked(prisma.userExam.findUnique).mockResolvedValue(null as never);

            await expect(analyzeFace(999, 100, 'base64image'))
                .rejects.toThrow('User exam session not found');
        });

        it('should throw UnauthorizedError when userId does not match', async () => {
            vi.mocked(prisma.userExam.findUnique).mockResolvedValue(mockUserExam as never);

            await expect(analyzeFace(1, 999, 'base64image'))
                .rejects.toThrow('Unauthorized to access this exam session');
        });

        it('should return analysis result for FACE_DETECTED (no violation logged)', async () => {
            mockAnalyze.mockResolvedValue(mockFaceDetectedResult);

            const result = await analyzeFace(1, 100, 'base64image');

            expect(result.analysis.status).toBe('ok');
            expect(result.analysis.violations).toContain('FACE_DETECTED');
            // FACE_DETECTED is not a real violation — eventType should be null
            expect(result.eventType).toBeNull();
            expect(result.eventLogged).toBe(false);
        });

        it('should log event and return for NO_FACE_DETECTED violation', async () => {
            mockAnalyze.mockResolvedValue(mockNoFaceResult);

            const result = await analyzeFace(1, 100, 'base64image');

            expect(result.analysis.status).toBe('violation');
            expect(result.analysis.violations).toContain('NO_FACE_DETECTED');
            expect(result.eventLogged).toBe(true);
            expect(result.eventType).toBe('NO_FACE_DETECTED');
        });

        it('should call prisma.proctoringEvent.create for violations', async () => {
            mockAnalyze.mockResolvedValue(mockNoFaceResult);

            await analyzeFace(1, 100, 'base64image');

            expect(prisma.proctoringEvent.create).toHaveBeenCalled();
        });
    });
});
