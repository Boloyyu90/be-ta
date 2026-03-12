/**
 * Transaction Service Tests
 *
 * Tests for handleWebhookNotification, createTransaction, cancelTransaction,
 * and checkExamAccess. Uses real crypto for signature verification (more secure
 * than mocking) and mocks Prisma, Midtrans, and logger.
 *
 * ~27 test cases covering webhook processing, idempotency, payment creation,
 * access control, and cancellation flows.
 *
 * @module transactions/transactions.service.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionStatus } from '@prisma/client';
import crypto from 'crypto';

// ==================== HOISTED MOCKS ====================

const mockPrisma = vi.hoisted(() => ({
  exam: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  transaction: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const mockSnap = vi.hoisted(() => ({
  createTransaction: vi.fn(),
}));

const mockCoreApi = vi.hoisted(() => ({
  transaction: { status: vi.fn() },
}));

const mockMidtransConfig = vi.hoisted(() => ({
  serverKey: 'SB-Mid-server-TEST_KEY_12345',
  clientKey: 'SB-Mid-client-TEST_KEY_67890',
  isProduction: false,
  isConfigured: vi.fn(() => true),
  getClientKey: vi.fn(() => 'SB-Mid-client-TEST_KEY_67890'),
}));

const mockTransactionLogger = vi.hoisted(() => ({
  createRequested: vi.fn(),
  createSuccess: vi.fn(),
  createFailed: vi.fn(),
  webhookReceived: vi.fn(),
  webhookVerified: vi.fn(),
  webhookInvalidSignature: vi.fn(),
  webhookIdempotent: vi.fn(),
  webhookProcessed: vi.fn(),
  webhookFailed: vi.fn(),
  rateLimitHit: vi.fn(),
  statusChanged: vi.fn(),
}));

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

// ==================== MODULE MOCKS ====================

vi.mock('@/config/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('@/config/midtrans', () => ({
  snap: mockSnap,
  coreApi: mockCoreApi,
  midtransConfig: mockMidtransConfig,
}));

vi.mock('@/shared/utils/logger', () => ({
  logger: mockLogger,
  transactionLogger: mockTransactionLogger,
}));

vi.mock('@/shared/errors/app-errors', () => {
  class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly errorCode?: string;
    public readonly context?: Record<string, any>;
    constructor(message: string, statusCode = 500, errorCode?: string, context?: Record<string, any>) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true;
      this.errorCode = errorCode;
      this.context = context;
    }
  }
  class NotFoundError extends AppError {
    constructor(message = 'Not found', errorCode?: string, context?: Record<string, any>) {
      super(message, 404, errorCode, context);
    }
  }
  class ConflictError extends AppError {
    constructor(message = 'Conflict', errorCode?: string, context?: Record<string, any>) {
      super(message, 409, errorCode, context);
    }
  }
  class BadRequestError extends AppError {
    constructor(message = 'Bad request', errorCode?: string, context?: Record<string, any>) {
      super(message, 400, errorCode, context);
    }
  }
  class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', errorCode?: string, context?: Record<string, any>) {
      super(message, 401, errorCode, context);
    }
  }
  class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', errorCode?: string, context?: Record<string, any>) {
      super(message, 403, errorCode, context);
    }
  }
  return { AppError, NotFoundError, ConflictError, BadRequestError, UnauthorizedError, ForbiddenError };
});

vi.mock('@/config/constants', () => ({
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
  },
}));

// ==================== IMPORT SUT ====================

import {
  handleWebhookNotification,
  createTransaction,
  cancelTransaction,
  checkExamAccess,
} from './transactions.service';

// ==================== TEST HELPERS ====================

/**
 * Build a valid Midtrans notification with real SHA-512 signature.
 * Uses the mocked serverKey from mockMidtransConfig.
 */
