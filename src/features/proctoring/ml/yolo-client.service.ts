/**
 * YOLO Face Analyzer Client
 *
 * Calls external Python ML microservice for face detection.
 * Follows existing analyzer interface for seamless integration.
 *
 * @module YOLOFaceAnalyzer
 */

import { logger } from '@/shared/utils/logger';
import { env } from '@/config/env';
import { withTimeout, TimeoutError } from '@/shared/utils/timeout';
import type {
  IFaceAnalyzer,
  FaceAnalysisResult,
  ViolationType
} from './analyzer.factory';

// ==================== CONFIGURATION ====================

interface YOLOClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

const DEFAULT_CONFIG: YOLOClientConfig = {
  baseUrl: process.env.YOLO_SERVICE_URL || 'http://localhost:8000',
  timeout: env.ML_ANALYSIS_TIMEOUT_MS,
  retries: 2,
};

// ==================== TYPES ====================

interface YOLOServiceResponse {
  success: boolean;
  face_count: number;
  confidence: number;
  looking_away: boolean;
  processing_time_ms: number;
  error?: string;
}

// ==================== IMPLEMENTATION ====================

/**
 * YOLO Face Analyzer that calls Python microservice
 * Production-ready implementation for thesis
 */
export class YOLOFaceAnalyzer implements IFaceAnalyzer {
  private config: YOLOClientConfig;
  private ready: boolean = false;
  private serviceHealthy: boolean = false;

  constructor(config: Partial<YOLOClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info({ config: this.config }, '🎯 YOLOFaceAnalyzer initialized');
  }

  /**
   * Warmup: Check if Python service is available
   */
  async warmup(): Promise<void> {
    logger.info('🔥 YOLOFaceAnalyzer warmup starting...');

    try {
      const response = await withTimeout(
        fetch(`${this.config.baseUrl}/health`),
        5000
      );

      if (response.ok) {
        const health = await response.json();
        this.serviceHealthy = health.model_loaded === true;
        this.ready = this.serviceHealthy;

        logger.info(
          { health, serviceHealthy: this.serviceHealthy },
          '✅ YOLO service health check passed'
        );
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (error) {
      logger.error({ error }, '❌ YOLO service health check failed');
      this.ready = false;
      this.serviceHealthy = false;

      // Don't throw - allow fallback to mock
      if (!env.ML_FALLBACK_TO_MOCK) {
        throw error;
      }
    }
  }

  /**
   * Check if analyzer is ready
   */
  isReady(): boolean {
    return this.ready && this.serviceHealthy;
  }

  /**
   * Analyze face using YOLO microservice
   */
  async analyze(imageBase64: string): Promise<FaceAnalysisResult> {
    const startTime = Date.now();

    // Validate input
    if (!imageBase64 || imageBase64.length < 100) {
      return this.createErrorResult('Invalid or empty image data');
    }

    // Check service health
    if (!this.serviceHealthy) {
      logger.warn('⚠️ YOLO service not healthy, returning error result');
      return this.createErrorResult('ML service unavailable');
    }

    try {
      // Call Python microservice with timeout
      const response = await withTimeout(
        fetch(`${this.config.baseUrl}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: imageBase64,
            // Strip data URL prefix if present
            // "data:image/jpeg;base64,..." -> "..."
          }),
        }),
        this.config.timeout
      );

      if (!response.ok) {
        throw new Error(`Service returned ${response.status}`);
      }

      const data: YOLOServiceResponse = await response.json();

      // Map service response to standard format
      return this.mapServiceResponse(data, Date.now() - startTime);

    } catch (error) {
      const elapsed = Date.now() - startTime;

      if (error instanceof TimeoutError) {
        logger.warn(
          { elapsed, timeout: this.config.timeout },
          '⏱️ YOLO analysis timeout'
        );
        return {
          status: 'timeout',
          violations: [],
          confidence: 0,
          message: 'Analysis timeout - exam continues',
          metadata: {
            processingTimeMs: elapsed,
            error: 'timeout',
          },
        };
      }

      logger.error({ error, elapsed }, '❌ YOLO analysis error');
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Map Python service response to standard format
   */
  private mapServiceResponse(
    data: YOLOServiceResponse,
    processingTimeMs: number
  ): FaceAnalysisResult {
    const violations: ViolationType[] = [];

    // Determine violations based on response
    if (data.face_count === 0) {
      violations.push('NO_FACE_DETECTED');
    } else if (data.face_count > 1) {
      violations.push('MULTIPLE_FACES');
    } else if (data.looking_away) {
      violations.push('LOOKING_AWAY');
    } else {
      violations.push('FACE_DETECTED'); // Normal state
    }

    // Determine message
    let message: string;
    if (data.face_count === 0) {
      message = 'No face detected in the image';
    } else if (data.face_count > 1) {
      message = `Multiple faces detected (${data.face_count})`;
    } else if (data.looking_away) {
      message = 'Face detected but looking away from screen';
    } else {
      message = 'Face detected successfully';
    }

    return {
      status: 'success',
      violations,
      confidence: data.confidence,
      message,
      metadata: {
        processingTimeMs,
        modelVersion: 'yolov8-face',
        faceCount: data.face_count,
        rawDetections: {
          lookingAway: data.looking_away,
          serviceProcessingMs: data.processing_time_ms,
        },
      },
    };
  }

  /**
   * Create error result (non-throwing)
   */
  private createErrorResult(message: string): FaceAnalysisResult {
    return {
      status: 'error',
      violations: [],
      confidence: 0,
      message,
      metadata: {
        processingTimeMs: 0,
        error: message,
      },
    };
  }
}