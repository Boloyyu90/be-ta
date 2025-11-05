/**
 * Mock Face Analyzer for Development/Testing
 *
 * This simulates ML model responses for proctoring without actual YOLO integration.
 * Used in development and testing environments.
 *
 * @module MockFaceAnalyzer
 */

interface FaceAnalysisResult {
  faceDetected: boolean;
  faceCount: number;
  confidence: number;
  lookingAway: boolean;
  message: string;
}

/**
 * Mock face detection analyzer
 * Simulates YOLO-like responses with random detection scenarios
 */
export class MockFaceAnalyzer {
  /**
   * Analyze image and return mock detection results
   *
   * @param imageBase64 - Base64 encoded image
   * @returns Mock analysis result
   */
  async analyze(imageBase64: string): Promise<FaceAnalysisResult> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Validate input
    if (!imageBase64 || imageBase64.length < 100) {
      throw new Error('Invalid image data');
    }

    // Generate random scenarios for testing
    const random = Math.random();

    if (random < 0.1) {
      // 10% chance: No face detected
      return {
        faceDetected: false,
        faceCount: 0,
        confidence: 0,
        lookingAway: false,
        message: 'No face detected in the image',
      };
    } else if (random < 0.2) {
      // 10% chance: Multiple faces
      return {
        faceDetected: true,
        faceCount: Math.floor(Math.random() * 3) + 2, // 2-4 faces
        confidence: 0.85 + Math.random() * 0.1,
        lookingAway: false,
        message: 'Multiple faces detected',
      };
    } else if (random < 0.3) {
      // 10% chance: Looking away
      return {
        faceDetected: true,
        faceCount: 1,
        confidence: 0.8 + Math.random() * 0.15,
        lookingAway: true,
        message: 'User appears to be looking away',
      };
    } else {
      // 70% chance: Normal/good detection
      return {
        faceDetected: true,
        faceCount: 1,
        confidence: 0.9 + Math.random() * 0.1,
        lookingAway: false,
        message: 'Face detected successfully',
      };
    }
  }
}