function makeNotification(overrides: Record<string, any> = {}) {
  const orderId = overrides.order_id ?? 'TRX-123456-ABCD';
  const statusCode = overrides.status_code ?? '200';
  const grossAmount = overrides.gross_amount ?? '50000.00';
  const transactionStatus = overrides.transaction_status ?? 'settlement';

  const payload = orderId + statusCode + grossAmount + mockMidtransConfig.serverKey;
  const signatureKey = crypto.createHash('sha512').update(payload).digest('hex');

  return {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    transaction_status: transactionStatus,
    signature_key: signatureKey,
    payment_type: 'bank_transfer',
    transaction_id: 'mt-txn-001',
    transaction_time: '2025-06-15 10:00:00',
    status_message: 'Success',
    merchant_id: 'G123456',
    currency: 'IDR',
    ...overrides,
    // Re-compute signature if overrides changed any of the fields
    ...(overrides.signature_key !== undefined ? {} : (() => {
      const p = (overrides.order_id ?? orderId) +
        (overrides.status_code ?? statusCode) +
        (overrides.gross_amount ?? grossAmount) +
        mockMidtransConfig.serverKey;
      return { signature_key: crypto.createHash('sha512').update(p).digest('hex') };
    })()),
  };
}

const makeTransaction = (overrides: Record<string, any> = {}) => ({
  id: 1,
  orderId: 'TRX-123456-ABCD',
  userId: 100,
  examId: 10,
  amount: 50000,
  status: TransactionStatus.PENDING,
  paymentType: null,
  snapToken: 'snap-token-abc',
  snapRedirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/abc',
  paidAt: null,
  expiredAt: new Date('2025-06-16T10:00:00Z'),
  createdAt: new Date('2025-06-15T10:00:00Z'),
  updatedAt: new Date('2025-06-15T10:00:00Z'),
  metadata: null,
  exam: { id: 10, title: 'CPNS Tryout', price: 50000 },
  user: { id: 100, name: 'Test User', email: 'test@example.com' },
  ...overrides,
});

// ==================== TESTS ====================

