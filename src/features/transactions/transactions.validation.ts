/**
 * Transaction Validation Schemas
 *
 * Zod schemas for validating transaction-related requests.
 * Follows the same pattern as other features (auth.validation.ts, questions.validation.ts).
 */

import { z } from 'zod';
import { TransactionStatus } from '@prisma/client';

// ============================================================================
// CREATE TRANSACTION
// ============================================================================

/**
 * POST /api/v1/transactions
 * Create new transaction for purchasing exam access
 */
export const createTransactionSchema = z.object({
  body: z.object({
    examId: z
      .number({
        required_error: 'Exam ID is required',
        invalid_type_error: 'Exam ID must be a number',
      })
      .int('Exam ID must be an integer')
      .positive('Exam ID must be positive'),
  }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];

// ============================================================================
// GET TRANSACTION BY ID
// ============================================================================

/**
 * GET /api/v1/transactions/:id
 */
export const getTransactionSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val > 0, {
        message: 'Transaction ID must be a positive integer',
      }),
  }),
});

export type GetTransactionParams = z.infer<typeof getTransactionSchema>['params'];

// ============================================================================
// GET TRANSACTION BY ORDER ID
// ============================================================================

/**
 * GET /api/v1/transactions/order/:orderId
 */
export const getTransactionByOrderIdSchema = z.object({
  params: z.object({
    orderId: z
      .string({
        required_error: 'Order ID is required',
      })
      .min(1, 'Order ID cannot be empty'),
  }),
});

export type GetTransactionByOrderIdParams = z.infer<typeof getTransactionByOrderIdSchema>['params'];

// ============================================================================
// LIST TRANSACTIONS
// ============================================================================

/**
 * GET /api/v1/transactions
 * List transactions with pagination and filters
 */
export const listTransactionsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val >= 1, { message: 'Page must be at least 1' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine((val) => val >= 1 && val <= 100, {
        message: 'Limit must be between 1 and 100',
      }),
    status: z
      .enum([
        TransactionStatus.PENDING,
        TransactionStatus.PAID,
        TransactionStatus.EXPIRED,
        TransactionStatus.CANCELLED,
        TransactionStatus.FAILED,
        TransactionStatus.REFUNDED,
      ])
      .optional(),
    examId: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val) => val === undefined || val > 0, {
        message: 'Exam ID must be a positive integer',
      }),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsSchema>['query'];

// ============================================================================
// CHECK EXAM ACCESS
// ============================================================================

/**
 * GET /api/v1/transactions/exam/:examId/access
 */
export const checkExamAccessSchema = z.object({
  params: z.object({
    examId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val > 0, {
        message: 'Exam ID must be a positive integer',
      }),
  }),
});

export type CheckExamAccessParams = z.infer<typeof checkExamAccessSchema>['params'];

// ============================================================================
// MIDTRANS WEBHOOK
// ============================================================================

/**
 * POST /api/v1/transactions/webhook
 * Handle Midtrans payment notification
 */
export const webhookNotificationSchema = z.object({
  body: z
    .object({
      transaction_time: z.string(),
      transaction_status: z.string(),
      transaction_id: z.string(),
      status_message: z.string(),
      status_code: z.string(),
      signature_key: z.string(),
      payment_type: z.string(),
      order_id: z.string(),
      merchant_id: z.string(),
      gross_amount: z.string(),
      fraud_status: z.string().optional(),
      currency: z.string().optional(),
    })
    .passthrough(), // Allow additional fields from Midtrans
});

export type WebhookNotificationBody = z.infer<typeof webhookNotificationSchema>['body'];

// ============================================================================
// CANCEL TRANSACTION
// ============================================================================

/**
 * POST /api/v1/transactions/:id/cancel
 */
export const cancelTransactionSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val > 0, {
        message: 'Transaction ID must be a positive integer',
      }),
  }),
});

export type CancelTransactionParams = z.infer<typeof cancelTransactionSchema>['params'];

// ============================================================================
// SYNC TRANSACTION STATUS
// ============================================================================

/**
 * POST /api/v1/transactions/:id/sync
 */
export const syncTransactionSchema = z.object({
  params: z.object({
    id: z
      .string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val > 0, {
        message: 'Transaction ID must be a positive integer',
      }),
  }),
});

export type SyncTransactionParams = z.infer<typeof syncTransactionSchema>['params'];