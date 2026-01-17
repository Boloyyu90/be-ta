/**
 * Transaction Public Routes
 *
 * Public routes for Midtrans webhook notifications.
 * These routes do NOT require authentication.
 *
 * Mounted at: /api/v1/transactions
 * Authorization: Public (no auth required)
 *
 * IMPORTANT: The webhook endpoint must be publicly accessible
 * for Midtrans to send payment notifications.
 *
 * @see src/routes/v1.route.ts for mounting
 */

import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { webhookLimiter } from '@/shared/middleware/rate-limit.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as transactionsController from '../transactions.controller';
import * as transactionsValidation from '../transactions.validation';

export const publicTransactionsRouter = Router();

// =================================================================
// PUBLIC TRANSACTION ROUTES (Webhook)
// Mounted at: /api/v1/transactions
// Authorization: Public (no authentication required)
// =================================================================

/**
 * @route   POST /api/v1/transactions/webhook
 * @desc    Handle Midtrans payment notification (webhook)
 * @access  Public (called by Midtrans servers)
 * @rateLimit 100 requests per 1 minute per IP
 *
 * IMPORTANT:
 * - This endpoint is called by Midtrans when payment status changes
 * - Must return 200 OK to acknowledge receipt
 * - Signature verification is done in the service layer
 * - Do NOT add authentication middleware to this route
 */
publicTransactionsRouter.post(
  '/webhook',
  webhookLimiter,
  validate(transactionsValidation.webhookNotificationSchema),
  asyncHandler(transactionsController.handleWebhook)
);