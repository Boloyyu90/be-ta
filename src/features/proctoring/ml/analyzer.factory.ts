/**
 * Face Analyzer Factory
 *
 * Creates appropriate face analyzer based on environment configuration.
 * Returns MockFaceAnalyzer for development, YOLOFaceAnalyzer for production.
 *
 * @module FaceAnalyzerFactory
 */

import { env } from '@/config/env';
import { MockFaceAnalyzer } from './mock-analyzer.service';
// import { YOLOFaceAnalyzer } from './yolo-analyzer.service'; // Future implementation

/**
 * Face analyzer interface
 * Both mock and real analyzers must implement this
 */
export interface IFaceAnalyzer {
  analyze(imageBase64: string): Promise<{
    faceDetected: boolean;
    faceCount: number;
    confidence: number;
    lookingAway: boolean;
    message: string;
  }>;
}

/**
 * Create face analyzer instance based on environment
 *
 * @returns Face analyzer instance (Mock or YOLO)
 */
export const createFaceAnalyzer = (): IFaceAnalyzer => {
  // For MVP, always use mock analyzer
  // In future: check env.YOLO_ENABLED flag

  // if (env.NODE_ENV === 'production' && env.YOLO_ENABLED) {
  //   return new YOLOFaceAnalyzer();
  // }

  return new MockFaceAnalyzer();
};

// Singleton instance
let analyzerInstance: IFaceAnalyzer | null = null;

/**
 * Get singleton face analyzer instance
 */
export const getFaceAnalyzer = (): IFaceAnalyzer => {
  if (!analyzerInstance) {
    analyzerInstance = createFaceAnalyzer();
  }
  return analyzerInstance;
};