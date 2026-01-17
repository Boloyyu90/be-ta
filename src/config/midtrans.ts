/**
 * Midtrans Configuration
 *
 * Configures the Midtrans payment gateway SDK.
 * Uses Snap for seamless payment popup integration.
 *
 * @see https://docs.midtrans.com/docs/snap-integration-guide
 */

import midtransClient from 'midtrans-client';
import { env } from './env';

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || '';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

// Validation warning (non-blocking for development)
if (!MIDTRANS_SERVER_KEY) {
  console.warn('[MIDTRANS] Warning: MIDTRANS_SERVER_KEY is not set. Payment features will not work.');
}

if (!MIDTRANS_CLIENT_KEY) {
  console.warn('[MIDTRANS] Warning: MIDTRANS_CLIENT_KEY is not set. Payment features will not work.');
}

// ============================================================================
// SNAP CLIENT (for creating transactions)
// ============================================================================

/**
 * Midtrans Snap client for creating payment transactions.
 * Used to generate Snap tokens for payment popup.
 */
export const snap = new midtransClient.Snap({
  isProduction: MIDTRANS_IS_PRODUCTION,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});

// ============================================================================
// CORE API CLIENT (for transaction status, refunds, etc.)
// ============================================================================

/**
 * Midtrans Core API client for checking transaction status.
 * Used for webhooks and manual status checks.
 */
export const coreApi = new midtransClient.CoreApi({
  isProduction: MIDTRANS_IS_PRODUCTION,
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
});

// ============================================================================
// CONFIGURATION EXPORT
// ============================================================================

export const midtransConfig = {
  serverKey: MIDTRANS_SERVER_KEY,
  clientKey: MIDTRANS_CLIENT_KEY,
  isProduction: MIDTRANS_IS_PRODUCTION,

  /**
   * Check if Midtrans is properly configured
   */
  isConfigured(): boolean {
    return !!(MIDTRANS_SERVER_KEY && MIDTRANS_CLIENT_KEY);
  },

  /**
   * Get client key for frontend use
   */
  getClientKey(): string {
    return MIDTRANS_CLIENT_KEY;
  },
};