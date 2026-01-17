/**
 * Transaction Admin Routes
 *
 * Routes for admin to manage and view all transactions.
 *
 * Mounted at: /api/v1/admin/transactions
 * Authorization: Admin only (enforced at parent router level)
 *
 * @see src/routes/v1.route.ts for mounting
 */

import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as transactionsController from '../transactions.controller';
import * as transactionsValidation from '../transactions.validation';

export const adminTransactionsRouter = Router();

// =================================================================
// ADMIN TRANSACTION ROUTES
// Mounted at: /api/v1/admin/transactions
// Authorization: Admin only (enforced at parent router level)
// =================================================================

/**
 * @route   GET /api/v1/admin/transactions
 * @desc    Get all transactions with pagination and filters
 * @access  Admin only
 */
adminTransactionsRouter.get(
  '/',
  validate(transactionsValidation.listTransactionsSchema),
  asyncHandler(transactionsController.listAllTransactions)
);

/**
 * @route   GET /api/v1/admin/transactions/stats
 * @desc    Get transaction statistics
 * @access  Admin only
 */
adminTransactionsRouter.get(
  '/stats',
  asyncHandler(transactionsController.getTransactionStats)
);

/**
 * @route   POST /api/v1/admin/transactions/cleanup
 * @desc    Cleanup expired transactions (mark PENDING as EXPIRED)
 * @access  Admin only
 */
adminTransactionsRouter.post(
  '/cleanup',
  asyncHandler(transactionsController.cleanupExpiredTransactions)
);

/**
 * @route   GET /api/v1/admin/transactions/:id
 * @desc    Get any transaction by ID
 * @access  Admin only
 */
adminTransactionsRouter.get(
  '/:id',
  validate(transactionsValidation.getTransactionSchema),
  asyncHandler(transactionsController.getTransactionAdmin)
);