/**
 * Face Analyzer Factory
 *
 * Factory untuk membuat instance face analyzer berdasarkan environment.
 * - Production: YOLO client → Python microservice
 * - Development: Mock analyzer → deterministic responses
 *
 * @module analyzer.factory
 */
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import { MockFaceAnalyzer } from './mock-analyzer.service';
import { YOLOFaceAnalyzer } from './yolo-client.service';

/**
 * Status hasil analisis wajah
 */
export type AnalysisStatus = 'success' | 'error' | 'timeout';

/**
 * Jenis pelanggaran yang terdeteksi
 */
export type ViolationType =
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES'
  | 'LOOKING_AWAY'
  | 'FACE_DETECTED'; // Normal state

/**
 * Hasil analisis wajah (ML-agnostic)
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
 * Interface Face Analyzer
 * Semua implementasi analyzer harus mengikuti interface ini
 */
export interface IFaceAnalyzer {
  analyze(imageBase64: string): Promise<FaceAnalysisResult>;
  isReady(): boolean;
  warmup(): Promise<void>;
}



/**
 * Factory: Buat analyzer berdasarkan environment
 *
 * Decision tree:
 * 1. YOLO_ENABLED=true → YOLOFaceAnalyzer (production)
 * 2. YOLO_ENABLED=false → MockFaceAnalyzer (development)
 * 3. YOLO gagal + ML_FALLBACK_TO_MOCK=true → Fallback ke Mock
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

// Singleton instance
let analyzerInstance: IFaceAnalyzer | null = null;
let isWarmingUp = false;
let warmupPromise: Promise<void> | null = null;

/**
 * Get analyzer instance (singleton pattern)
 */
export const getFaceAnalyzer = (): IFaceAnalyzer => {
  if (!analyzerInstance) {
    analyzerInstance = createFaceAnalyzer();
  }
  return analyzerInstance;
};

/**
 * Warmup analyzer dengan fallback support
 *
 * Kalau YOLO service gagal dan ML_FALLBACK_TO_MOCK=true,
 * otomatis fallback ke mock analyzer.
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

      // Fallback ke mock jika enabled
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
 * Check apakah analyzer sudah ready
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