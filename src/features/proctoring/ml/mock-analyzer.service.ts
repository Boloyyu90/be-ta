/**
 * Mock Face Analyzer for Development/Testing
 *
 * Deterministic simulator for face detection without actual ML.
 * Scenario-based for consistent testing and demo.
 *
 * @module MockFaceAnalyzer
 */

import { logger } from '@/shared/utils/logger';
import { ML_CONFIG } from '@/config/constants';
import type {
  IFaceAnalyzer,
  FaceAnalysisResult,
  ViolationType
} from './analyzer.factory';

/**
 * Mock scenario types for deterministic testing
 */
export type MockScenario =
  | 'success'           // Normal: 1 face detected
  | 'no_face'          // Violation: No face detected
  | 'multiple_faces'   // Violation: Multiple faces detected
  | 'looking_away'     // Violation: Face looking away
  | 'random';          // Random (for stress testing)

/**
 * Mock face detection analyzer
 * Provides deterministic, configurable responses for MVP testing
 */
export class MockFaceAnalyzer implements IFaceAnalyzer {
  private scenario: MockScenario;
  private ready: boolean = false;

  /**
   * Create mock analyzer with specified scenario
   *
   * @param scenario - Default scenario for all analyses
   */
  constructor(scenario: MockScenario = 'success') {
    this.scenario = scenario;
    logger.debug({ scenario }, '🎭 MockFaceAnalyzer created');
  }

  /**
   * Warmup mock analyzer (instant, for interface compliance)
   */
  async warmup(): Promise<void> {
    logger.debug('🎭 MockFaceAnalyzer warmup started');

    // Simulate small delay for realism
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.ready = true;
    logger.debug('🎭 MockFaceAnalyzer ready');
  }

  /**
   * Check if mock analyzer is ready
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Analyze image with deterministic mock response
   *
   * @param imageBase64 - Base64 encoded image (validated but not processed)
   * @returns Mock analysis result based on scenario
   */
  async analyze(imageBase64: string): Promise<FaceAnalysisResult> {
    const startTime = Date.now();

    // Validate input
    if (!imageBase64 || imageBase64.length < 100) {
      logger.warn('🎭 Invalid image data received');
      return this.createErrorResult('Invalid or corrupted image data');
    }

    // Simulate processing delay (realistic for ML operations)
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Generate result based on scenario
    const result = this.generateResult();

    // Add processing time metadata
    result.metadata = {
      ...result.metadata,
      processingTimeMs: Date.now() - startTime,
      modelVersion: 'mock-v1.0.0',
    };

    logger.debug(
      {
        scenario: this.scenario,
        violations: result.violations,
        processingTimeMs: result.metadata.processingTimeMs
      },
      '🎭 Mock analysis complete'
    );

    return result;
  }

  /**
   * Generate mock result based on current scenario
   */
  private generateResult(): FaceAnalysisResult {
    // For random scenario, pick randomly
    const scenario = this.scenario === 'random'
      ? this.pickRandomScenario()
      : this.scenario;

    switch (scenario) {
      case 'no_face':
        return {
          status: 'success',
          violations: ['NO_FACE_DETECTED'],
          confidence: 0,
          message: 'No face detected in the image',
          metadata: {
            faceCount: 0,
          },
        };

      case 'multiple_faces':
        return {
          status: 'success',
          violations: ['MULTIPLE_FACES'],
          confidence: 0.88,
          message: 'Multiple faces detected',
          metadata: {
            faceCount: Math.floor(Math.random() * 3) + 2, // 2-4 faces
          },
        };

      case 'looking_away':
        return {
          status: 'success',
          violations: ['LOOKING_AWAY'],
          confidence: 0.82,
          message: 'Face detected but looking away from screen',
          metadata: {
            faceCount: 1,
          },
        };

      case 'success':
      default:
        return {
          status: 'success',
          violations: ['FACE_DETECTED'],
          confidence: 0.95,
          message: 'Face detected successfully',
          metadata: {
            faceCount: 1,
          },
        };
    }
  }

  /**
   * Pick random scenario for stress testing
   */
  private pickRandomScenario(): MockScenario {
    const random = Math.random();

    // Weighted distribution (70% success for realistic simulation)
    if (random < 0.70) return 'success';
    if (random < 0.80) return 'no_face';
    if (random < 0.90) return 'multiple_faces';
    return 'looking_away';
  }

  /**
   * Create error result
   */
  private createErrorResult(message: string): FaceAnalysisResult {
    return {
      status: 'error',
      violations: [],
      confidence: 0,
      message,
      metadata: {
        processingTimeMs: 0,
      },
    };
  }

  /**
   * Change mock scenario (useful for testing)
   */
  setScenario(scenario: MockScenario): void {
    logger.debug({ oldScenario: this.scenario, newScenario: scenario }, '🎭 Mock scenario changed');
    this.scenario = scenario;
  }
}