/**
 * Face Analyzer Factory - Updated for Iteration 2
 *
 * Creates appropriate face analyzer based on environment configuration.
 * Now properly integrates YOLO client for production use.
 *
 * @module FaceAnalyzerFactory
 */

import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import { MockFaceAnalyzer } from './mock-analyzer.service';
import { YOLOFaceAnalyzer } from './yolo-client.service';

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
 */
export interface FaceAnalysisResult {
  status: AnalysisStatus;
  violations: ViolationType[];
  confidence: number;
  message: string;
  metadata?: {
    processingTimeMs?: number;
    modelVersion?: string;
    faceCount?: number;
    rawDetections?: any;
    error?: string;
  };
}

/**
 * Face analyzer interface
 */
export interface IFaceAnalyzer {
  analyze(imageBase64: string): Promise<FaceAnalysisResult>;
  isReady(): boolean;
  warmup(): Promise<void>;
}

// ==================== FACTORY ====================

/**
 * Create face analyzer instance based on environment
 *
 * Decision tree:
 * 1. If YOLO_ENABLED=true → YOLOFaceAnalyzer (calls Python service)
 * 2. If YOLO_ENABLED=false → MockFaceAnalyzer (for development)
 * 3. If YOLO fails and ML_FALLBACK_TO_MOCK=true → Fallback to Mock
 */
export const createFaceAnalyzer = (): IFaceAnalyzer => {
  if (env.YOLO_ENABLED) {
    logger.info('🎯 Creating YOLO face analyzer (production mode)');
    return new YOLOFaceAnalyzer({
      baseUrl: process.env.YOLO_SERVICE_URL || 'http://localhost:8000',
      timeout: env.ML_ANALYSIS_TIMEOUT_MS,
    });
  }

  logger.info('🎭 Creating mock face analyzer (development mode)');
  return new MockFaceAnalyzer();
};

// ==================== SINGLETON ====================

let analyzerInstance: IFaceAnalyzer | null = null;
let isWarmingUp = false;
let warmupPromise: Promise<void> | null = null;

/**
 * Get singleton face analyzer instance
 */
export const getFaceAnalyzer = (): IFaceAnalyzer => {
  if (!analyzerInstance) {
    analyzerInstance = createFaceAnalyzer();
  }
  return analyzerInstance;
};

/**
 * Warmup face analyzer with fallback support
 */
export const warmupFaceAnalyzer = async (): Promise<void> => {
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

      if (analyzer.isReady()) {
        logger.info(
          { elapsedMs: elapsed, type: env.YOLO_ENABLED ? 'yolo' : 'mock' },
          '✅ Face analyzer warmup complete'
        );
      } else {
        throw new Error('Analyzer not ready after warmup');
      }

    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error(
        { error, elapsedMs: elapsed },
        '❌ Face analyzer warmup failed'
      );

      // Fallback to mock if enabled
      if (env.ML_FALLBACK_TO_MOCK) {
        logger.warn('⚠️ Falling back to mock analyzer');
        analyzerInstance = new MockFaceAnalyzer();
        await analyzerInstance.warmup();
        logger.info('✅ Mock analyzer ready as fallback');
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
 * Check if analyzer is ready
 */
export const isAnalyzerReady = (): boolean => {
  return analyzerInstance?.isReady() ?? false;
};

/**
 * Get analyzer type info (for health checks)
 */
export const getAnalyzerInfo = (): { type: string; ready: boolean } => {
  return {
    type: analyzerInstance instanceof YOLOFaceAnalyzer ? 'yolo' : 'mock',
    ready: isAnalyzerReady(),
  };
};

/**
 * Reset analyzer instance (for testing)
 */
export const resetAnalyzer = (): void => {
  analyzerInstance = null;
  isWarmingUp = false;
  warmupPromise = null;
};

// Re-export for convenience
export { MockFaceAnalyzer } from './mock-analyzer.service';
export { YOLOFaceAnalyzer } from './yolo-client.service';