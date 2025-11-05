/**
 * Face Analyzer Factory
 *
 * Creates appropriate face analyzer based on environment configuration.
 * Returns MockFaceAnalyzer for development, YOLOFaceAnalyzer for production.
 *
 * @module FaceAnalyzerFactory
 */

import { env } from '@/config/env';
import { ML_CONFIG, ML_ERROR_MESSAGES, ML_ERROR_CODES } from '@/config/constants';
import { logger } from '@/shared/utils/logger';
import { MockFaceAnalyzer } from './mock-analyzer.service';
export { MockFaceAnalyzer } from './mock-analyzer.service';
// import { YOLOFaceAnalyzer } from './yolo-analyzer.service'; // Future implementation

// ==================== TYPES ====================

/**
 * Analysis status enum
 */
export type AnalysisStatus = 'success' | 'error' | 'timeout';

/**
 * Violation types detected by analyzer
 */
export type ViolationType =
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES'
  | 'LOOKING_AWAY'
  | 'FACE_DETECTED'; // Normal state

/**
 * ML-agnostic face analysis result
 * Designed to work with any face detection model (YOLO, MediaPipe, etc)
 */
export interface FaceAnalysisResult {
  /** Analysis completion status */
  status: AnalysisStatus;

  /** Array of detected violations (empty if no violations) */
  violations: ViolationType[];

  /** Overall confidence score (0-1), 0 if error/timeout */
  confidence: number;

  /** Human-readable message */
  message: string;

  /** Optional metadata for debugging/monitoring */
  metadata?: {
    processingTimeMs?: number;
    modelVersion?: string;
    faceCount?: number;
    rawDetections?: any;
  };
}

/**
 * Face analyzer interface
 * Both mock and real analyzers must implement this
 */
export interface IFaceAnalyzer {
  /**
   * Analyze image for face detection and violations
   *
   * @param imageBase64 - Base64 encoded image
   * @returns Analysis result with violations and confidence
   * @throws Never throws - returns error status instead
   */
  analyze(imageBase64: string): Promise<FaceAnalysisResult>;

  /**
   * Check if analyzer is ready to use
   * For ML models: checks if model is loaded
   * For mock: always returns true
   */
  isReady(): boolean;

  /**
   * Warmup analyzer (load model, allocate memory, etc)
   * Should be called once at startup
   */
  warmup(): Promise<void>;
}

// ==================== FACTORY ====================

/**
 * Create face analyzer instance based on environment
 *
 * @returns Face analyzer instance (Mock or YOLO)
 */
export const createFaceAnalyzer = (): IFaceAnalyzer => {
  // For MVP, check YOLO_ENABLED flag
  if (env.YOLO_ENABLED) {
    logger.info('🎯 YOLO analyzer enabled (future implementation)');
    // return new YOLOFaceAnalyzer(); // TODO: Implement

    // For now, fallback to mock with warning
    logger.warn('⚠️ YOLO not implemented yet, using mock analyzer');
    return new MockFaceAnalyzer();
  }

  logger.info('🎭 Using mock face analyzer');
  return new MockFaceAnalyzer();
};

// ==================== SINGLETON ====================

let analyzerInstance: IFaceAnalyzer | null = null;
let isWarmingUp = false;
let warmupPromise: Promise<void> | null = null;

/**
 * Get singleton face analyzer instance
 * Lazy initialization - creates instance on first call
 */
export const getFaceAnalyzer = (): IFaceAnalyzer => {
  if (!analyzerInstance) {
    analyzerInstance = createFaceAnalyzer();
  }
  return analyzerInstance;
};

/**
 * Warmup face analyzer
 * Should be called once at server startup for optimal performance
 * Safe to call multiple times - subsequent calls return existing promise
 *
 * @throws Error if warmup fails critically
 */
export const warmupFaceAnalyzer = async (): Promise<void> => {
  // Prevent concurrent warmup
  if (isWarmingUp && warmupPromise) {
    logger.info('⏳ Warmup already in progress, waiting...');
    return warmupPromise;
  }

  isWarmingUp = true;
  const startTime = Date.now();

  warmupPromise = (async () => {
    try {
      logger.info('🔥 Starting face analyzer warmup...');

      const analyzer = getFaceAnalyzer();
      await analyzer.warmup();

      const elapsed = Date.now() - startTime;
      logger.info({ elapsedMs: elapsed }, '✅ Face analyzer warmup complete');

    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error(
        { error, elapsedMs: elapsed },
        '❌ Face analyzer warmup failed'
      );

      // For MVP: Don't crash server, fallback to mock
      if (env.ML_FALLBACK_TO_MOCK) {
        logger.warn('⚠️ Falling back to mock analyzer due to warmup failure');
        analyzerInstance = new MockFaceAnalyzer();
        await analyzerInstance.warmup();
      } else {
        throw error;
      }
    } finally {
      isWarmingUp = false;
    }
  })();

  return warmupPromise;
};

/**
 * Check if analyzer is ready to use
 */
export const isAnalyzerReady = (): boolean => {
  if (!analyzerInstance) {
    return false;
  }
  return analyzerInstance.isReady();
};

/**
 * Reset analyzer instance (useful for testing)
 */
export const resetAnalyzer = (): void => {
  analyzerInstance = null;
  isWarmingUp = false;
  warmupPromise = null;
};