/**
 * Transaction Validation Schemas
 *
 * Zod schemas for validating transaction-related requests.
 * Uses shared schemas from common.schemas.ts for consistency.
 */

import { z } from 'zod';
import { TransactionStatus } from '@prisma/client';
import {
  createIdParamSchema,
  createPaginationSchema,
  createOptionalIdQuerySchema,
} from '@/shared/validation/common.schemas';

// Reusable ID schemas for this module
const transactionIdParamSchema = createIdParamSchema('Transaction ID');
const examIdParamSchema = createIdParamSchema('Exam ID');

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
    id: transactionIdParamSchema,
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
    ...createPaginationSchema(),
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
    examId: createOptionalIdQuerySchema('Exam ID'),
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
    examId: examIdParamSchema,
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
    id: transactionIdParamSchema,
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
    id: transactionIdParamSchema,
  }),
});

export type SyncTransactionParams = z.infer<typeof syncTransactionSchema>['params'];
