/**
 * Transaction Controller
 *
 * Handles HTTP requests for transaction endpoints.
 * Delegates business logic to the transaction service.
 *
 * Follows the same pattern as other controllers (auth.controller.ts, exams.controller.ts).
 */

import { Request, Response } from 'express';
import * as transactionsService from './transactions.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { MidtransNotification } from './transactions.types';

// ============================================================================
// PARTICIPANT CONTROLLERS
// ============================================================================

/**
 * Create transaction
 * POST /api/v1/transactions
 *
 * @access Authenticated (Participant)
 */
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { examId } = req.body;

  const result = await transactionsService.createTransaction(userId, { examId });

  sendSuccess(res, result, 'Transaction created successfully', HTTP_STATUS.CREATED);
};

/**
 * List user's transactions
 * GET /api/v1/transactions
 *
 * @access Authenticated (Participant)
 */
export const listMyTransactions = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { page, limit, status, examId, sortOrder } = req.query;

  const result = await transactionsService.listTransactions(
    userId,
    {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as any,
      examId: examId ? Number(examId) : undefined,
      sortOrder: sortOrder as 'asc' | 'desc',
    },
    false // isAdmin = false
  );

  sendSuccess(
    res,
    { transactions: result.data, pagination: result.pagination },
    'Transactions retrieved successfully',
    HTTP_STATUS.OK
  );
};

/**
 * Get transaction by ID
 * GET /api/v1/transactions/:id
 *
 * @access Authenticated (Participant - own transactions only)
 */
export const getTransaction = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const transactionId = Number(req.params.id);

  const transaction = await transactionsService.getTransactionById(transactionId, userId);

  if (!transaction) {
    sendSuccess(res, null, 'Transaction not found', HTTP_STATUS.NOT_FOUND);
    return;
  }

  sendSuccess(res, { transaction }, 'Transaction retrieved successfully', HTTP_STATUS.OK);
};

/**
 * Get transaction by Order ID
 * GET /api/v1/transactions/order/:orderId
 *
 * @access Authenticated (Participant - own transactions only)
 */
export const getTransactionByOrderId = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { orderId } = req.params;

  const transaction = await transactionsService.getTransactionByOrderId(orderId);

  if (!transaction || transaction.userId !== userId) {
    sendSuccess(res, null, 'Transaction not found', HTTP_STATUS.NOT_FOUND);
    return;
  }

  sendSuccess(res, { transaction }, 'Transaction retrieved successfully', HTTP_STATUS.OK);
};

/**
 * Check exam access
 * GET /api/v1/transactions/exam/:examId/access
 *
 * @access Authenticated (Participant)
 */
export const checkExamAccess = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const examId = Number(req.params.examId);

  const result = await transactionsService.checkExamAccess(userId, examId);

  const message = result.hasAccess
    ? 'User has access to this exam'
    : 'User does not have access to this exam';

  sendSuccess(res, result, message, HTTP_STATUS.OK);
};

/**
 * Cancel transaction
 * POST /api/v1/transactions/:id/cancel
 *
 * @access Authenticated (Participant - own transactions only)
 */
export const cancelTransaction = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const transactionId = Number(req.params.id);

  const transaction = await transactionsService.cancelTransaction(transactionId, userId);

  sendSuccess(res, { transaction }, 'Transaction cancelled successfully', HTTP_STATUS.OK);
};

/**
 * Sync transaction status from Midtrans
 * POST /api/v1/transactions/:id/sync
 *
 * @access Authenticated (Participant - own transactions only)
 */
export const syncTransaction = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const transactionId = Number(req.params.id);

  // Get transaction first to verify ownership and get orderId
  const existing = await transactionsService.getTransactionById(transactionId, userId);

  if (!existing) {
    sendSuccess(res, null, 'Transaction not found', HTTP_STATUS.NOT_FOUND);
    return;
  }

  const transaction = await transactionsService.syncTransactionStatus(existing.orderId);

  sendSuccess(res, { transaction }, 'Transaction status synced successfully', HTTP_STATUS.OK);
};

/**
 * Get Midtrans client key
 * GET /api/v1/transactions/config/client-key
 *
 * @access Authenticated
 */
export const getClientKey = async (req: Request, res: Response): Promise<void> => {
  const clientKey = transactionsService.getClientKey();

  sendSuccess(res, { clientKey }, 'Client key retrieved successfully', HTTP_STATUS.OK);
};

// ============================================================================
// ADMIN CONTROLLERS
// ============================================================================

/**
 * List all transactions (Admin)
 * GET /api/v1/admin/transactions
 *
 * @access Admin only
 */
export const listAllTransactions = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { page, limit, status, examId, sortOrder } = req.query;

  const result = await transactionsService.listTransactions(
    userId,
    {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as any,
      examId: examId ? Number(examId) : undefined,
      sortOrder: sortOrder as 'asc' | 'desc',
    },
    true // isAdmin = true (can see all transactions)
  );

  sendSuccess(
    res,
    { transactions: result.data, pagination: result.pagination },
    'All transactions retrieved successfully',
    HTTP_STATUS.OK
  );
};

/**
 * Get any transaction by ID (Admin)
 * GET /api/v1/admin/transactions/:id
 *
 * @access Admin only
 */
export const getTransactionAdmin = async (req: Request, res: Response): Promise<void> => {
  const transactionId = Number(req.params.id);

  // Admin can see any transaction (no userId filter)
  const transaction = await transactionsService.getTransactionById(transactionId);

  if (!transaction) {
    sendSuccess(res, null, 'Transaction not found', HTTP_STATUS.NOT_FOUND);
    return;
  }

  sendSuccess(res, { transaction }, 'Transaction retrieved successfully', HTTP_STATUS.OK);
};

// ============================================================================
// PUBLIC CONTROLLERS (Webhook)
// ============================================================================

/**
 * Handle Midtrans webhook notification
 * POST /api/v1/transactions/webhook
 *
 * @access Public (called by Midtrans)
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const notification = req.body as MidtransNotification;

  console.log('[WEBHOOK] Received notification:', {
    order_id: notification.order_id,
    transaction_status: notification.transaction_status,
    payment_type: notification.payment_type,
  });

  try {
    const transaction = await transactionsService.handleWebhookNotification(notification);

    // Midtrans expects 200 OK response
    sendSuccess(
      res,
      { transactionId: transaction.id, status: transaction.status },
      'Webhook processed successfully',
      HTTP_STATUS.OK
    );
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    // Still return 200 to prevent Midtrans from retrying
    // Log error for debugging but don't expose to Midtrans
    sendSuccess(
      res,
      { processed: false },
      'Webhook received',
      HTTP_STATUS.OK
    );
  }
};

// ============================================================================
// ADMIN MAINTENANCE CONTROLLERS
// ============================================================================

/**
 * Cleanup expired transactions (Admin)
 * POST /api/v1/admin/transactions/cleanup
 *
 * @access Admin only
 */
export const cleanupExpiredTransactions = async (req: Request, res: Response): Promise<void> => {
  const result = await transactionsService.cleanupExpiredTransactions();

  sendSuccess(
    res,
    result,
    `Cleanup completed: ${result.expiredCount} transactions marked as expired`,
    HTTP_STATUS.OK
  );
};

/**
 * Get transaction statistics (Admin)
 * GET /api/v1/admin/transactions/stats
 *
 * @access Admin only
 */
export const getTransactionStats = async (req: Request, res: Response): Promise<void> => {
  const stats = await transactionsService.getTransactionStats();

  sendSuccess(res, stats, 'Transaction statistics retrieved successfully', HTTP_STATUS.OK);
};