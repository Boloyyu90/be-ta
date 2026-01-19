# Backend Audit Report: Transactions + Midtrans Snap Integration

**Audit Date:** 2026-01-19
**Auditor:** Senior Full-Stack Integration Engineer (AI-assisted)
**Repository:** Boloyyu90/be-ta
**Purpose:** Assess backend readiness for frontend integration
**Methodology:** Pressman & Maxim prototyping mindset (iterative, reliable, traceable)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Transaction Flow Overview](#2-transaction-flow-overview)
3. [Readiness Verdict](#3-readiness-verdict)
4. [Integration Contract Checklist](#4-integration-contract-checklist)
5. [Critical Gaps & Risks](#5-critical-gaps--risks)
6. [Patch Plan](#6-patch-plan)
7. [Test Plan](#7-test-plan)
8. [Frontend Integration Guide](#8-frontend-integration-guide)
9. [Security Checklist](#9-security-checklist)
10. [Appendix](#10-appendix)

---

## 1. Executive Summary

### Scope of Audit

| Area | Files Reviewed |
|------|----------------|
| Transaction Service | `src/features/transactions/transactions.service.ts` |
| Transaction Controller | `src/features/transactions/transactions.controller.ts` |
| Transaction Types | `src/features/transactions/transactions.types.ts` |
| Validation Schemas | `src/features/transactions/transactions.validation.ts` |
| Routes | `src/features/transactions/routes/*.ts` |
| Prisma Schema | `prisma/schema.prisma` |
| Midtrans Config | `src/config/midtrans.ts` |
| Environment Config | `src/config/env.ts`, `.env.example` |
| Rate Limiting | `src/shared/middleware/rate-limit.middleware.ts` |
| Logging | `src/shared/utils/logger.ts` |
| Package Dependencies | `package.json` |

### Key Findings Summary

| Category | Status | Details |
|----------|--------|---------|
| Signature Verification | ✅ Excellent | SHA512 + timing-safe comparison |
| Idempotency Handling | ✅ Good | Status priority prevents regression |
| Atomic DB Updates | ✅ Good | Prisma `$transaction` used |
| Rate Limiting | ✅ Good | Configurable, with logging |
| Structured Logging | ⚠️ Partial | Service layer good, controller uses console.log |
| Input Validation | ✅ Good | Zod schemas for all endpoints |
| Environment Validation | ✅ Good | Fail-fast with production checks |
| **Missing Dependency** | ❌ BLOCKER | `midtrans-client` not in package.json |

---

## 2. Transaction Flow Overview

### 2.1 Transaction Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRANSACTION CREATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  Frontend                    Backend                         Midtrans       │
│  ─────────                   ───────                         ────────       │
│      │                          │                               │           │
│      │──POST /transactions──────▶│                               │           │
│      │     { examId }           │  1. Validate Midtrans config  │           │
│      │                          │  2. Check exam exists & price │           │
│      │                          │  3. Check not already paid    │           │
│      │                          │  4. Return existing pending   │           │
│      │                          │  5. Generate orderId          │           │
│      │                          │──createTransaction()─────────▶│           │
│      │                          │◀───{ token, redirect_url }────│           │
│      │                          │  6. Save to DB (PENDING)      │           │
│      │◀─{ snapToken, clientKey }│                               │           │
│      │                          │                               │           │
│      │===== User pays via Snap popup or redirect ================│           │
│      │                          │                               │           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Webhook Callback Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WEBHOOK CALLBACK FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Frontend                    Backend                         Midtrans       │
│  ─────────                   ───────                         ────────       │
│      │                          │◀──POST /webhook───────────────│           │
│      │                          │   { order_id, status,         │           │
│      │                          │     signature_key, ... }      │           │
│      │                          │                               │           │
│      │                          │  1. Verify SHA512 signature   │           │
│      │                          │     (timing-safe comparison)  │           │
│      │                          │  2. Map status to enum        │           │
│      │                          │  3. $transaction { atomic }:  │           │
│      │                          │     - Find by orderId         │           │
│      │                          │     - Idempotency check       │           │
│      │                          │     - Prevent status regress  │           │
│      │                          │     - Update status + paidAt  │           │
│      │                          │──────────200 OK───────────────▶│           │
│      │                          │                               │           │
│      │◀──Poll /transactions/:id─│                               │           │
│      │    (status: PAID)        │                               │           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Status State Machine

```
                    ┌─────────────┐
                    │   PENDING   │
                    └──────┬──────┘
                           │
         ┌─────────┬───────┼───────┬─────────┐
         ▼         ▼       ▼       ▼         ▼
    ┌────────┐ ┌───────┐ ┌────┐ ┌───────┐ ┌────────┐
    │ FAILED │ │EXPIRED│ │PAID│ │CANCEL │ │REFUNDED│
    └────────┘ └───────┘ └──┬─┘ └───────┘ └────────┘
                            │                  ▲
                            └──────────────────┘
                            (future: refund flow)
```

---

## 3. Readiness Verdict

## ⚠️ READY WITH BLOCKERS

### Verdict Breakdown

| Criteria | Score | Notes |
|----------|-------|-------|
| API Contract Stability | 9/10 | Well-defined, consistent responses |
| Security | 8/10 | Strong signature verification |
| Reliability | 7/10 | Missing dependency is critical |
| Observability | 7/10 | Good logging, but console.log in webhook |
| Documentation | 8/10 | Types well-documented |
| **Overall** | **7.8/10** | Ready after fixing blockers |

### Top 3 Blockers/Risks

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | **Missing `midtrans-client` package** | BLOCKER | Application crashes on first transaction |
| 2 | **Console.log in webhook handler** | HIGH | Unstructured logs, potential secret leakage |
| 3 | **Unique constraint edge case** | MEDIUM | May block legitimate transaction flows |

---

## 4. Integration Contract Checklist

### 4.1 Create Transaction

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/v1/transactions` |
| **Authentication** | Required (Bearer token) |
| **Rate Limit** | 10 requests / 15 minutes per IP |
| **Content-Type** | `application/json` |

**Request Body:**
```json
{
  "examId": 1
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "transaction": {
      "id": 1,
      "orderId": "TRX-1705654321000-ABCD1234",
      "userId": 5,
      "examId": 10,
      "amount": 50000,
      "status": "PENDING",
      "paymentType": null,
      "snapToken": "abc123-snap-token-xyz",
      "snapRedirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/abc123",
      "paidAt": null,
      "expiredAt": "2026-01-20T12:00:00.000Z",
      "createdAt": "2026-01-19T12:00:00.000Z",
      "updatedAt": "2026-01-19T12:00:00.000Z",
      "exam": {
        "id": 10,
        "title": "CPNS TIU Practice Test",
        "price": 50000
      }
    },
    "snapToken": "abc123-snap-token-xyz",
    "snapRedirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/abc123",
    "clientKey": "SB-Mid-client-XXXXXXXXXXXX"
  },
  "timestamp": "2026-01-19T12:00:00.000Z"
}
```

**Error Responses:**

| Status | Code | Message | When |
|--------|------|---------|------|
| 400 | BAD_REQUEST | "This exam is free and does not require payment" | Exam has no price |
| 400 | BAD_REQUEST | "Exam ID must be a positive integer" | Invalid examId |
| 401 | UNAUTHORIZED | "Invalid or expired token" | Missing/invalid auth |
| 404 | NOT_FOUND | "Exam not found" | Exam doesn't exist |
| 409 | CONFLICT | "You already have access to this exam" | Already paid |
| 429 | TOO_MANY_REQUESTS | "Too many requests..." | Rate limited |
| 500 | INTERNAL_SERVER_ERROR | "Payment gateway is not configured" | Missing Midtrans config |
| 502 | BAD_GATEWAY | "Failed to initialize payment..." | Midtrans API error |

---

### 4.2 Check Exam Access

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/v1/transactions/exam/:examId/access` |
| **Authentication** | Required |
| **Params** | `examId` (integer) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User has access to this exam",
  "data": {
    "hasAccess": true,
    "reason": "paid",
    "transaction": {
      "id": 1,
      "orderId": "TRX-...",
      "status": "PAID",
      "paidAt": "2026-01-19T12:30:00.000Z"
    },
    "exam": {
      "id": 10,
      "title": "CPNS TIU Practice Test",
      "price": 50000
    }
  },
  "timestamp": "2026-01-19T12:00:00.000Z"
}
```

**Reason Values:**

| Value | `hasAccess` | Meaning |
|-------|-------------|---------|
| `"free"` | `true` | Exam is free (price = null or 0) |
| `"paid"` | `true` | User has PAID transaction |
| `"pending"` | `false` | User has PENDING transaction (not yet paid) |
| `"not_purchased"` | `false` | No transaction exists |

---

### 4.3 Get Transaction by ID

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/v1/transactions/:id` |
| **Authentication** | Required (owner only) |
| **Params** | `id` (integer) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "transaction": { /* TransactionResponse object */ }
  }
}
```

---

### 4.4 Get Transaction by Order ID

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/v1/transactions/order/:orderId` |
| **Authentication** | Required (owner only) |
| **Params** | `orderId` (string, e.g., "TRX-1705654321000-ABCD1234") |

---

### 4.5 List My Transactions

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/v1/transactions` |
| **Authentication** | Required |
| **Query Params** | See below |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 100) |
| `status` | enum | - | Filter by status |
| `examId` | number | - | Filter by exam |
| `sortOrder` | "asc" \| "desc" | "desc" | Sort by createdAt |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [ /* TransactionResponse[] */ ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 4.6 Cancel Transaction

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/v1/transactions/:id/cancel` |
| **Authentication** | Required (owner only) |
| **Constraint** | Only PENDING transactions can be cancelled |

**Error Responses:**

| Status | Message | When |
|--------|---------|------|
| 400 | "Only pending transactions can be cancelled" | Non-PENDING status |
| 403 | "Unauthorized" | Not owner |
| 404 | "Transaction not found" | Invalid ID |

---

### 4.7 Sync Transaction Status

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/v1/transactions/:id/sync` |
| **Authentication** | Required (owner only) |
| **Purpose** | Manually fetch latest status from Midtrans |

**Use Case:** When webhook seems delayed (>30 seconds after payment)

---

### 4.8 Get Client Key

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/v1/transactions/config/client-key` |
| **Authentication** | Required |

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Client key retrieved successfully",
  "data": {
    "clientKey": "SB-Mid-client-XXXXXXXXXXXX"
  }
}
```

---

### 4.9 Webhook (Midtrans → Backend)

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /api/v1/transactions/webhook` |
| **Authentication** | None (public) |
| **Rate Limit** | 100 requests / 1 minute per IP |
| **Security** | SHA512 signature verification |

**Note:** Always returns 200 OK to prevent Midtrans retries.

---

## 5. Critical Gaps & Risks

| # | Gap / Risk | Severity | Why It Matters | Fix | Location |
|---|------------|----------|----------------|-----|----------|
| 1 | **Missing `midtrans-client` dependency** | BLOCKER | Runtime crash on transaction creation | `pnpm add midtrans-client` | `package.json` |
| 2 | **Console.log in webhook handler** | HIGH | Unstructured logs, harder to trace, potential secret exposure | Replace with `transactionLogger` | `transactions.controller.ts:241-258` |
| 3 | **Webhook errors return 200 silently** | MEDIUM | Signature failures logged via console.error only | Add `transactionLogger.webhookFailed()` | `transactions.controller.ts:257` |
| 4 | **Unique constraint may block flows** | MEDIUM | `@@unique([userId, examId, status])` prevents multiple CANCELLED transactions | Remove constraint, rely on app logic | `schema.prisma:178` |
| 5 | **No webhook IP whitelist** | LOW | Any IP can hit webhook (mitigated by signature) | Add Midtrans IP whitelist (future) | `public.route.ts` |
| 6 | **Custom TypeScript types for midtrans-client** | LOW | May be incomplete | Maintain or find `@types/midtrans-client` | `src/types/midtrans-client.d.ts` |

---

## 6. Patch Plan

### 6.1 PATCH #1: Install Missing Dependency (CRITICAL)

**Root Cause:**
`midtrans-client` is imported in `src/config/midtrans.ts` but not listed in `package.json`.

**Fix:**
```bash
cd D:\Kuliah\LAST-BATTLE\project\backend
pnpm add midtrans-client
```

**Verification:**
```bash
# Check installation
pnpm list midtrans-client

# Type check
pnpm run type-check

# Start server (should not crash)
pnpm run dev

# Test transaction creation
curl -X POST http://localhost:3001/api/v1/transactions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"examId": 1}'
# Expected: 201 (not 500)
```

**Rollback:**
```bash
pnpm remove midtrans-client
```

---

### 6.2 PATCH #2: Replace Console.log in Webhook Handler

**Root Cause:**
`transactions.controller.ts` uses `console.log/error` instead of structured logger.

**File:** `src/features/transactions/transactions.controller.ts`

**Before:**
```typescript
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const notification = req.body as MidtransNotification;

  console.log('[WEBHOOK] Received notification:', {
    order_id: notification.order_id,
    transaction_status: notification.transaction_status,
    payment_type: notification.payment_type,
  });

  try {
    const transaction = await transactionsService.handleWebhookNotification(notification);
    // ...
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    // ...
  }
};
```

**After:**
```typescript
import { transactionLogger } from '@/shared/utils/logger';

export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const notification = req.body as MidtransNotification;

  // Logging handled in service layer (transactionLogger.webhookReceived)

  try {
    const transaction = await transactionsService.handleWebhookNotification(notification);
    sendSuccess(
      res,
      { transactionId: transaction.id, status: transaction.status },
      'Webhook processed successfully',
      HTTP_STATUS.OK
    );
  } catch (error) {
    transactionLogger.webhookFailed(notification.order_id || 'unknown', error as Error);
    // Still return 200 to prevent Midtrans retries
    sendSuccess(
      res,
      { processed: false },
      'Webhook received',
      HTTP_STATUS.OK
    );
  }
};
```

**Verification:**
- Send invalid webhook, check logs for structured JSON output
- Verify no `console.log` statements in file

---

### 6.3 PATCH #3: Fix Unique Constraint (Optional)

**Root Cause:**
`@@unique([userId, examId, status])` prevents having multiple transactions with same status.

**File:** `prisma/schema.prisma`

**Before:**
```prisma
@@unique([userId, examId, status])
```

**After:**
```prisma
// Removed - handled by application logic in createTransaction()
// which checks for existing PENDING and PAID transactions
```

**Migration:**
```bash
pnpm prisma migrate dev --name remove_status_unique_constraint
```

**Verification:**
- Create transaction → Cancel → Create new transaction → Cancel again
- All operations should succeed

---

## 7. Test Plan

### 7.1 Prerequisites

```bash
cd D:\Kuliah\LAST-BATTLE\project\backend

# Install missing dependency
pnpm add midtrans-client

# Run migrations
pnpm prisma migrate dev

# Start server
pnpm run dev
```

### 7.2 Authentication Setup

```bash
# Login to get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.accessToken')

echo $TOKEN
```

### 7.3 Happy Path Tests

| # | Test | Command | Expected |
|---|------|---------|----------|
| 1 | Create Transaction | `curl -X POST http://localhost:3001/api/v1/transactions -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"examId":1}'` | 201, snapToken returned |
| 2 | Check Access (pending) | `curl http://localhost:3001/api/v1/transactions/exam/1/access -H "Authorization: Bearer $TOKEN"` | `hasAccess: false, reason: "pending"` |
| 3 | Get Transaction | `curl http://localhost:3001/api/v1/transactions/1 -H "Authorization: Bearer $TOKEN"` | 200, transaction details |
| 4 | List Transactions | `curl "http://localhost:3001/api/v1/transactions?page=1&limit=10" -H "Authorization: Bearer $TOKEN"` | 200, paginated list |

### 7.4 Webhook Simulation

**Generate Valid Signature:**
```bash
ORDER_ID="TRX-1705654321000-ABCD1234"
STATUS_CODE="200"
GROSS_AMOUNT="50000"
SERVER_KEY="your-server-key-here"

PAYLOAD="${ORDER_ID}${STATUS_CODE}${GROSS_AMOUNT}${SERVER_KEY}"
SIGNATURE=$(echo -n "$PAYLOAD" | sha512sum | awk '{print $1}')

echo "Signature: $SIGNATURE"
```

**Send Webhook:**
```bash
curl -X POST http://localhost:3001/api/v1/transactions/webhook \
  -H "Content-Type: application/json" \
  -d "{
    \"order_id\": \"$ORDER_ID\",
    \"transaction_status\": \"settlement\",
    \"status_code\": \"$STATUS_CODE\",
    \"gross_amount\": \"$GROSS_AMOUNT\",
    \"signature_key\": \"$SIGNATURE\",
    \"payment_type\": \"bank_transfer\",
    \"transaction_id\": \"midtrans-tx-id\",
    \"transaction_time\": \"2026-01-19 12:00:00\",
    \"status_message\": \"Success\",
    \"merchant_id\": \"G123456789\",
    \"currency\": \"IDR\"
  }"
```

### 7.5 Idempotency Tests

```bash
# Send same webhook twice
curl -X POST http://localhost:3001/api/v1/transactions/webhook -d @webhook.json
curl -X POST http://localhost:3001/api/v1/transactions/webhook -d @webhook.json

# Expected:
# - Both return 200
# - DB updated only once
# - Second call logs "webhook.idempotent"
```

### 7.6 Concurrency Tests

```bash
# Send 5 parallel webhook requests
seq 1 5 | xargs -P5 -I{} curl -X POST \
  http://localhost:3001/api/v1/transactions/webhook \
  -H "Content-Type: application/json" \
  -d @webhook.json

# Expected: Only one update, others idempotent
```

### 7.7 Negative Tests

| Test | Action | Expected |
|------|--------|----------|
| Invalid signature | Wrong `signature_key` | 200 OK, log shows invalid signature |
| Non-existent order | Unknown `order_id` | 200 OK, error logged |
| Free exam | Create tx for free exam | 400 "This exam is free..." |
| Already paid | Create tx for paid exam | 409 "You already have access..." |
| Rate limit | 11 requests in 15 min | 429 on 11th |
| Missing auth | No Bearer token | 401 |
| Wrong user | Access other's transaction | 404 (hidden as not found) |

---

## 8. Frontend Integration Guide

### 8.1 Complete Integration Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND INTEGRATION FLOW                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. USER CLICKS "BUY EXAM"                                       │
│     │                                                             │
│     ▼                                                             │
│  2. CHECK ACCESS FIRST                                           │
│     GET /api/v1/transactions/exam/:examId/access                 │
│     │                                                             │
│     ├─▶ hasAccess=true, reason="free"  ──▶ Start Exam           │
│     ├─▶ hasAccess=true, reason="paid"  ──▶ Start Exam           │
│     ├─▶ hasAccess=false, reason="pending" ──▶ Resume Payment    │
│     └─▶ hasAccess=false, reason="not_purchased" ──▶ Step 3      │
│                                                                   │
│  3. CREATE TRANSACTION                                           │
│     POST /api/v1/transactions { examId }                         │
│     │                                                             │
│     ▼                                                             │
│  4. STORE PAYMENT STATE                                          │
│     {                                                             │
│       transactionId: 123,                                        │
│       orderId: "TRX-...",                                        │
│       snapToken: "...",                                          │
│       snapRedirectUrl: "...",                                    │
│       examId: 10,                                                │
│       status: "PENDING"                                          │
│     }                                                             │
│     │                                                             │
│     ▼                                                             │
│  5. OPEN SNAP POPUP                                              │
│     window.snap.pay(snapToken, { callbacks })                    │
│     │                                                             │
│     ├─▶ onSuccess ──▶ Step 6 (Poll)                             │
│     ├─▶ onPending ──▶ Show "Complete Payment" UI                │
│     ├─▶ onError   ──▶ Show Error, Retry Option                  │
│     └─▶ onClose   ──▶ Show "Resume Payment" Option              │
│                                                                   │
│  6. POLL FOR STATUS (after onSuccess)                            │
│     GET /api/v1/transactions/:id                                 │
│     └─▶ Repeat every 3-5s until status !== "PENDING"            │
│                                                                   │
│  7. VERIFY ACCESS BEFORE EXAM                                    │
│     GET /api/v1/transactions/exam/:examId/access                 │
│     └─▶ hasAccess=true ──▶ Allow Exam Start                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Snap.js Integration

**Load Snap.js (in `<head>` or component):**
```html
<!-- Sandbox -->
<script
  src="https://app.sandbox.midtrans.com/snap/snap.js"
  data-client-key="SB-Mid-client-XXXX">
</script>

<!-- Production -->
<script
  src="https://app.midtrans.com/snap/snap.js"
  data-client-key="Mid-client-XXXX">
</script>
```

**React/Next.js Integration:**
```tsx
// hooks/usePayment.ts
import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface PaymentState {
  transactionId: number;
  orderId: string;
  snapToken: string;
  examId: number;
  status: string;
}

export function usePayment() {
  const [paymentState, setPaymentState] = useState<PaymentState | null>(null);

  // Create transaction mutation
  const createTransaction = useMutation({
    mutationFn: (examId: number) =>
      api.post('/transactions', { examId }),
    onSuccess: (response) => {
      const { transaction, snapToken } = response.data.data;
      setPaymentState({
        transactionId: transaction.id,
        orderId: transaction.orderId,
        snapToken,
        examId: transaction.examId,
        status: transaction.status,
      });
    },
  });

  // Open Snap popup
  const openPayment = useCallback(() => {
    if (!paymentState?.snapToken) return;

    window.snap.pay(paymentState.snapToken, {
      onSuccess: (result) => {
        console.log('Payment success:', result);
        // Start polling for status
      },
      onPending: (result) => {
        console.log('Payment pending:', result);
        // Show "complete payment" UI
      },
      onError: (result) => {
        console.error('Payment error:', result);
        // Show error and retry option
      },
      onClose: () => {
        console.log('Popup closed');
        // Show "resume payment" option
      },
    });
  }, [paymentState?.snapToken]);

  // Poll transaction status
  const { data: transaction } = useQuery({
    queryKey: ['transaction', paymentState?.transactionId],
    queryFn: () => api.get(`/transactions/${paymentState?.transactionId}`),
    enabled: !!paymentState?.transactionId,
    refetchInterval: (data) =>
      data?.data.data.transaction.status === 'PENDING' ? 5000 : false,
  });

  return {
    createTransaction,
    openPayment,
    paymentState,
    transaction: transaction?.data.data.transaction,
  };
}
```

### 8.3 Status Display Mapping

```tsx
// components/TransactionStatus.tsx
const STATUS_CONFIG = {
  PENDING: {
    label: 'Menunggu Pembayaran',
    color: 'yellow',
    icon: 'clock',
    action: 'Selesaikan Pembayaran',
  },
  PAID: {
    label: 'Pembayaran Berhasil',
    color: 'green',
    icon: 'check-circle',
    action: 'Mulai Ujian',
  },
  EXPIRED: {
    label: 'Pembayaran Kedaluwarsa',
    color: 'gray',
    icon: 'x-circle',
    action: 'Coba Lagi',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    color: 'gray',
    icon: 'x-circle',
    action: 'Coba Lagi',
  },
  FAILED: {
    label: 'Pembayaran Gagal',
    color: 'red',
    icon: 'exclamation-circle',
    action: 'Coba Lagi',
  },
} as const;
```

### 8.4 Common Pitfalls & Solutions

| Pitfall | Solution |
|---------|----------|
| **Snap popup blocked by browser** | Use `snapRedirectUrl` as fallback, or show popup enable instructions |
| **Webhook delayed >30s** | Implement polling + `/sync` endpoint fallback |
| **User refreshes during payment** | Store payment state in localStorage, restore on mount |
| **Double transaction creation** | Backend returns existing PENDING transaction |
| **CORS errors with Midtrans** | Use Snap.js (handles CORS), don't call Midtrans APIs directly |
| **Client key mismatch** | Always fetch via `/config/client-key` endpoint |
| **Testing in sandbox** | Use [Midtrans test cards](https://docs.midtrans.com/en/technical-reference/sandbox-test) |

### 8.5 LocalStorage Persistence

```tsx
// utils/paymentStorage.ts
const PAYMENT_KEY = 'pending_payment';

export function savePaymentState(state: PaymentState) {
  localStorage.setItem(PAYMENT_KEY, JSON.stringify(state));
}

export function getPaymentState(): PaymentState | null {
  const stored = localStorage.getItem(PAYMENT_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function clearPaymentState() {
  localStorage.removeItem(PAYMENT_KEY);
}

// On component mount
useEffect(() => {
  const stored = getPaymentState();
  if (stored && stored.status === 'PENDING') {
    // Restore and check status
    setPaymentState(stored);
  }
}, []);
```

---

## 9. Security Checklist

### 9.1 Implemented Security Measures

| Measure | Status | Implementation |
|---------|--------|----------------|
| **Signature Verification** | ✅ | SHA512 + `crypto.timingSafeEqual()` |
| **Timing-Safe Comparison** | ✅ | Prevents timing attacks |
| **Rate Limiting** | ✅ | 10 req/15min (tx), 100 req/1min (webhook) |
| **Input Validation** | ✅ | Zod schemas for all endpoints |
| **Authentication** | ✅ | JWT Bearer tokens |
| **Authorization** | ✅ | Owner-only access to transactions |
| **Sensitive Data Redaction** | ✅ | Logger sanitizes tokens/keys |
| **Environment Validation** | ✅ | Fail-fast if missing Midtrans keys in production |
| **Idempotency** | ✅ | Duplicate webhooks handled |
| **Status Regression Prevention** | ✅ | Priority-based status updates |

### 9.2 Security Recommendations (Future)

| Recommendation | Priority | Description |
|----------------|----------|-------------|
| Midtrans IP Whitelist | Medium | Allow only Midtrans server IPs for webhook |
| Request Logging | Low | Log all incoming webhook requests for audit |
| Webhook Secret Rotation | Low | Rotate Midtrans keys periodically |

---

## 10. Appendix

### 10.1 TransactionStatus Enum

```typescript
enum TransactionStatus {
  PENDING    = 'PENDING',    // Waiting for payment
  PAID       = 'PAID',       // Payment successful
  EXPIRED    = 'EXPIRED',    // 24h payment window expired
  CANCELLED  = 'CANCELLED',  // Cancelled by user/system
  FAILED     = 'FAILED',     // Payment denied/failed
  REFUNDED   = 'REFUNDED',   // Refunded (future)
}
```

### 10.2 Midtrans Status Mapping

```typescript
const MIDTRANS_STATUS_MAP = {
  capture: 'PAID',
  settlement: 'PAID',
  pending: 'PENDING',
  deny: 'FAILED',
  cancel: 'CANCELLED',
  expire: 'EXPIRED',
  failure: 'FAILED',
  refund: 'REFUNDED',
  partial_refund: 'REFUNDED',
};
```

### 10.3 Environment Variables

```env
# Required
MIDTRANS_SERVER_KEY=SB-Mid-server-XXXX
MIDTRANS_CLIENT_KEY=SB-Mid-client-XXXX
MIDTRANS_IS_PRODUCTION=false

# Optional (with defaults)
RATE_LIMIT_TRANSACTION_MAX=10
RATE_LIMIT_TRANSACTION_WINDOW_MS=900000
RATE_LIMIT_WEBHOOK_MAX=100
RATE_LIMIT_WEBHOOK_WINDOW_MS=60000
```

### 10.4 File Structure

```
src/features/transactions/
├── routes/
│   ├── participant.route.ts  # Authenticated user routes
│   ├── admin.route.ts        # Admin-only routes
│   └── public.route.ts       # Webhook (public)
├── transactions.controller.ts
├── transactions.service.ts
├── transactions.types.ts
└── transactions.validation.ts

src/config/
├── midtrans.ts               # Midtrans SDK setup
└── env.ts                    # Environment validation

prisma/
└── schema.prisma             # Transaction model
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-19 | AI Auditor | Initial audit report |

---

**End of Report**
