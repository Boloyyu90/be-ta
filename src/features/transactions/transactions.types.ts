/**
 * Transaction Types
 *
 * Type definitions for the Transaction feature.
 * Follows the same pattern as other features (questions.types.ts, exams.types.ts).
 */

import { TransactionStatus, Transaction, Exam, User } from '@prisma/client';

// ============================================================================
// DATABASE TYPES (from Prisma)
// ============================================================================

/**
 * Transaction with related exam info
 */
export interface TransactionWithExam extends Transaction {
  exam: Pick<Exam, 'id' | 'title' | 'price'>;
}

/**
 * Transaction with related user info
 */
export interface TransactionWithUser extends Transaction {
  user: Pick<User, 'id' | 'name' | 'email'>;
}

/**
 * Full transaction with all relations
 */
export interface TransactionWithRelations extends Transaction {
  exam: Pick<Exam, 'id' | 'title' | 'price'>;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Request body for creating a new transaction
 * POST /api/v1/transactions
 */
export interface CreateTransactionInput {
  examId: number;
}

/**
 * Query parameters for listing transactions
 * GET /api/v1/transactions
 */
export interface ListTransactionsQuery {
  page?: number;
  limit?: number;
  status?: TransactionStatus;
  examId?: number;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Standard transaction response
 */
export interface TransactionResponse {
  id: number;
  orderId: string;
  userId: number;
  examId: number;
  amount: number;
  status: TransactionStatus;
  paymentType: string | null;
  snapToken: string | null;
  snapRedirectUrl: string | null;
  paidAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  exam?: {
    id: number;
    title: string;
    price: number | null;
  };
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

/**
 * Response after creating a transaction (includes Snap token for payment)
 */
export interface CreateTransactionResponse {
  transaction: TransactionResponse;
  snapToken: string;
  snapRedirectUrl: string;
  clientKey: string;
}

/**
 * Response for checking exam access
 * GET /api/v1/transactions/exam/:examId/access
 */
export interface ExamAccessResponse {
  hasAccess: boolean;
  reason: 'free' | 'paid' | 'pending' | 'not_purchased';
  transaction: TransactionResponse | null;
  exam: {
    id: number;
    title: string;
    price: number | null;
  };
}

// ============================================================================
// MIDTRANS TYPES
// ============================================================================

/**
 * Midtrans Snap transaction parameter
 */
export interface MidtransSnapParameter {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  customer_details: {
    first_name: string;
    email: string;
  };
  item_details: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
  callbacks?: {
    finish?: string;
    error?: string;
    pending?: string;
  };
  expiry?: {
    unit: 'minute' | 'hour' | 'day';
    duration: number;
  };
}

/**
 * Midtrans webhook/notification payload
 */
export interface MidtransNotification {
  transaction_time: string;
  transaction_status: string;
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string;
  currency: string;
  va_numbers?: Array<{
    va_number: string;
    bank: string;
  }>;
  issuer?: string;
  acquirer?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Map Midtrans transaction_status to our TransactionStatus enum
 */
export const MIDTRANS_STATUS_MAP: Record<string, TransactionStatus> = {
  capture: TransactionStatus.PAID,
  settlement: TransactionStatus.PAID,
  pending: TransactionStatus.PENDING,
  deny: TransactionStatus.FAILED,
  cancel: TransactionStatus.CANCELLED,
  expire: TransactionStatus.EXPIRED,
  failure: TransactionStatus.FAILED,
  refund: TransactionStatus.REFUNDED,
  partial_refund: TransactionStatus.REFUNDED,
};

/**
 * Transaction expiry duration (in hours)
 */
export const TRANSACTION_EXPIRY_HOURS = 24;