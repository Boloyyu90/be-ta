/**
 * Face Analyzer Factory
 *
 * Factory untuk membuat instance face analyzer berdasarkan environment.
 * Support production YOLO analyzer dan development mock analyzer
 * dengan automatic fallback mechanism.
 *
 * Key Features:
 * - Environment-based analyzer selection
 * - Automatic fallback to mock analyzer
 * - Singleton pattern untuk performance
 * - Health check dan warmup support
 *
 * Architecture:
 * - Production: YOLO client → Python microservice
 * - Development: Mock analyzer → deterministic responses
 * - Fallback: Mock analyzer kalau YOLO service unavailable
 *
 * @module features/proctoring/ml/analyzer-factory
 */

import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import { MockFaceAnalyzer } from './mock-analyzer.service';
import { YOLOFaceAnalyzer } from './yolo-client.service';

/**
 * Status Hasil Analisis Wajah
 *
 * Indicator apakah analisis berhasil, error, atau timeout.
 */
export type AnalysisStatus = 'success' | 'error' | 'timeout';

/**
 * Jenis Pelanggaran Yang Terdeteksi
 *
 * Violation types yang bisa terdeteksi oleh face analyzer.
 * FACE_DETECTED adalah state normal (tidak ada violation).
 */
export type ViolationType =
  | 'NO_FACE_DETECTED'    // Tidak ada wajah terdeteksi
  | 'MULTIPLE_FACES'      // Lebih dari 1 wajah terdeteksi
  | 'LOOKING_AWAY'        // Wajah tidak menghadap layar
  | 'FACE_DETECTED';      // Normal state (1 wajah, menghadap layar)

/**
 * Hasil Analisis Wajah (ML-Agnostic)
 *
 * Format standar hasil analisis yang sama untuk semua analyzer.
 * Backend tidak perlu tahu apakah menggunakan YOLO atau mock analyzer.
 */
export interface FaceAnalysisResult {
  /** Status analisis (success/error/timeout) */
  status: AnalysisStatus;
  /** Array violations yang terdeteksi */
  violations: ViolationType[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Human-readable message */
  message: string;
  /** Additional metadata (optional) */
  metadata?: {
    /** Processing time dalam milliseconds */
    processingTimeMs?: number;
    /** Model version yang digunakan */
    modelVersion?: string;
    /** Jumlah wajah yang terdeteksi */
    faceCount?: number;
    /** Raw detections dari ML model */
    rawDetections?: any;
    /** Error message kalau status = error */
    error?: string;
  };
}

/**
 * Face Analyzer Interface
 *
 * Interface yang harus diimplementasikan oleh semua analyzer.
 * Ensures consistency antara YOLO dan mock analyzer.
 */
export interface IFaceAnalyzer {
  /**
   * Analyze gambar untuk detect wajah dan violations
   *
   * @param imageBase64 - Base64 encoded image
   * @returns Analysis result
   */
  analyze(imageBase64: string): Promise<FaceAnalysisResult>;

  /**
   * Check apakah analyzer sudah ready
   *
   * @returns true kalau analyzer siap digunakan
   */
  isReady(): boolean;

