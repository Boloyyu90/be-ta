/**
 * Transaction Service
 *
 * Business logic for payment transactions.
 * Integrates with Midtrans for payment processing.
 *
 * Follows the same pattern as other services (auth.service.ts, exams.service.ts).
 */

import { TransactionStatus, Prisma } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '@/config/database';
import { snap, coreApi, midtransConfig } from '@/config/midtrans';
import {
  AppError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
} from '@/shared/errors/app-errors';
import { HTTP_STATUS } from '@/config/constants';
import { transactionLogger } from '@/shared/utils/logger';
import {
  CreateTransactionInput,
  ListTransactionsQuery,
  TransactionResponse,
  CreateTransactionResponse,
  ExamAccessResponse,
  MidtransNotification,
  MidtransSnapParameter,
  MIDTRANS_STATUS_MAP,
  TRANSACTION_EXPIRY_HOURS,
} from './transactions.types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique order ID for Midtrans
 * Format: TRX-{timestamp}-{random}
 */
function generateOrderId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TRX-${timestamp}-${random}`;
}

/**
 * Calculate expiry date for transaction
 */
function calculateExpiryDate(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + TRANSACTION_EXPIRY_HOURS);
  return expiry;
}

/**
 * Verify Midtrans signature for webhook security
 * Uses constant-time comparison to prevent timing attacks
 */
function verifySignature(notification: MidtransNotification): boolean {
  const serverKey = midtransConfig.serverKey;
  const orderId = notification.order_id;
  const statusCode = notification.status_code;
  const grossAmount = notification.gross_amount;

  const payload = orderId + statusCode + grossAmount + serverKey;
  const expectedSignature = crypto
    .createHash('sha512')
    .update(payload)
    .digest('hex');

  // Use constant-time comparison to prevent timing attacks
  try {
    const signatureBuffer = Buffer.from(notification.signature_key || '', 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    // Buffers must be same length for timingSafeEqual
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Create a new transaction for purchasing exam access
 */
export const createTransaction = async (
  userId: number,
  input: CreateTransactionInput
): Promise<CreateTransactionResponse> => {
  const { examId } = input;

  // 1. Validate Midtrans is configured
  if (!midtransConfig.isConfigured()) {
    throw new AppError('Payment gateway is not configured', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  // 2. Get exam details
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, title: true, price: true },
  });

  if (!exam) {
    throw new NotFoundError('Exam not found');
  }

  // 3. Check if exam is free
  if (!exam.price || exam.price === 0) {
    throw new BadRequestError('This exam is free and does not require payment');
  }

  // 4. Check for existing PAID transaction
  const existingPaid = await prisma.transaction.findFirst({
    where: {
      userId,
      examId,
      status: TransactionStatus.PAID,
    },
  });

  if (existingPaid) {
    throw new ConflictError('You already have access to this exam');
  }

  // 5. Check for existing PENDING transaction (return it instead of creating new)
  const existingPending = await prisma.transaction.findFirst({
    where: {
      userId,
      examId,
      status: TransactionStatus.PENDING,
      expiredAt: { gt: new Date() },
    },
    include: { exam: { select: { id: true, title: true, price: true } } },
  });

  if (existingPending) {
    return {
      transaction: existingPending as TransactionResponse,
      snapToken: existingPending.snapToken || '',
      snapRedirectUrl: existingPending.snapRedirectUrl || '',
      clientKey: midtransConfig.getClientKey(),
    };
  }

  // 6. Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // 7. Generate order ID and expiry
  const orderId = generateOrderId();
  const expiredAt = calculateExpiryDate();

  // 8. Create Midtrans Snap transaction
  const snapParameter: MidtransSnapParameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: exam.price,
    },
    customer_details: {
      first_name: user.name,
      email: user.email,
    },
    item_details: [
      {
        id: `EXAM-${exam.id}`,
        price: exam.price,
        quantity: 1,
        name: exam.title.substring(0, 50), // Midtrans limit
      },
    ],
    expiry: {
      unit: 'hour',
      duration: TRANSACTION_EXPIRY_HOURS,
    },
  };

  // 9. Log transaction creation request
  transactionLogger.createRequested({ userId, examId, amount: exam.price });

  // 10. Call Midtrans API
  let snapResponse: { token?: string; redirect_url?: string };
  try {
    snapResponse = await snap.createTransaction(snapParameter);
  } catch (error) {
    transactionLogger.createFailed({ userId, examId, orderId }, error as Error);
    throw new AppError(
      'Failed to initialize payment. Please try again later.',
      HTTP_STATUS.BAD_GATEWAY
    );
  }

  // 11. Validate Midtrans response
  if (!snapResponse.token || !snapResponse.redirect_url) {
    transactionLogger.createFailed(
      { userId, examId, orderId },
      new Error('Invalid Midtrans response - missing token or redirect_url')
    );
    throw new AppError(
      'Payment gateway returned invalid response. Please try again later.',
      HTTP_STATUS.BAD_GATEWAY
    );
  }

  // 12. Save transaction to database
  const transaction = await prisma.transaction.create({
    data: {
      orderId,
      userId,
      examId,
      amount: exam.price,
      status: TransactionStatus.PENDING,
      snapToken: snapResponse.token,
      snapRedirectUrl: snapResponse.redirect_url,
      expiredAt,
      metadata: { snap_response: snapResponse } as unknown as Prisma.InputJsonObject,
    },
    include: {
      exam: { select: { id: true, title: true, price: true } },
    },
  });

  // 13. Log success
  transactionLogger.createSuccess({
    userId,
    examId,
    orderId,
    transactionId: transaction.id,
    amount: exam.price,
  });

  return {
    transaction: transaction as TransactionResponse,
    snapToken: snapResponse.token,
    snapRedirectUrl: snapResponse.redirect_url,
    clientKey: midtransConfig.getClientKey(),
  };
};

/**
 * Get transaction by ID
 */
export const getTransactionById = async (
  transactionId: number,
  userId?: number
): Promise<TransactionResponse | null> => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      exam: { select: { id: true, title: true, price: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Check ownership if userId provided
  if (transaction && userId && transaction.userId !== userId) {
    return null;
  }

  return transaction as TransactionResponse | null;
};

/**
 * Get transaction by Midtrans Order ID
 */
export const getTransactionByOrderId = async (
  orderId: string
): Promise<TransactionResponse | null> => {
  const transaction = await prisma.transaction.findUnique({
    where: { orderId },
    include: {
      exam: { select: { id: true, title: true, price: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return transaction as TransactionResponse | null;
};

/**
 * List transactions with pagination and filters
 */
export const listTransactions = async (
  userId: number,
  query: ListTransactionsQuery,
  isAdmin: boolean = false
) => {
  const { page = 1, limit = 10, status, examId, sortOrder = 'desc' } = query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.TransactionWhereInput = {};

  // Non-admin can only see their own transactions
  if (!isAdmin) {
    where.userId = userId;
  }

  if (status) {
    where.status = status;
  }

  if (examId) {
    where.examId = examId;
  }

  // Get total count
  const total = await prisma.transaction.count({ where });

  // Get transactions
  const transactions = await prisma.transaction.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: sortOrder },
    include: {
      exam: { select: { id: true, title: true, price: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const totalPages = Math.ceil(total / limit);

  return {
    data: transactions as TransactionResponse[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

/**
 * Check if user has access to an exam
 */
export const checkExamAccess = async (
  userId: number,
  examId: number
): Promise<ExamAccessResponse> => {
  // 1. Get exam details
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, title: true, price: true },
  });

  if (!exam) {
    throw new NotFoundError('Exam not found');
  }

  // 2. If exam is free, grant access
  if (!exam.price || exam.price === 0) {
    return {
      hasAccess: true,
      reason: 'free',
      transaction: null,
      exam,
    };
  }

  // 3. Check for PAID transaction
  const paidTransaction = await prisma.transaction.findFirst({
    where: {
      userId,
      examId,
      status: TransactionStatus.PAID,
    },
    include: {
      exam: { select: { id: true, title: true, price: true } },
    },
  });

  if (paidTransaction) {
    return {
      hasAccess: true,
      reason: 'paid',
      transaction: paidTransaction as TransactionResponse,
      exam,
    };
  }

  // 4. Check for PENDING transaction
  const pendingTransaction = await prisma.transaction.findFirst({
    where: {
      userId,
      examId,
      status: TransactionStatus.PENDING,
      expiredAt: { gt: new Date() },
    },
    include: {
      exam: { select: { id: true, title: true, price: true } },
    },
  });

  if (pendingTransaction) {
    return {
      hasAccess: false,
      reason: 'pending',
      transaction: pendingTransaction as TransactionResponse,
      exam,
    };
  }

  // 5. No valid transaction found
  return {
    hasAccess: false,
    reason: 'not_purchased',
    transaction: null,
    exam,
  };
};

/**
 * Handle Midtrans webhook notification
 * Uses database transaction for atomicity and idempotency
 */
export const handleWebhookNotification = async (
  notification: MidtransNotification
): Promise<TransactionResponse> => {
  const orderId = notification.order_id;

  // 1. Log webhook received
  transactionLogger.webhookReceived({
    orderId,
    status: notification.transaction_status,
    paymentType: notification.payment_type,
  });

  // 2. Verify signature (important for security!)
  if (!verifySignature(notification)) {
    transactionLogger.webhookInvalidSignature(orderId);
    throw new UnauthorizedError('Invalid signature');
  }

  transactionLogger.webhookVerified(orderId);

  // 3. Map Midtrans status to our status
  const newStatus =
    MIDTRANS_STATUS_MAP[notification.transaction_status] || TransactionStatus.PENDING;

  // 4. Use database transaction for atomicity and race condition prevention
  const updatedTransaction = await prisma.$transaction(async (tx) => {
    // Find transaction with lock (serializable read)
    const transaction = await tx.transaction.findUnique({
      where: { orderId },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    const oldStatus = transaction.status;

    // Idempotency check: if status already same, return existing transaction
    // This prevents duplicate updates from multiple webhook calls
    if (transaction.status === newStatus) {
      transactionLogger.webhookIdempotent({ orderId, status: newStatus });
      return tx.transaction.findUnique({
        where: { id: transaction.id },
        include: {
          exam: { select: { id: true, title: true, price: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }

    // Prevent status regression (e.g., PAID -> PENDING)
    const statusPriority: Record<TransactionStatus, number> = {
      [TransactionStatus.PENDING]: 1,
      [TransactionStatus.PAID]: 5,
      [TransactionStatus.EXPIRED]: 4,
      [TransactionStatus.CANCELLED]: 3,
      [TransactionStatus.FAILED]: 2,
      [TransactionStatus.REFUNDED]: 6,
    };

    if (statusPriority[newStatus] < statusPriority[transaction.status]) {
      transactionLogger.webhookIdempotent({ orderId, status: transaction.status });
      return tx.transaction.findUnique({
        where: { id: transaction.id },
        include: {
          exam: { select: { id: true, title: true, price: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }

    // Determine paid timestamp
    const paidAt = newStatus === TransactionStatus.PAID ? new Date() : transaction.paidAt;

    // Update transaction
    const updated = await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        paymentType: notification.payment_type,
        paidAt,
        metadata: notification as unknown as Prisma.InputJsonObject,
      },
      include: {
        exam: { select: { id: true, title: true, price: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    transactionLogger.webhookProcessed({ orderId, oldStatus, newStatus });

    return updated;
  });

  if (!updatedTransaction) {
    throw new NotFoundError('Transaction not found after update');
  }

  return updatedTransaction as TransactionResponse;
};

/**
 * Cancel a pending transaction
 */
export const cancelTransaction = async (
  transactionId: number,
  userId: number
): Promise<TransactionResponse> => {
  // 1. Find transaction
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new NotFoundError('Transaction not found');
  }

  // 2. Check ownership
  if (transaction.userId !== userId) {
    throw new ForbiddenError('Unauthorized');
  }

  // 3. Check if can be cancelled
  if (transaction.status !== TransactionStatus.PENDING) {
    throw new BadRequestError('Only pending transactions can be cancelled');
  }

  // 4. Update status
  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: TransactionStatus.CANCELLED,
      metadata: {
        ...(transaction.metadata as object),
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'user',
      } as unknown as Prisma.InputJsonObject,
    },
    include: {
      exam: { select: { id: true, title: true, price: true } },
    },
  });

  return updatedTransaction as TransactionResponse;
};

/**
 * Sync transaction status from Midtrans (manual check)
 */
export const syncTransactionStatus = async (orderId: string): Promise<TransactionResponse> => {
  // Get status from Midtrans
  const statusResponse = await coreApi.transaction.status(orderId);

  // Process as webhook notification
  return handleWebhookNotification(statusResponse as unknown as MidtransNotification);
};

/**
 * Get Midtrans client key for frontend
 */
export const getClientKey = (): string => {
  return midtransConfig.getClientKey();
};

// ============================================================================
// MAINTENANCE FUNCTIONS
// ============================================================================

/**
 * Result type for cleanup operations
 */
export interface CleanupResult {
  expiredCount: number;
  updatedIds: number[];
  errors: Array<{ id: number; error: string }>;
}

/**
 * Mark expired PENDING transactions as EXPIRED
 *
 * This function should be called periodically (e.g., via cron job)
 * to clean up transactions that have passed their expiry time.
 *
 * @returns CleanupResult with count of updated transactions
 *
 * @example
 * // Call from a cron job or maintenance endpoint
 * const result = await cleanupExpiredTransactions();
 * console.log(`Cleaned up ${result.expiredCount} expired transactions`);
 */
export const cleanupExpiredTransactions = async (): Promise<CleanupResult> => {
  const now = new Date();

  // Find all PENDING transactions that have expired
  const expiredTransactions = await prisma.transaction.findMany({
    where: {
      status: TransactionStatus.PENDING,
      expiredAt: { lt: now },
    },
    select: { id: true, orderId: true, expiredAt: true },
  });

  if (expiredTransactions.length === 0) {
    return { expiredCount: 0, updatedIds: [], errors: [] };
  }

  const updatedIds: number[] = [];
  const errors: Array<{ id: number; error: string }> = [];

  // Update each transaction individually to handle errors gracefully
  for (const tx of expiredTransactions) {
    try {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: TransactionStatus.EXPIRED,
          metadata: {
            expired_by: 'system_cleanup',
            expired_at: now.toISOString(),
            original_expiry: tx.expiredAt?.toISOString(),
          } as unknown as Prisma.InputJsonObject,
        },
      });
      updatedIds.push(tx.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ id: tx.id, error: errorMessage });
    }
  }

  return {
    expiredCount: updatedIds.length,
    updatedIds,
    errors,
  };
};

/**
 * Get transaction statistics for monitoring
 *
 * @returns Object with transaction counts by status
 */
export const getTransactionStats = async () => {
  const stats = await prisma.transaction.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  const result: Record<string, number> = {};
  for (const stat of stats) {
    result[stat.status] = stat._count.status;
  }

  // Add pending that are expired but not yet cleaned up
  const expiredPending = await prisma.transaction.count({
    where: {
      status: TransactionStatus.PENDING,
      expiredAt: { lt: new Date() },
    },
  });

  return {
    byStatus: result,
    pendingExpired: expiredPending,
    total: Object.values(result).reduce((a, b) => a + b, 0),
  };
};