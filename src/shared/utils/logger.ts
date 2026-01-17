import pino from 'pino';
import { env } from '@/config/env';

/**
 * Structured Logger dengan Pino
 *
 * Features:
 * - JSON format in production
 * - Pretty print in development
 * - Sensitive data sanitization
 * - Context-aware logging for transactions
 */

// Sensitive fields that should never be logged in full
const SENSITIVE_FIELDS = [
  'signature_key',
  'snapToken',
  'snap_token',
  'serverKey',
  'server_key',
  'clientKey',
  'client_key',
  'password',
  'token',
  'authorization',
];

/**
 * Redact sensitive values from objects for safe logging
 */
function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized: Record<string, unknown> = { ...obj };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    // Check if field is sensitive
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
      const value = sanitized[key];
      if (typeof value === 'string' && value.length > 0) {
        // Show first 4 and last 4 chars only
        sanitized[key] =
          value.length > 8
            ? `${value.slice(0, 4)}...${value.slice(-4)}`
            : '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    if (sanitized[key] && typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key] as Record<string, unknown>);
    }
  }

  return sanitized;
}

// Base logger instance
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  // Base fields included in all logs
  base: {
    env: env.NODE_ENV,
  },
});

// ============================================================================
// TRANSACTION-SPECIFIC LOGGING HELPERS
// ============================================================================

export interface TransactionLogContext {
  requestId?: string;
  userId?: number;
  orderId?: string;
  examId?: number;
  transactionId?: number;
  status?: string;
  [key: string]: unknown;
}

/**
 * Create a child logger with transaction context
 */
export function createTransactionLogger(context: TransactionLogContext) {
  return logger.child({ transaction: context });
}

/**
 * Log transaction events with consistent structure
 */
export const transactionLogger = {
  /**
   * Log when transaction creation is requested
   */
  createRequested: (context: TransactionLogContext & { amount?: number }) => {
    logger.info(
      { event: 'transaction.create.requested', ...sanitize(context) },
      `Transaction create requested for exam ${context.examId}`
    );
  },

  /**
   * Log when transaction is created successfully
   */
  createSuccess: (context: TransactionLogContext & { amount?: number }) => {
    logger.info(
      { event: 'transaction.create.success', ...sanitize(context) },
      `Transaction ${context.orderId} created successfully`
    );
  },

  /**
   * Log when transaction creation fails
   */
  createFailed: (context: TransactionLogContext, error: Error) => {
    logger.error(
      {
        event: 'transaction.create.failed',
        ...sanitize(context),
        error: {
          name: error.name,
          message: error.message,
          stack: env.NODE_ENV !== 'production' ? error.stack : undefined,
        },
      },
      `Transaction creation failed: ${error.message}`
    );
  },

  /**
   * Log webhook received
   */
  webhookReceived: (context: { orderId: string; status: string; paymentType?: string }) => {
    logger.info(
      { event: 'webhook.received', ...sanitize(context) },
      `Webhook received for order ${context.orderId}: ${context.status}`
    );
  },

  /**
   * Log webhook signature verified
   */
  webhookVerified: (orderId: string) => {
    logger.info(
      { event: 'webhook.verified', orderId },
      `Webhook signature verified for order ${orderId}`
    );
  },

  /**
   * Log webhook signature invalid
   */
  webhookInvalidSignature: (orderId: string) => {
    logger.warn(
      { event: 'webhook.invalid_signature', orderId },
      `Invalid webhook signature for order ${orderId}`
    );
  },

  /**
   * Log webhook processed (idempotent hit)
   */
  webhookIdempotent: (context: { orderId: string; status: string }) => {
    logger.info(
      { event: 'webhook.idempotent', ...context },
      `Webhook idempotent hit - order ${context.orderId} already has status ${context.status}`
    );
  },

  /**
   * Log webhook processed successfully
   */
  webhookProcessed: (context: { orderId: string; oldStatus: string; newStatus: string }) => {
    logger.info(
      { event: 'webhook.processed', ...context },
      `Webhook processed: ${context.orderId} ${context.oldStatus} -> ${context.newStatus}`
    );
  },

  /**
   * Log webhook processing failed
   */
  webhookFailed: (orderId: string, error: Error) => {
    logger.error(
      {
        event: 'webhook.failed',
        orderId,
        error: {
          name: error.name,
          message: error.message,
          stack: env.NODE_ENV !== 'production' ? error.stack : undefined,
        },
      },
      `Webhook processing failed for order ${orderId}: ${error.message}`
    );
  },

  /**
   * Log rate limit hit
   */
  rateLimitHit: (context: { ip: string; endpoint: string; limit: number }) => {
    logger.warn(
      { event: 'rate_limit.hit', ...context },
      `Rate limit hit: ${context.ip} on ${context.endpoint}`
    );
  },
};