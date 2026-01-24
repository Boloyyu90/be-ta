# Transactions Feature Integration Specification

> **Generated from codebase analysis**
> **Last Updated:** January 2026
> **Backend Version:** Express + Prisma + Midtrans

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Database Schema](#2-database-schema)
3. [API Endpoints Specification](#3-api-endpoints-specification)
4. [TypeScript Interfaces](#4-typescript-interfaces)
5. [Service Layer Logic](#5-service-layer-logic)
6. [Webhook Handling](#6-webhook-handling)
7. [Frontend Integration Checklist](#7-frontend-integration-checklist)
8. [Testing Evidence](#8-testing-evidence)

---

## 1. Feature Overview

### Description

The Transactions feature enables **paid exam purchases** through integration with **Midtrans** payment gateway. Users can purchase access to paid exams using various Indonesian payment methods (bank transfer, e-wallets, QRIS, etc.).

### Business Context

- **Use Case:** Participants purchase access to paid exams
- **Payment Flow:** User initiates transaction → Midtrans Snap popup → User completes payment → Webhook confirms payment → User gains exam access
- **Currency:** Indonesian Rupiah (IDR)
- **Payment Gateway:** Midtrans (Snap integration)

### Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Transaction creation | **Working** | Generates Midtrans Snap token |
| Webhook handling | **Working** | Receives and processes Midtrans notifications |
| Exam access checking | **Working** | Validates if user has paid for exam |
| Status sync | **Working** | Manual sync from Midtrans API |
| Transaction cancellation | **Working** | User can cancel pending transactions |
| Lazy expiry cleanup | **Working** | Expired transactions cleaned on access |
| Admin management | **Working** | List, view, stats, cleanup |
| Refund handling | **NOT IMPLEMENTED** | Status tracked but no refund API integration |

---

## 2. Database Schema

### Transaction Model

Source: `prisma/schema.prisma:159-187`

```prisma
model Transaction {
  id              Int               @id @default(autoincrement())
  orderId         String            @unique @map("order_id")
  userId          Int               @map("user_id")
  examId          Int               @map("exam_id")
  amount          Int               // Amount in IDR
  status          TransactionStatus @default(PENDING)
  paymentType     String?           @map("payment_type")
  snapToken       String?           @map("snap_token")
  snapRedirectUrl String?           @map("snap_redirect_url")
  paidAt          DateTime?         @map("paid_at")
  expiredAt       DateTime?         @map("expired_at")
  metadata        Json?
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  exam Exam @relation(fields: [examId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([examId])
  @@index([status])
  @@index([orderId])
  @@index([userId, examId, status])
  @@map("transactions")
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | `Int` | Auto-increment primary key |
| `orderId` | `String` | Unique Midtrans order ID (format: `TRX-{timestamp}-{random}`) |
| `userId` | `Int` | Foreign key to User |
| `examId` | `Int` | Foreign key to Exam |
| `amount` | `Int` | Amount in IDR (Indonesian Rupiah) |
| `status` | `TransactionStatus` | Current transaction status |
| `paymentType` | `String?` | Payment method (e.g., "bank_transfer", "gopay", "qris") |
| `snapToken` | `String?` | Midtrans Snap token for payment popup |
| `snapRedirectUrl` | `String?` | Midtrans redirect URL for payment |
| `paidAt` | `DateTime?` | Timestamp when payment was confirmed |
| `expiredAt` | `DateTime?` | Payment deadline (24 hours from creation) |
| `metadata` | `Json?` | Full Midtrans notification response |
| `createdAt` | `DateTime` | Record creation timestamp |
| `updatedAt` | `DateTime` | Last update timestamp |

### TransactionStatus Enum

Source: `prisma/schema.prisma:225-232`

```prisma
enum TransactionStatus {
  PENDING    // Waiting for payment (Snap token generated)
  PAID       // Payment successful (settlement received)
  EXPIRED    // Payment window expired (24 hours default)
  CANCELLED  // Cancelled by user or system
  FAILED     // Payment failed (denied, error)
  REFUNDED   // Refunded (future use for dispute handling)
}
```

### Related Models

#### Exam (relevant fields)

```prisma
model Exam {
  id              Int     @id @default(autoincrement())
  title           String
  price           Int?    @map("price") // Price in IDR (null = free exam)
  // ... other fields
  transactions    Transaction[]
}
```

#### User (relevant fields)

```prisma
model User {
  id              Int           @id @default(autoincrement())
  name            String
  email           String        @unique
  // ... other fields
  transactions    Transaction[]
}
```

---

## 3. API Endpoints Specification

### Endpoints Summary Table

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| `POST` | `/api/v1/transactions` | Yes | Participant | Create new transaction |
| `GET` | `/api/v1/transactions` | Yes | Participant | List user's transactions |
| `GET` | `/api/v1/transactions/:id` | Yes | Participant | Get transaction by ID |
| `GET` | `/api/v1/transactions/order/:orderId` | Yes | Participant | Get transaction by order ID |
| `GET` | `/api/v1/transactions/exam/:examId/access` | Yes | Participant | Check exam access |
| `POST` | `/api/v1/transactions/:id/cancel` | Yes | Participant | Cancel pending transaction |
| `POST` | `/api/v1/transactions/:id/sync` | Yes | Participant | Sync status from Midtrans |
| `GET` | `/api/v1/transactions/config/client-key` | Yes | Any | Get Midtrans client key |
| `POST` | `/api/v1/transactions/webhook` | **No** | - | Midtrans webhook |
| `GET` | `/api/v1/admin/transactions` | Yes | Admin | List all transactions |
| `GET` | `/api/v1/admin/transactions/:id` | Yes | Admin | Get any transaction |
| `GET` | `/api/v1/admin/transactions/stats` | Yes | Admin | Get statistics |
| `POST` | `/api/v1/admin/transactions/cleanup` | Yes | Admin | Cleanup expired transactions |

---

### Participant Endpoints

#### POST /api/v1/transactions

**Description:** Create a new transaction for purchasing exam access

**Authentication:** Required (Bearer token)
**Role Access:** Participant
**Rate Limit:** 10 requests per 15 minutes per IP

**Request:**

```typescript
// Headers
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}

// Body
{
  "examId": number // Required, positive integer
}
```

**Validation Schema:**

```typescript
// Source: src/features/transactions/transactions.validation.ts:19-29
z.object({
  body: z.object({
    examId: z
      .number({
        required_error: 'Exam ID is required',
        invalid_type_error: 'Exam ID must be a number',
      })
      .int('Exam ID must be an integer')
      .positive('Exam ID must be positive'),
  }),
})
```

**Response - Success (201 Created):**

```typescript
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "transaction": {
      "id": 1,
      "orderId": "TRX-1704067200000-A1B2C3D4",
      "userId": 5,
      "examId": 10,
      "amount": 150000,
      "status": "PENDING",
      "paymentType": null,
      "snapToken": "abc123-snap-token",
      "snapRedirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/abc123",
      "paidAt": null,
      "expiredAt": "2024-01-02T10:00:00.000Z",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z",
      "exam": {
        "id": 10,
        "title": "CPNS TIU Test 2024",
        "price": 150000
      }
    },
    "snapToken": "abc123-snap-token",
    "snapRedirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/abc123",
    "clientKey": "SB-Mid-client-xxx"
  },
  "timestamp": "2024-01-01T10:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| 400 | Exam is free | "This exam is free and does not require payment" |
| 404 | Exam not found | "Exam not found" |
| 404 | User not found | "User not found" |
| 409 | Already has access | "You already have access to this exam" |
| 429 | Rate limited | "Too many requests, please try again later" |
| 500 | Midtrans not configured | "Payment gateway is not configured" |
| 502 | Midtrans API error | "Failed to initialize payment. Please try again later." |

**Business Logic:**
- Validates Midtrans configuration
- Checks if exam exists and has a price (not free)
- Checks for existing PAID transaction (prevents duplicate purchases)
- Checks for existing valid PENDING transaction (returns it instead of creating new - idempotent)
- Lazy cleanup of expired PENDING transactions
- Generates unique order ID: `TRX-{timestamp}-{random}`
- Creates Midtrans Snap transaction with 24-hour expiry
- Saves transaction to database

---

#### GET /api/v1/transactions

**Description:** List user's own transactions with pagination and filters

**Authentication:** Required
**Role Access:** Participant

**Request:**

```typescript
// Headers
{
  "Authorization": "Bearer <access_token>"
}

// Query Parameters
{
  page?: number,      // Default: 1, Min: 1
  limit?: number,     // Default: 10, Min: 1, Max: 100
  status?: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "FAILED" | "REFUNDED",
  examId?: number,    // Filter by exam
  sortOrder?: "asc" | "desc"  // Default: "desc"
}
```

**Response - Success (200 OK):**

```typescript
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": 1,
        "orderId": "TRX-1704067200000-A1B2C3D4",
        "userId": 5,
        "examId": 10,
        "amount": 150000,
        "status": "PAID",
        "paymentType": "bank_transfer",
        "snapToken": "...",
        "snapRedirectUrl": "...",
        "paidAt": "2024-01-01T11:00:00.000Z",
        "expiredAt": "2024-01-02T10:00:00.000Z",
        "createdAt": "2024-01-01T10:00:00.000Z",
        "updatedAt": "2024-01-01T11:00:00.000Z",
        "exam": {
          "id": 10,
          "title": "CPNS TIU Test 2024",
          "price": 150000
        },
        "user": {
          "id": 5,
          "name": "John Doe",
          "email": "john@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

#### GET /api/v1/transactions/:id

**Description:** Get transaction details by ID (own transactions only)

**Authentication:** Required
**Role Access:** Participant

**Request:**

```typescript
// Headers
{
  "Authorization": "Bearer <access_token>"
}

// Path Parameters
{
  id: number // Transaction ID (positive integer)
}
```

**Response - Success (200 OK):**

```typescript
{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "transaction": {
      "id": 1,
      "orderId": "TRX-1704067200000-A1B2C3D4",
      // ... full transaction object with exam and user
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| 404 | Not found or not owned | "Transaction not found" |

---

#### GET /api/v1/transactions/order/:orderId

**Description:** Get transaction by Midtrans order ID (own transactions only)

**Authentication:** Required
**Role Access:** Participant

**Request:**

```typescript
// Path Parameters
{
  orderId: string // Midtrans order ID (e.g., "TRX-1704067200000-A1B2C3D4")
}
```

**Response:** Same as GET /api/v1/transactions/:id

---

#### GET /api/v1/transactions/exam/:examId/access

**Description:** Check if user has access to an exam (free or paid)

**Authentication:** Required
**Role Access:** Participant

**Request:**

```typescript
// Path Parameters
{
  examId: number // Exam ID (positive integer)
}
```

**Response - Success (200 OK):**

```typescript
{
  "success": true,
  "message": "User has access to this exam" | "User does not have access to this exam",
  "data": {
    "hasAccess": boolean,
    "reason": "free" | "paid" | "pending" | "not_purchased",
    "transaction": TransactionResponse | null,
    "exam": {
      "id": 10,
      "title": "CPNS TIU Test 2024",
      "price": 150000 | null
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Access Logic:**

| Reason | hasAccess | Description |
|--------|-----------|-------------|
| `free` | `true` | Exam has no price (null or 0) |
| `paid` | `true` | User has PAID transaction for exam |
| `pending` | `false` | User has valid PENDING transaction |
| `not_purchased` | `false` | No valid transaction exists |

---

#### POST /api/v1/transactions/:id/cancel

**Description:** Cancel a pending transaction

**Authentication:** Required
**Role Access:** Participant (own transactions only)

**Request:**

```typescript
// Path Parameters
{
  id: number // Transaction ID
}
```

**Response - Success (200 OK):**

```typescript
{
  "success": true,
  "message": "Transaction cancelled successfully",
  "data": {
    "transaction": {
      "id": 1,
      "status": "CANCELLED",
      // ... rest of transaction
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses:**

| Status | Condition | Message |
|--------|-----------|---------|
| 400 | Not pending | "Only pending transactions can be cancelled" |
| 403 | Not owner | "Unauthorized" |
| 404 | Not found | "Transaction not found" |

---

#### POST /api/v1/transactions/:id/sync

**Description:** Manually sync transaction status from Midtrans API

**Authentication:** Required
**Role Access:** Participant (own transactions only)

**Request:**

```typescript
// Path Parameters
{
  id: number // Transaction ID
}
```

**Response - Success (200 OK):**

```typescript
{
  "success": true,
  "message": "Transaction status synced successfully",
  "data": {
    "transaction": {
      // Updated transaction with latest status from Midtrans
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Business Logic:**
- Calls Midtrans Core API to get current transaction status
- Processes status update same as webhook

---

#### GET /api/v1/transactions/config/client-key

**Description:** Get Midtrans client key for frontend Snap integration

**Authentication:** Required
**Role Access:** Any authenticated user

**Response - Success (200 OK):**

```typescript
{
  "success": true,
  "message": "Client key retrieved successfully",
  "data": {
    "clientKey": "SB-Mid-client-xxxxxxxx"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

### Public Endpoints

#### POST /api/v1/transactions/webhook

**Description:** Handle Midtrans payment notification (webhook)

**Authentication:** **None** (called by Midtrans servers)
**Rate Limit:** 100 requests per 1 minute per IP

**Request:**

```typescript
// Body (from Midtrans)
{
  transaction_time: string,
  transaction_status: string,
  transaction_id: string,
  status_message: string,
  status_code: string,
  signature_key: string,
  payment_type: string,
  order_id: string,
  merchant_id: string,
  gross_amount: string,
  fraud_status?: string,
  currency?: string,
  va_numbers?: Array<{ va_number: string, bank: string }>,
  issuer?: string,
  acquirer?: string
}
```

**Response - Success (200 OK):**

```typescript
{
  "success": true,
  "message": "Webhook processed successfully",
  "data": {
    "transactionId": 1,
    "status": "PAID"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Security:**
- Signature verification using SHA-512 hash
- Constant-time comparison to prevent timing attacks
- Always returns 200 OK (even on error) to prevent Midtrans retries

---

### Admin Endpoints

#### GET /api/v1/admin/transactions

**Description:** List all transactions (admin can see all users' transactions)

**Authentication:** Required
**Role Access:** Admin only

**Request:** Same query parameters as participant endpoint

**Response:** Same structure as participant endpoint, but includes all users' transactions

---

#### GET /api/v1/admin/transactions/:id

**Description:** Get any transaction by ID (no ownership check)

**Authentication:** Required
**Role Access:** Admin only

**Response:** Same as participant endpoint

---

#### GET /api/v1/admin/transactions/stats

**Description:** Get transaction statistics

**Authentication:** Required
**Role Access:** Admin only

**Response - Success (200 OK):**

```typescript
{
  "success": true,
  "message": "Transaction statistics retrieved successfully",
  "data": {
    "byStatus": {
      "PENDING": 5,
      "PAID": 150,
      "EXPIRED": 20,
      "CANCELLED": 10,
      "FAILED": 3,
      "REFUNDED": 0
    },
    "pendingExpired": 2, // PENDING transactions past expiry (not yet cleaned)
    "total": 188
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

#### POST /api/v1/admin/transactions/cleanup

**Description:** Mark expired PENDING transactions as EXPIRED

**Authentication:** Required
**Role Access:** Admin only

**Response - Success (200 OK):**

```typescript
{
  "success": true,
  "message": "Cleanup completed: 5 transactions marked as expired",
  "data": {
    "expiredCount": 5,
    "updatedIds": [10, 15, 22, 33, 41],
    "errors": []
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

## 4. TypeScript Interfaces

### Request Types

Source: `src/features/transactions/transactions.types.ts`

```typescript
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
```

### Response Types

```typescript
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
```

### Relation Types

```typescript
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
```

### Midtrans Types

```typescript
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
```

### Constants

```typescript
/**
 * Map Midtrans transaction_status to TransactionStatus enum
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
```

### API Response Format

Source: `src/shared/utils/response.ts`

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  errorCode?: string;
  context?: Record<string, any>;
  timestamp?: string;
}
```

---

## 5. Service Layer Logic

### Key Business Rules

Source: `src/features/transactions/transactions.service.ts`

#### Transaction Creation

1. **Midtrans Configuration Check:** Fails if `MIDTRANS_SERVER_KEY` or `MIDTRANS_CLIENT_KEY` not set
2. **Exam Validation:** Exam must exist and have a price > 0
3. **Duplicate Prevention:**
   - If PAID transaction exists → throw ConflictError
   - If valid PENDING transaction exists → return existing (idempotent)
4. **Lazy Cleanup:** Expired PENDING transactions are cleaned when accessed
5. **Order ID Generation:** `TRX-{timestamp}-{random_8_hex}`
6. **Expiry:** 24 hours from creation

#### Status Transitions

```
PENDING → PAID       (via webhook: settlement, capture)
PENDING → CANCELLED  (user cancellation or webhook: cancel)
PENDING → EXPIRED    (24h timeout or webhook: expire)
PENDING → FAILED     (webhook: deny, failure)
PAID → REFUNDED      (webhook: refund, partial_refund)
```

**Status Priority (prevents regression):**

```typescript
const statusPriority: Record<TransactionStatus, number> = {
  PENDING: 1,
  FAILED: 2,
  CANCELLED: 3,
  EXPIRED: 4,
  PAID: 5,
  REFUNDED: 6,
};
```

#### Exam Access Logic

```typescript
// Order of checks:
1. If exam.price is null/0 → hasAccess: true, reason: 'free'
2. If PAID transaction exists → hasAccess: true, reason: 'paid'
3. If valid PENDING exists → hasAccess: false, reason: 'pending'
4. Otherwise → hasAccess: false, reason: 'not_purchased'
```

### Validation Rules

| Field | Rule |
|-------|------|
| `examId` | Required, positive integer |
| `page` | Min: 1 |
| `limit` | Min: 1, Max: 100 |
| `status` | Must be valid TransactionStatus enum value |
| `sortOrder` | Must be 'asc' or 'desc' |

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /transactions` | 10 requests | 15 minutes |
| `POST /transactions/webhook` | 100 requests | 1 minute |

### Environment Variables

```bash
# Required
MIDTRANS_SERVER_KEY=xxx
MIDTRANS_CLIENT_KEY=xxx

# Optional
MIDTRANS_IS_PRODUCTION=false  # Default: false (sandbox mode)

# Rate limits (optional)
RATE_LIMIT_TRANSACTION_MAX=10
RATE_LIMIT_TRANSACTION_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_WEBHOOK_MAX=100
RATE_LIMIT_WEBHOOK_WINDOW_MS=60000  # 1 minute
```

---

## 6. Webhook Handling

### Webhook Endpoint

```
POST /api/v1/transactions/webhook
```

### Expected Payload

```typescript
{
  "transaction_time": "2024-01-01 15:30:00",
  "transaction_status": "settlement",  // or: pending, capture, deny, cancel, expire, failure, refund
  "transaction_id": "abc123-456-789",
  "status_message": "midtrans payment notification",
  "status_code": "200",
  "signature_key": "sha512hash...",
  "payment_type": "bank_transfer",  // or: gopay, qris, credit_card, etc.
  "order_id": "TRX-1704067200000-A1B2C3D4",
  "merchant_id": "G123456789",
  "gross_amount": "150000.00",
  "fraud_status": "accept",
  "currency": "IDR"
}
```

### Signature Verification

```typescript
// Signature formula:
// SHA512(order_id + status_code + gross_amount + server_key)

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

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(notification.signature_key),
    Buffer.from(expectedSignature)
  );
}
```

### Status Mapping

| Midtrans Status | Internal Status |
|-----------------|-----------------|
| `capture` | `PAID` |
| `settlement` | `PAID` |
| `pending` | `PENDING` |
| `deny` | `FAILED` |
| `cancel` | `CANCELLED` |
| `expire` | `EXPIRED` |
| `failure` | `FAILED` |
| `refund` | `REFUNDED` |
| `partial_refund` | `REFUNDED` |

### Idempotency

- Webhook always returns 200 OK (even on errors)
- Duplicate webhooks are handled gracefully (no double-processing)
- Status regression is prevented (e.g., PAID cannot go back to PENDING)

---

## 7. Frontend Integration Checklist

### API Client Functions Needed

- [ ] `createTransaction(examId: number): Promise<CreateTransactionResponse>`
- [ ] `getTransactions(query?: ListTransactionsQuery): Promise<PaginatedResponse<TransactionResponse>>`
- [ ] `getTransactionById(id: number): Promise<TransactionResponse>`
- [ ] `getTransactionByOrderId(orderId: string): Promise<TransactionResponse>`
- [ ] `checkExamAccess(examId: number): Promise<ExamAccessResponse>`
- [ ] `cancelTransaction(id: number): Promise<TransactionResponse>`
- [ ] `syncTransaction(id: number): Promise<TransactionResponse>`
- [ ] `getClientKey(): Promise<{ clientKey: string }>`

### Types to Mirror from Backend

```typescript
// Core types
interface TransactionResponse { ... }
interface CreateTransactionResponse { ... }
interface ExamAccessResponse { ... }
interface ListTransactionsQuery { ... }

// Enum
enum TransactionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

// API Response wrapper
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
  errorCode?: string;
  timestamp?: string;
}

// Pagination
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

### Auth Requirements per Endpoint

| Endpoint | Auth Required | Notes |
|----------|---------------|-------|
| POST /transactions | Yes | Bearer token |
| GET /transactions | Yes | Bearer token |
| GET /transactions/:id | Yes | Bearer token |
| GET /transactions/order/:orderId | Yes | Bearer token |
| GET /transactions/exam/:examId/access | Yes | Bearer token |
| POST /transactions/:id/cancel | Yes | Bearer token |
| POST /transactions/:id/sync | Yes | Bearer token |
| GET /transactions/config/client-key | Yes | Bearer token |
| POST /transactions/webhook | **No** | Called by Midtrans |

### Error States to Handle

| Error Code | Status | User Message |
|------------|--------|--------------|
| 400 | Bad Request | "This exam is free and does not require payment" |
| 401 | Unauthorized | "Please log in to continue" |
| 403 | Forbidden | "You don't have permission to access this resource" |
| 404 | Not Found | "Transaction not found" |
| 409 | Conflict | "You already have access to this exam" |
| 429 | Rate Limited | "Too many requests. Please try again later." |
| 500 | Server Error | "Something went wrong. Please try again." |
| 502 | Bad Gateway | "Payment service unavailable. Please try again later." |

### Loading States Consideration

1. **Transaction Creation:**
   - Show loading while calling API
   - Then show Midtrans Snap popup
   - Handle popup close/cancel

2. **Payment Status:**
   - Poll or use sync endpoint after payment
   - Show "Processing payment..." during verification

3. **Exam Access Check:**
   - Check access before allowing exam start
   - Cache result to avoid repeated calls

### Midtrans Snap Integration

```typescript
// 1. Load Midtrans Snap script
const loadMidtransScript = (clientKey: string) => {
  const script = document.createElement('script');
  script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'; // Use production URL in prod
  script.setAttribute('data-client-key', clientKey);
  document.body.appendChild(script);
};

// 2. Open Snap popup
const openSnapPopup = (snapToken: string) => {
  window.snap.pay(snapToken, {
    onSuccess: (result) => {
      // Payment successful - sync transaction status
    },
    onPending: (result) => {
      // Payment pending (e.g., bank transfer)
    },
    onError: (result) => {
      // Payment error
    },
    onClose: () => {
      // User closed popup without completing
    }
  });
};
```

---

## 8. Testing Evidence

### Test Files Status

**NO DEDICATED TEST FILES FOUND** in the project source.

Test files in `src/__tests__/` or `tests/`: **NOT IMPLEMENTED IN CURRENT CODEBASE**

### Postman Collections

Found in `docs/postman/`:
- `Tryout_Environment.postman_environment.json` - Environment variables
- `Tryout_Proctoring_API.postman_collection.json` - Proctoring API tests only

**Transaction API Postman collection:** **NOT FOUND**

### Verified Working Scenarios (Based on Code Analysis)

1. **Create Transaction Flow:**
   - Valid exam ID → Creates transaction with Snap token
   - Free exam → Returns 400 error
   - Existing PAID → Returns 409 conflict
   - Existing valid PENDING → Returns existing transaction (idempotent)

2. **Access Check Flow:**
   - Free exam → hasAccess: true, reason: 'free'
   - Paid exam with PAID transaction → hasAccess: true, reason: 'paid'
   - Paid exam with PENDING transaction → hasAccess: false, reason: 'pending'
   - Paid exam with no transaction → hasAccess: false, reason: 'not_purchased'

3. **Webhook Flow:**
   - Valid signature → Updates transaction status
   - Invalid signature → Returns 200 (logged, but no update)
   - Duplicate webhook → Idempotent (no double-update)
   - Status regression attempt → Prevented

4. **Cancellation Flow:**
   - Own PENDING transaction → Cancelled successfully
   - Other user's transaction → 403 Forbidden
   - Non-PENDING transaction → 400 Bad Request

### Edge Cases Handled

- **Lazy Cleanup:** Expired PENDING transactions are marked as EXPIRED when accessed
- **Race Conditions:** Database transactions prevent concurrent webhook issues
- **Timing Attacks:** Signature verification uses constant-time comparison
- **Idempotent Creation:** Returns existing PENDING transaction instead of creating duplicate
- **Status Priority:** Prevents status regression (PAID → PENDING blocked)

---

## Appendix: File References

| Component | File Path |
|-----------|-----------|
| Prisma Schema | `prisma/schema.prisma` |
| Types | `src/features/transactions/transactions.types.ts` |
| Validation | `src/features/transactions/transactions.validation.ts` |
| Controller | `src/features/transactions/transactions.controller.ts` |
| Service | `src/features/transactions/transactions.service.ts` |
| Participant Routes | `src/features/transactions/routes/participant.route.ts` |
| Admin Routes | `src/features/transactions/routes/admin.route.ts` |
| Public Routes | `src/features/transactions/routes/public.route.ts` |
| V1 Router | `src/routes/v1.route.ts` |
| Auth Middleware | `src/shared/middleware/auth.middleware.ts` |
| Rate Limit Middleware | `src/shared/middleware/rate-limit.middleware.ts` |
| Midtrans Config | `src/config/midtrans.ts` |
| Environment Config | `src/config/env.ts` |
| Response Utils | `src/shared/utils/response.ts` |
| Logger | `src/shared/utils/logger.ts` |
