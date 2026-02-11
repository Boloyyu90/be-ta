import rateLimit from 'express-rate-limit';
import { env } from '@/config/env';
import { transactionLogger } from '@/shared/utils/logger';

/**
 * Global rate limiter
 * Applied to all routes
 *
 * IMPORTANT: Routes with dedicated rate limiters are SKIPPED to prevent double-counting.
 *
 * The platform's primary use case (exam sessions with real-time proctoring + answer auto-save)
 * generates ~27-35 requests/minute. Without the skip logic, the global limiter exhausts
 * within 3-4 minutes, causing cascade failures:
 *
 * 1. Proctoring 429 → recovery logic waits 35s (designed for 1-min proctoring window)
 * 2. But global limiter has 15-min window → recovery always fails
 * 3. After 3 failed recoveries, proctoring permanently pauses
 * 4. Answer submissions also fail → data loss risk
 *
 * By skipping routes that already have their own dedicated limiters, we:
 * - Eliminate double-counting (proctoring: 30/min, answers: 100/min, submit: 10/5min)
 * - Let each limiter handle its specific concern independently
 * - Reserve global limiter for non-exam routes (auth, profile, admin, etc.)
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip routes that already have dedicated rate limiters
  // This prevents double-counting which exhausts global budget during exam sessions
  skip: (req) => {
    const url = req.originalUrl || req.url;
    // Proctoring routes: protected by proctoringLimiter (30 req/min)
    if (url.includes('/api/v1/proctoring')) return true;
    // Answer submission: protected by answerLimiter (100 req/min)
    if (url.match(/\/api\/v1\/exam-sessions\/\d+\/answers/)) return true;
    // Exam submit: protected by examSubmitLimiter (10 req/5min)
    if (url.match(/\/api\/v1\/exam-sessions\/\d+\/submit/)) return true;
    return false;
  },
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

/**
 * Answer submission rate limiter
 * Applied to exam-session answer endpoints (POST /exam-sessions/:id/answers)
 *
 * Reasoning:
 * - MUST be separate from proctoring limiter to avoid cascade failures
 * - During exam, proctoring captures happen every 3 seconds (20/min)
 * - Answer saves happen on user interaction (typically slower)
 * - CRITICAL: Answer submission should NEVER fail due to proctoring rate limits
 *
 * Config: 100 requests per 1 minute per IP
 * - User can answer 100 questions per minute (more than enough)
 * - Separate from proctoring's 30/min limit
 */
export const answerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100, // 100 answer submissions per minute (generous for exam)
  message: {
    success: false,
    message: 'Too many answer submissions, please wait a moment',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 'See Retry-After header',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Exam submission rate limiter
 * Applied to final exam submission (POST /exam-sessions/:id/submit)
 *
 * Reasoning:
 * - Final submission is a critical operation
 * - Should only happen once per exam session
 * - Generous limit to handle retries on network issues
 *
 * Config: 10 requests per 5 minutes per IP
 */
export const examSubmitLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window
  max: 10, // 10 submit attempts per 5 minutes
  message: {
    success: false,
    message: 'Too many exam submission attempts, please wait',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 'See Retry-After header',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// ============================================================================
// TRANSACTION RATE LIMITERS
// ============================================================================

/**
 * Standard JSON response for rate limit errors
 */
const rateLimitResponse = {
  success: false,
  message: 'Too many requests, please try again later',
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 'See Retry-After header',
  },
};

/**
 * Transaction creation rate limiter
 *
 * Reasoning:
 * - Prevent abuse of Midtrans API quota
 * - Each transaction costs API call to Midtrans
 * - Legitimate user won't create many transactions quickly
 *
 * Default: 10 requests per 15 minutes per IP
 * Configurable via RATE_LIMIT_TRANSACTION_MAX and RATE_LIMIT_TRANSACTION_WINDOW_MS
 */
export const transactionLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_TRANSACTION_WINDOW_MS,
  max: env.RATE_LIMIT_TRANSACTION_MAX,
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    transactionLogger.rateLimitHit({
      ip,
      endpoint: 'POST /transactions',
      limit: env.RATE_LIMIT_TRANSACTION_MAX,
    });
    res.status(429).json(rateLimitResponse);
  },
});

/**
 * Webhook rate limiter
 *
 * Reasoning:
 * - Must be more permissive than transaction limiter
 * - Midtrans may retry failed webhooks
 * - Multiple transactions can complete simultaneously
 * - Don't want to block legitimate payment notifications
 *
 * Default: 100 requests per 1 minute per IP
 * Configurable via RATE_LIMIT_WEBHOOK_MAX and RATE_LIMIT_WEBHOOK_WINDOW_MS
 *
 * Note: In production, consider also implementing IP whitelist for Midtrans
 */
export const webhookLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WEBHOOK_WINDOW_MS,
  max: env.RATE_LIMIT_WEBHOOK_MAX,
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    transactionLogger.rateLimitHit({
      ip,
      endpoint: 'POST /transactions/webhook',
      limit: env.RATE_LIMIT_WEBHOOK_MAX,
    });
    res.status(429).json(rateLimitResponse);
  },
});