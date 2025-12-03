export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`Operation exceeded ${ms}ms timeout`));
    }, ms);
  });
};


export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  return Promise.race([
    promise,
    createTimeout(timeoutMs)
  ]);
};