describe('handleWebhookNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: $transaction invokes the callback
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb({
      transaction: {
        findUnique: mockPrisma.transaction.findUnique,
        update: mockPrisma.transaction.update,
      },
    }));
  });

  it('should throw UnauthorizedError when signature is invalid', async () => {
    const notification = makeNotification({ signature_key: 'invalid-signature-hash' });

    await expect(handleWebhookNotification(notification)).rejects.toThrow('Invalid signature');
    await expect(handleWebhookNotification(notification)).rejects.toMatchObject({
      statusCode: 401,
    });

    expect(mockTransactionLogger.webhookInvalidSignature).toHaveBeenCalledWith('TRX-123456-ABCD');
  });

  it('should update status to PAID on settlement', async () => {
    const notification = makeNotification({ transaction_status: 'settlement' });
    const existingTx = makeTransaction({ status: TransactionStatus.PENDING });

    mockPrisma.transaction.findUnique.mockResolvedValueOnce(existingTx); // for lock
    mockPrisma.transaction.update.mockResolvedValue(makeTransaction({ status: TransactionStatus.PAID }));

    const result = await handleWebhookNotification(notification);

    expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TransactionStatus.PAID,
          paymentType: 'bank_transfer',
          paidAt: expect.any(Date),
        }),
      })
    );
    expect(result.status).toBe(TransactionStatus.PAID);
  });

  it('should update status to PAID on capture', async () => {
    const notification = makeNotification({ transaction_status: 'capture' });
    const existingTx = makeTransaction({ status: TransactionStatus.PENDING });

    mockPrisma.transaction.findUnique.mockResolvedValueOnce(existingTx);
    mockPrisma.transaction.update.mockResolvedValue(makeTransaction({ status: TransactionStatus.PAID }));

    await handleWebhookNotification(notification);

    expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TransactionStatus.PAID,
        }),
      })
    );
  });

  it('should update status to EXPIRED on expire', async () => {
    const notification = makeNotification({ transaction_status: 'expire' });
    const existingTx = makeTransaction({ status: TransactionStatus.PENDING });

    mockPrisma.transaction.findUnique.mockResolvedValueOnce(existingTx);
    mockPrisma.transaction.update.mockResolvedValue(makeTransaction({ status: TransactionStatus.EXPIRED }));

    await handleWebhookNotification(notification);

    expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TransactionStatus.EXPIRED,
        }),
      })
    );
  });

  it('should be idempotent when status is already the same', async () => {
    const notification = makeNotification({ transaction_status: 'settlement' });
    const existingTx = makeTransaction({ status: TransactionStatus.PAID }); // already PAID

    mockPrisma.transaction.findUnique
      .mockResolvedValueOnce(existingTx) // for lock check
      .mockResolvedValueOnce(existingTx); // for return

    await handleWebhookNotification(notification);

    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    expect(mockTransactionLogger.webhookIdempotent).toHaveBeenCalledWith({
      orderId: 'TRX-123456-ABCD',
      status: TransactionStatus.PAID,
    });
  });

  it('should prevent status regression (PAID → PENDING blocked)', async () => {
    const notification = makeNotification({ transaction_status: 'pending' });
    const existingTx = makeTransaction({ status: TransactionStatus.PAID }); // higher priority

    mockPrisma.transaction.findUnique
      .mockResolvedValueOnce(existingTx)
      .mockResolvedValueOnce(existingTx);

    await handleWebhookNotification(notification);

    // Should NOT downgrade from PAID to PENDING
    expect(mockPrisma.transaction.update).not.toHaveBeenCalled();
    expect(mockTransactionLogger.webhookIdempotent).toHaveBeenCalled();
  });

  it('should throw NotFoundError when transaction not found', async () => {
    const notification = makeNotification();
    mockPrisma.transaction.findUnique.mockResolvedValue(null);

    await expect(handleWebhookNotification(notification)).rejects.toThrow('Transaction not found');
    await expect(handleWebhookNotification(notification)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should save paymentType from notification', async () => {
    const notification = makeNotification({
      transaction_status: 'settlement',
      payment_type: 'credit_card',
    });
    const existingTx = makeTransaction({ status: TransactionStatus.PENDING });

    mockPrisma.transaction.findUnique.mockResolvedValueOnce(existingTx);
    mockPrisma.transaction.update.mockResolvedValue(makeTransaction({ status: TransactionStatus.PAID }));

    await handleWebhookNotification(notification);

    expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentType: 'credit_card',
        }),
      })
    );
  });

  it('should save notification as metadata', async () => {
    const notification = makeNotification({ transaction_status: 'settlement' });
    const existingTx = makeTransaction({ status: TransactionStatus.PENDING });

    mockPrisma.transaction.findUnique.mockResolvedValueOnce(existingTx);
    mockPrisma.transaction.update.mockResolvedValue(makeTransaction({ status: TransactionStatus.PAID }));

    await handleWebhookNotification(notification);

    expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            order_id: 'TRX-123456-ABCD',
            transaction_status: 'settlement',
          }),
        }),
      })
    );
  });

  it('should log webhookReceived and webhookVerified on valid request', async () => {
    const notification = makeNotification({ transaction_status: 'settlement' });
    const existingTx = makeTransaction({ status: TransactionStatus.PENDING });

    mockPrisma.transaction.findUnique.mockResolvedValueOnce(existingTx);
    mockPrisma.transaction.update.mockResolvedValue(makeTransaction({ status: TransactionStatus.PAID }));

    await handleWebhookNotification(notification);

    expect(mockTransactionLogger.webhookReceived).toHaveBeenCalledWith({
      orderId: 'TRX-123456-ABCD',
      status: 'settlement',
      paymentType: 'bank_transfer',
    });
    expect(mockTransactionLogger.webhookVerified).toHaveBeenCalledWith('TRX-123456-ABCD');
  });
});

// ==================== createTransaction ====================

