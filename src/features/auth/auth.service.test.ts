/**
 * Auth Service Tests
 *
 * Tests security-critical authentication flows:
 * - register: user creation with duplicate prevention
 * - login: credential verification with anti-enumeration
 * - refreshAccessToken: token rotation with single-use enforcement
 * - logout: token invalidation
 * - findUserByEmail / cleanupExpiredTokens
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole } from '@prisma/client';

// ---------------------------------------------------------------------------
// Hoisted mocks (declared before vi.mock factories)
// ---------------------------------------------------------------------------
const { mockHash, mockCompare, mockSha256 } = vi.hoisted(() => ({
  mockHash: vi.fn(),
  mockCompare: vi.fn(),
  mockSha256: vi.fn(),
}));

const { mockGenerateTokens, mockVerifyRefreshToken } = vi.hoisted(() => ({
  mockGenerateTokens: vi.fn(),
  mockVerifyRefreshToken: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
vi.mock('@/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    token: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock hash utilities
// ---------------------------------------------------------------------------
vi.mock('@/shared/utils/hash', () => ({
  hash: mockHash,
  compare: mockCompare,
  sha256: mockSha256,
}));

// ---------------------------------------------------------------------------
// Mock JWT utilities
// ---------------------------------------------------------------------------
vi.mock('@/shared/utils/jwt', () => ({
  generateTokens: mockGenerateTokens,
  verifyRefreshToken: mockVerifyRefreshToken,
}));

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
vi.mock('@/shared/utils/logger', () => ({
  authLogger: {
    registerSuccess: vi.fn(),
    registerFailed: vi.fn(),
    loginSuccess: vi.fn(),
    loginFailed: vi.fn(),
    tokenRefreshed: vi.fn(),
    tokenInvalid: vi.fn(),
    logoutSuccess: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import SUT after all mocks
// ---------------------------------------------------------------------------
import {
  register,
  login,
  refreshAccessToken,
  logout,
  findUserByEmail,
  cleanupExpiredTokens,
} from './auth.service';
import { prisma } from '@/config/database';
import { authLogger } from '@/shared/utils/logger';

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  role: UserRole.PARTICIPANT,
  isEmailVerified: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const MOCK_USER_WITH_PASSWORD = {
  ...MOCK_USER,
  password: '$2b$10$hashedpassword',
};

const MOCK_TOKENS = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

const MOCK_TOKEN_DOC = {
  id: 1,
  tokenHash: 'hashed-refresh-token',
  type: 'REFRESH' as const,
  expires: new Date(Date.now() + 86400000), // tomorrow
  userId: 1,
  createdAt: new Date(),
  user: { id: 1, role: UserRole.PARTICIPANT },
};

// ============================================================================
// register
// ============================================================================

describe('register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHash.mockResolvedValue('$2b$10$hashedpassword');
    mockGenerateTokens.mockResolvedValue(MOCK_TOKENS);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(MOCK_USER as any);
  });

  it('should register a new user and return user + tokens', async () => {
    const result = await register({ email: 'test@example.com', password: 'Password1', name: 'Test User' });

    expect(result.user).toBeDefined();
    expect(result.tokens).toEqual(MOCK_TOKENS);
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('should throw BadRequestError if email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER_WITH_PASSWORD as any);

    await expect(
      register({ email: 'test@example.com', password: 'Password1', name: 'Test User' })
    ).rejects.toThrow();

    expect(authLogger.registerFailed).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com', reason: 'email_already_exists' })
    );
  });

  it('should hash password before saving', async () => {
    await register({ email: 'test@example.com', password: 'Password1', name: 'Test User' });

    expect(mockHash).toHaveBeenCalledWith('Password1');
  });

  it('should create user with role PARTICIPANT', async () => {
    await register({ email: 'test@example.com', password: 'Password1', name: 'Test User' });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: UserRole.PARTICIPANT }),
      })
    );
  });

  it('should call generateTokens with userId and role', async () => {
    await register({ email: 'test@example.com', password: 'Password1', name: 'Test User' });

    expect(mockGenerateTokens).toHaveBeenCalledWith(MOCK_USER.id, MOCK_USER.role);
  });

  it('should not include password in response user', async () => {
    const result = await register({ email: 'test@example.com', password: 'Password1', name: 'Test User' });

    expect(result.user).not.toHaveProperty('password');
  });

  it('should call authLogger.registerSuccess on success', async () => {
    await register({ email: 'test@example.com', password: 'Password1', name: 'Test User' });

    expect(authLogger.registerSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com', userId: MOCK_USER.id })
    );
  });
});

// ============================================================================
// login
// ============================================================================

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompare.mockResolvedValue(true);
    mockGenerateTokens.mockResolvedValue(MOCK_TOKENS);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER_WITH_PASSWORD as any);
  });

  it('should return user + tokens for valid credentials', async () => {
    const result = await login({ email: 'test@example.com', password: 'Password1' });

    expect(result.user).toBeDefined();
    expect(result.tokens).toEqual(MOCK_TOKENS);
  });

  it('should throw UnauthorizedError if user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      login({ email: 'nonexistent@example.com', password: 'Password1' })
    ).rejects.toThrow();

    expect(authLogger.loginFailed).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'user_not_found' })
    );
  });

  it('should throw UnauthorizedError if password is wrong', async () => {
    mockCompare.mockResolvedValue(false);

    await expect(
      login({ email: 'test@example.com', password: 'WrongPassword1' })
    ).rejects.toThrow();

    expect(authLogger.loginFailed).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'invalid_password' })
    );
  });

  it('should use same error message for user not found and wrong password (anti-enumeration)', async () => {
    // Case 1: user not found
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    let error1: Error | null = null;
    try { await login({ email: 'x@x.com', password: 'P' }); } catch (e) { error1 = e as Error; }

    // Case 2: wrong password
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER_WITH_PASSWORD as any);
    mockCompare.mockResolvedValue(false);
    let error2: Error | null = null;
    try { await login({ email: 'test@example.com', password: 'Wrong1' }); } catch (e) { error2 = e as Error; }

    expect(error1!.message).toBe(error2!.message);
  });

  it('should call compare with input password and hashed password', async () => {
    await login({ email: 'test@example.com', password: 'Password1' });

    expect(mockCompare).toHaveBeenCalledWith('Password1', MOCK_USER_WITH_PASSWORD.password);
  });

  it('should not include password in response', async () => {
    const result = await login({ email: 'test@example.com', password: 'Password1' });

    expect(result.user).not.toHaveProperty('password');
  });

  it('should call authLogger.loginSuccess on success', async () => {
    await login({ email: 'test@example.com', password: 'Password1' });

    expect(authLogger.loginSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com', userId: MOCK_USER.id })
    );
  });
});

// ============================================================================
// refreshAccessToken
// ============================================================================

describe('refreshAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyRefreshToken.mockReturnValue({ userId: 1, role: UserRole.PARTICIPANT, type: 'refresh' });
    mockSha256.mockReturnValue('hashed-refresh-token');
    mockGenerateTokens.mockResolvedValue(MOCK_TOKENS);
    vi.mocked(prisma.token.findUnique).mockResolvedValue(MOCK_TOKEN_DOC as any);
    vi.mocked(prisma.token.delete).mockResolvedValue(MOCK_TOKEN_DOC as any);
  });

  it('should return new tokens for valid refresh token', async () => {
    const result = await refreshAccessToken('valid-refresh-token');

    expect(result).toEqual(MOCK_TOKENS);
  });

  it('should call verifyRefreshToken', async () => {
    await refreshAccessToken('valid-refresh-token');

    expect(mockVerifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
  });

  it('should throw UnauthorizedError if token not in DB', async () => {
    vi.mocked(prisma.token.findUnique).mockResolvedValue(null);

    await expect(refreshAccessToken('invalid-token')).rejects.toThrow();

    expect(authLogger.tokenInvalid).toHaveBeenCalled();
  });

  it('should propagate error if verifyRefreshToken throws', async () => {
    mockVerifyRefreshToken.mockImplementation(() => { throw new Error('JWT expired'); });

    await expect(refreshAccessToken('expired-token')).rejects.toThrow('JWT expired');
  });

  it('should delete old refresh token', async () => {
    await refreshAccessToken('valid-refresh-token');

    expect(prisma.token.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: MOCK_TOKEN_DOC.id } })
    );
  });

  it('should call generateTokens with user from DB token', async () => {
    await refreshAccessToken('valid-refresh-token');

    expect(mockGenerateTokens).toHaveBeenCalledWith(
      MOCK_TOKEN_DOC.user.id,
      MOCK_TOKEN_DOC.user.role
    );
  });
});

// ============================================================================
// logout
// ============================================================================

describe('logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSha256.mockReturnValue('hashed-token');
    vi.mocked(prisma.token.findUnique).mockResolvedValue({ ...MOCK_TOKEN_DOC, userId: 1 } as any);
    vi.mocked(prisma.token.delete).mockResolvedValue(MOCK_TOKEN_DOC as any);
  });

  it('should delete token and return success', async () => {
    const result = await logout('refresh-token');

    expect(prisma.token.delete).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it('should throw NotFoundError if token not found', async () => {
    vi.mocked(prisma.token.findUnique).mockResolvedValue(null);

    await expect(logout('invalid-token')).rejects.toThrow();
  });

  it('should call sha256 to hash the token', async () => {
    await logout('refresh-token');

    expect(mockSha256).toHaveBeenCalledWith('refresh-token');
  });

  it('should call authLogger.logoutSuccess', async () => {
    await logout('refresh-token');

    expect(authLogger.logoutSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ userId: expect.any(Number) })
    );
  });
});

// ============================================================================
// findUserByEmail
// ============================================================================

describe('findUserByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user when found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as any);

    const result = await findUserByEmail('test@example.com');

    expect(result).toBeDefined();
    expect(result!.email).toBe('test@example.com');
  });

  it('should return null when not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await findUserByEmail('nonexistent@example.com');

    expect(result).toBeNull();
  });
});

// ============================================================================
// cleanupExpiredTokens
// ============================================================================

describe('cleanupExpiredTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete expired tokens and return count', async () => {
    vi.mocked(prisma.token.deleteMany).mockResolvedValue({ count: 5 });

    const result = await cleanupExpiredTokens();

    expect(result).toEqual({ deleted: 5 });
    expect(prisma.token.deleteMany).toHaveBeenCalled();
  });

  it('should return deleted 0 when no expired tokens', async () => {
    vi.mocked(prisma.token.deleteMany).mockResolvedValue({ count: 0 });

    const result = await cleanupExpiredTokens();

    expect(result).toEqual({ deleted: 0 });
  });
});
