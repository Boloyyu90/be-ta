/**
 * Timeout utility for async operations
 * Follows existing utils pattern
 *
 * @module TimeoutUtils
 */

/**
 * Error thrown when operation times out
 */
export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a promise that rejects after specified timeout
 *
 * @param ms - Timeout in milliseconds
 * @returns Promise that rejects with TimeoutError
 */
export const createTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`Operation exceeded ${ms}ms timeout`));
    }, ms);
  });
};

/**
 * Wrap async operation with timeout
 * Race between operation and timeout
 *
 * @param promise - Async operation to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves with operation result or rejects with TimeoutError
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetchData(),
 *   5000
 * );
 * ```
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  return Promise.race([
    promise,
    createTimeout(timeoutMs)
  ]);
};