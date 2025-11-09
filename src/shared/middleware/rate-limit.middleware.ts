import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter
 * Applied to all routes
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Auth rate limiter
 * Applied to authentication routes (login, register)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Token refresh rate limiter
 * Applied to token refresh endpoint
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 refresh attempts per 15 minutes
  message: 'Too many token refresh attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Applied to proctoring event logging and face analysis
 *
 * Reasoning:
 * - Face analysis is CPU-intensive (ML operations)
 * - Event logging can be spammed during exam
 * - Prevent abuse while allowing legitimate proctoring
 */
export const proctoringLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 30, // 30 requests per minute (1 every 2 seconds)
  message: 'Too many proctoring requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  // Don't skip successful requests - count all
  skipSuccessfulRequests: false,
});