describe('createTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMidtransConfig.isConfigured.mockReturnValue(true);
  });

  it('should create transaction and return snapToken + snapRedirectUrl', async () => {
    mockPrisma.exam.findUnique.mockResolvedValue({ id: 10, title: 'CPNS Tryout', price: 50000 });
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(null)  // no existing PAID
      .mockResolvedValueOnce(null); // no existing PENDING
    mockPrisma.user.findUnique.mockResolvedValue({ id: 100, name: 'Test User', email: 'test@example.com' });
    mockSnap.createTransaction.mockResolvedValue({
      token: 'snap-token-new',
      redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/new',
    });
    mockPrisma.transaction.create.mockResolvedValue(makeTransaction({
      snapToken: 'snap-token-new',
      snapRedirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/new',
    }));

    const result = await createTransaction(100, { examId: 10 });

    expect(result).toMatchObject({
      snapToken: 'snap-token-new',
      snapRedirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/new',
      clientKey: 'SB-Mid-client-TEST_KEY_67890',
    });
    expect(result.transaction).toBeDefined();
  });

  it('should throw NotFoundError when exam does not exist', async () => {
    mockPrisma.exam.findUnique.mockResolvedValue(null);

    await expect(createTransaction(100, { examId: 999 })).rejects.toThrow('Exam not found');
    await expect(createTransaction(100, { examId: 999 })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should throw BadRequestError when exam is free', async () => {
    mockPrisma.exam.findUnique.mockResolvedValue({ id: 10, title: 'Free Exam', price: 0 });

    await expect(createTransaction(100, { examId: 10 })).rejects.toThrow(
      'This exam is free and does not require payment'
    );
    await expect(createTransaction(100, { examId: 10 })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('should throw ConflictError when already PAID', async () => {
    mockPrisma.exam.findUnique.mockResolvedValue({ id: 10, title: 'Exam', price: 50000 });
    // Use mockResolvedValue (not Once) so second assertion call also returns PAID
    mockPrisma.transaction.findFirst.mockResolvedValue(makeTransaction({ status: TransactionStatus.PAID }));

    await expect(createTransaction(100, { examId: 10 })).rejects.toThrow(
      'You already have access to this exam'
    );
    await expect(createTransaction(100, { examId: 10 })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('should return existing valid PENDING transaction (idempotent)', async () => {
    const pendingTx = makeTransaction({
      status: TransactionStatus.PENDING,
      expiredAt: new Date('2099-01-01T00:00:00Z'), // far future — not expired
    });
    mockPrisma.exam.findUnique.mockResolvedValue({ id: 10, title: 'Exam', price: 50000 });
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(null)       // no PAID
      .mockResolvedValueOnce(pendingTx); // existing PENDING

    // expireTransactionIfNeeded: return valid (not expired)
    mockPrisma.transaction.findUnique.mockResolvedValue(pendingTx);

    const result = await createTransaction(100, { examId: 10 });

    expect(result.snapToken).toBe('snap-token-abc');
    // Should NOT create a new transaction
    expect(mockSnap.createTransaction).not.toHaveBeenCalled();
    expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
  });

  it('should create new transaction after lazy cleanup of expired PENDING', async () => {
    const expiredPending = makeTransaction({
      status: TransactionStatus.PENDING,
      expiredAt: new Date('2020-01-01T00:00:00Z'), // past
    });

    mockPrisma.exam.findUnique.mockResolvedValue({ id: 10, title: 'Exam', price: 50000 });
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(null)            // no PAID
      .mockResolvedValueOnce(expiredPending); // expired PENDING

    // expireTransactionIfNeeded: finds expired → updates → returns null
    mockPrisma.transaction.findUnique.mockResolvedValue(expiredPending);
    mockPrisma.transaction.update.mockResolvedValue({
      ...expiredPending,
      status: TransactionStatus.EXPIRED,
    });

    // After cleanup, proceed to create new
    mockPrisma.user.findUnique.mockResolvedValue({ id: 100, name: 'Test User', email: 'test@example.com' });
    mockSnap.createTransaction.mockResolvedValue({
      token: 'new-snap-token',
      redirect_url: 'https://new-redirect-url',
    });
    mockPrisma.transaction.create.mockResolvedValue(makeTransaction({
      snapToken: 'new-snap-token',
      snapRedirectUrl: 'https://new-redirect-url',
    }));

    const result = await createTransaction(100, { examId: 10 });

    expect(mockSnap.createTransaction).toHaveBeenCalled();
    expect(result.snapToken).toBe('new-snap-token');
  });

  it('should throw AppError BAD_GATEWAY when Midtrans API fails', async () => {
    mockPrisma.exam.findUnique.mockResolvedValue({ id: 10, title: 'Exam', price: 50000 });
    mockPrisma.transaction.findFirst.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ id: 100, name: 'Test', email: 'test@test.com' });
    mockSnap.createTransaction.mockRejectedValue(new Error('Midtrans timeout'));

    await expect(createTransaction(100, { examId: 10 })).rejects.toThrow(
      'Failed to initialize payment. Please try again later.'
    );
    await expect(createTransaction(100, { examId: 10 })).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it('should throw AppError when Midtrans is not configured', async () => {
    mockMidtransConfig.isConfigured.mockReturnValue(false);

    await expect(createTransaction(100, { examId: 10 })).rejects.toThrow(
      'Payment gateway is not configured'
    );
    await expect(createTransaction(100, { examId: 10 })).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});

// ==================== cancelTransaction ====================

describe('cancelTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cancel a PENDING transaction owned by user', async () => {
    const pendingTx = makeTransaction({ status: TransactionStatus.PENDING, metadata: {} });
    mockPrisma.transaction.findUnique.mockResolvedValue(pendingTx);
    mockPrisma.transaction.update.mockResolvedValue(
      makeTransaction({ status: TransactionStatus.CANCELLED })
    );

    const result = await cancelTransaction(1, 100);

    expect(result.status).toBe(TransactionStatus.CANCELLED);
    expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          status: TransactionStatus.CANCELLED,
          metadata: expect.objectContaining({
            cancelled_by: 'user',
          }),
        }),
      })
    );
  });

  it('should throw NotFoundError when transaction not found', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue(null);

    await expect(cancelTransaction(999, 100)).rejects.toThrow('Transaction not found');
    await expect(cancelTransaction(999, 100)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('should throw ForbiddenError when user does not own transaction', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue(makeTransaction({ userId: 200 }));

    await expect(cancelTransaction(1, 100)).rejects.toThrow('Unauthorized');
    await expect(cancelTransaction(1, 100)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('should throw BadRequestError when transaction is not PENDING', async () => {
    mockPrisma.transaction.findUnique.mockResolvedValue(
      makeTransaction({ status: TransactionStatus.PAID })
    );

    await expect(cancelTransaction(1, 100)).rejects.toThrow(
      'Only pending transactions can be cancelled'
    );
    await expect(cancelTransaction(1, 100)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

// ==================== checkExamAccess ====================

describe('checkExamAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return hasAccess:true with reason "free" for free exams', async () => {
    mockPrisma.exam.findUnique.mockResolvedValue({ id: 10, title: 'Free Exam', price: 0 });

    const result = await checkExamAccess(100, 10);

    expect(result).toMatchObject({
      hasAccess: true,
      reason: 'free',
      transaction: null,
    });
  });

  it('should return hasAccess:true with reason "paid" for PAID transaction', async () => {
    mockPrisma.exam.findUnique.mockResolvedValue({ id: 10, title: 'Paid Exam', price: 50000 });
    mockPrisma.transaction.findFirst.mockResolvedValueOnce(
      makeTransaction({ status: TransactionStatus.PAID })
    );

    const result = await checkExamAccess(100, 10);

    expect(result).toMatchObject({
      hasAccess: true,
      reason: 'paid',
    });
    expect(result.transaction).toBeDefined();
  });

  it('should return hasAccess:false with reason "pending" for valid PENDING transaction', async () => {
    const pendingTx = makeTransaction({
      status: TransactionStatus.PENDING,
      expiredAt: new Date('2099-01-01T00:00:00Z'), // far future, not expired
    });
    mockPrisma.exam.findUnique.mockResolvedValue({ id: 10, title: 'Exam', price: 50000 });
    mockPrisma.transaction.findFirst
      .mockResolvedValueOnce(null)       // no PAID
      .mockResolvedValueOnce(pendingTx); // PENDING exists

    // expireTransactionIfNeeded: return valid
    mockPrisma.transaction.findUnique.mockResolvedValue(pendingTx);

    const result = await checkExamAccess(100, 10);

    expect(result).toMatchObject({
      hasAccess: false,
      reason: 'pending',
    });
    expect(result.transaction).toBeDefined();
  });

  it('should return hasAccess:false with reason "not_purchased" when no transaction', async () => {
    mockPrisma.exam.findUnique.mockResolvedValue({ id: 10, title: 'Exam', price: 50000 });
    mockPrisma.transaction.findFirst.mockResolvedValue(null);

    const result = await checkExamAccess(100, 10);

    expect(result).toMatchObject({
      hasAccess: false,
      reason: 'not_purchased',
      transaction: null,
    });
  });

  it('should throw NotFoundError when exam does not exist', async () => {
    mockPrisma.exam.findUnique.mockResolvedValue(null);

    await expect(checkExamAccess(100, 999)).rejects.toThrow('Exam not found');
    await expect(checkExamAccess(100, 999)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