  /**
   * Warmup analyzer (load model, etc)
   *
   * Dipanggil saat server startup untuk preload model.
   */
  warmup(): Promise<void>;
}

/**
 * Create Face Analyzer Berdasarkan Environment
 *
 * Decision tree:
 * 1. YOLO_ENABLED=true → YOLOFaceAnalyzer (production)
 * 2. YOLO_ENABLED=false → MockFaceAnalyzer (development)
 * 3. YOLO gagal + ML_FALLBACK_TO_MOCK=true → Fallback ke Mock
 *
 * @returns Face analyzer instance
 *
 * @example
 * ```typescript
 * // Di production (YOLO_ENABLED=true):
 * const analyzer = createFaceAnalyzer();
 * // Returns: YOLOFaceAnalyzer
 *
 * // Di development (YOLO_ENABLED=false):
 * const analyzer = createFaceAnalyzer();
 * // Returns: MockFaceAnalyzer
 * ```
 */
export const createFaceAnalyzer = (): IFaceAnalyzer => {
  if (env.YOLO_ENABLED) {
    const serviceUrl = env.YOLO_SERVICE_URL;
    logger.info(
      { serviceUrl, timeout: env.ML_ANALYSIS_TIMEOUT_MS },
      '🎯 Creating YOLO face analyzer (production mode)'
    );
    return new YOLOFaceAnalyzer({
      baseUrl: serviceUrl,
      timeout: env.ML_ANALYSIS_TIMEOUT_MS,
    });
  }

  logger.warn(
    { YOLO_ENABLED: env.YOLO_ENABLED },
    '🎭 Creating mock face analyzer (development mode) - set YOLO_ENABLED=true to use real ML service'
  );
  return new MockFaceAnalyzer();
};

// ==================== SINGLETON PATTERN ====================

/**
 * Singleton analyzer instance
 *
 * Reuse instance untuk performance.
 * Avoid multiple model loads.
 */
let analyzerInstance: IFaceAnalyzer | null = null;

/**
 * Warmup status tracking
 *
 * Prevent concurrent warmup calls.
 */
let isWarmingUp = false;

/**
 * Warmup promise untuk reuse
 *
 * Kalau ada multiple calls, semua wait untuk same warmup.
 */
let warmupPromise: Promise<void> | null = null;

/**
 * Get Face Analyzer Instance (Singleton)
 *
 * Returns existing instance atau create new kalau belum ada.
 * Thread-safe singleton pattern.
 *
 * @returns Analyzer instance
 *
 * @example
 * ```typescript
 * const analyzer = getFaceAnalyzer();
 * const result = await analyzer.analyze(imageBase64);
 * ```
 */
export const getFaceAnalyzer = (): IFaceAnalyzer => {
  if (!analyzerInstance) {
    analyzerInstance = createFaceAnalyzer();
  }
  return analyzerInstance;
};

/**
 * Warmup Face Analyzer Dengan Fallback Support
 *
 * Kalau YOLO service gagal dan ML_FALLBACK_TO_MOCK=true,
 * otomatis fallback ke mock analyzer.
 *
 * Multiple concurrent calls akan wait untuk same warmup.
 *
 * @throws {Error} Kalau warmup gagal dan fallback disabled
 *
 * @example
 * ```typescript
 * // Di server startup:
 * try {
 *   await warmupFaceAnalyzer();
 *   logger.info('✅ Analyzer ready');
 * } catch (error) {
 *   logger.error('❌ Analyzer warmup failed');
 *   // Server bisa tetap jalan kalau fallback enabled
 * }
 * ```
 */
export const warmupFaceAnalyzer = async (): Promise<void> => {
  // Kalau sedang warming up, wait untuk existing warmup
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(
        { error: errorMessage, elapsedMs: elapsed, YOLO_ENABLED: env.YOLO_ENABLED },
        '❌ Face analyzer warmup failed'
      );

      // Fallback ke mock jika enabled
      if (env.ML_FALLBACK_TO_MOCK) {
        logger.warn(
          { reason: errorMessage, ML_FALLBACK_TO_MOCK: true },
          '⚠️ Falling back to mock analyzer - face analysis will return dummy data!'
        );
        analyzerInstance = new MockFaceAnalyzer();
        await analyzerInstance.warmup();
        logger.info(
          { analyzerType: 'mock' },
          '✅ Mock analyzer ready as fallback - NOTE: This will always return FACE_DETECTED'
        );
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
 * Check Apakah Analyzer Sudah Ready
 *
 * @returns true kalau analyzer siap digunakan
 *
 * @example
 * ```typescript
 * if (isAnalyzerReady()) {
 *   // Proceed with analysis
 * } else {
 *   // Show error to user
 * }
 * ```
 */
export const isAnalyzerReady = (): boolean => {
  return analyzerInstance?.isReady() ?? false;
};

/**
 * Get Analyzer Type Info (For Health Checks)
 *
 * Useful untuk debugging dan health check endpoints.
 *
 * @returns Object dengan analyzer type dan ready status
 *
 * @example
 * ```typescript
 * // Di health check endpoint:
 * const info = getAnalyzerInfo();
 * res.json({
 *   status: 'ok',
 *   ml: {
 *     type: info.type,    // 'yolo' atau 'mock'
 *     ready: info.ready   // true/false
 *   }
 * });
 * ```
 */
export const getAnalyzerInfo = (): { type: string; ready: boolean } => {
  return {
    type: analyzerInstance instanceof YOLOFaceAnalyzer ? 'yolo' : 'mock',
    ready: isAnalyzerReady(),
  };
};

/**
 * Reset Analyzer Instance (For Testing)
 *
 * Reset singleton untuk testing purposes.
 * Jangan gunakan di production code!
 *
 * @example
 * ```typescript
 * // Di unit test:
 * beforeEach(() => {
 *   resetAnalyzer();
 * });
 * ```
 */
export const resetAnalyzer = (): void => {
  analyzerInstance = null;
  isWarmingUp = false;
  warmupPromise = null;
};

// Re-export for convenience
export { MockFaceAnalyzer } from './mock-analyzer.service';
export { YOLOFaceAnalyzer } from './yolo-client.service';