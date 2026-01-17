/**
 * Transaction Participant Routes
 *
 * Routes for authenticated users to manage their transactions.
 *
 * Mounted at: /api/v1/transactions
 * Authorization: Authenticated (enforced at parent router level)
 *
 * @see src/routes/v1.route.ts for mounting
 */

import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { transactionLimiter } from '@/shared/middleware/rate-limit.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as transactionsController from '../transactions.controller';
import * as transactionsValidation from '../transactions.validation';

export const participantTransactionsRouter = Router();

// =================================================================
// TRANSACTION ROUTES
// Mounted at: /api/v1/transactions
// Authorization: Authenticated (enforced at parent router level)
// =================================================================

/**
 * @route   GET /api/v1/transactions/config/client-key
 * @desc    Get Midtrans client key for frontend
 * @access  Authenticated
 */
participantTransactionsRouter.get(
  '/config/client-key',
  asyncHandler(transactionsController.getClientKey)
);

/**
 * @route   GET /api/v1/transactions/exam/:examId/access
 * @desc    Check if user has access to an exam
 * @access  Authenticated
 */
participantTransactionsRouter.get(
  '/exam/:examId/access',
  validate(transactionsValidation.checkExamAccessSchema),
  asyncHandler(transactionsController.checkExamAccess)
);

/**
 * @route   GET /api/v1/transactions/order/:orderId
 * @desc    Get transaction by Midtrans order ID
 * @access  Authenticated (own transactions only)
 */
participantTransactionsRouter.get(
  '/order/:orderId',
  validate(transactionsValidation.getTransactionByOrderIdSchema),
  asyncHandler(transactionsController.getTransactionByOrderId)
);

/**
 * @route   POST /api/v1/transactions
 * @desc    Create new transaction (initiate payment)
 * @access  Authenticated
 * @rateLimit 10 requests per 15 minutes per IP
 */
participantTransactionsRouter.post(
  '/',
  transactionLimiter,
  validate(transactionsValidation.createTransactionSchema),
  asyncHandler(transactionsController.createTransaction)
);

/**
 * @route   GET /api/v1/transactions
 * @desc    List user's transactions
 * @access  Authenticated (own transactions only)
 */
participantTransactionsRouter.get(
  '/',
  validate(transactionsValidation.listTransactionsSchema),
  asyncHandler(transactionsController.listMyTransactions)
);

/**
 * @route   GET /api/v1/transactions/:id
 * @desc    Get transaction by ID
 * @access  Authenticated (own transactions only)
 */
participantTransactionsRouter.get(
  '/:id',
  validate(transactionsValidation.getTransactionSchema),
  asyncHandler(transactionsController.getTransaction)
);

/**
 * @route   POST /api/v1/transactions/:id/cancel
 * @desc    Cancel a pending transaction
 * @access  Authenticated (own transactions only)
 */
participantTransactionsRouter.post(
  '/:id/cancel',
  validate(transactionsValidation.cancelTransactionSchema),
  asyncHandler(transactionsController.cancelTransaction)
);

/**
 * @route   POST /api/v1/transactions/:id/sync
 * @desc    Manually sync transaction status from Midtrans
 * @access  Authenticated (own transactions only)
 */
participantTransactionsRouter.post(
  '/:id/sync',
  validate(transactionsValidation.syncTransactionSchema),
  asyncHandler(transactionsController.syncTransaction)
);