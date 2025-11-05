import { UserRole } from '@prisma/client';
import { prisma } from '@/config/database';
import { hash, compare, sha256 } from '@/shared/utils/hash';
import { generateTokens, verifyRefreshToken } from '@/shared/utils/jwt';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { ConflictError, UnauthorizedError, NotFoundError } from '@/shared/errors/app-errors';
import type { RegisterInput, LoginInput } from './auth.validation';

// ==================== PRISMA SELECT OBJECTS ====================

/**
 * Public user data without password
 * Used for API responses
 */
const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * User data with password
 * Used for authentication
 */
const USER_WITH_PASSWORD_SELECT = {
  ...USER_PUBLIC_SELECT,
  password: true,
} as const;

// ==================== SERVICE FUNCTIONS ====================

/**
 * Register a new user
 *
 * @param input - Registration data (email, password, name)
 * @returns User data and authentication tokens
 * @throws {ConflictError} If email already exists
 */
export const register = async (input: RegisterInput) => {
  const { email, password, name } = input;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError(ERROR_MESSAGES.EMAIL_EXISTS, {
      email,
      errorCode: ERROR_CODES.AUTH_EMAIL_EXISTS,
    });
  }

  // Hash password
  const hashedPassword = await hash(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: UserRole.PARTICIPANT,
    },
    select: USER_PUBLIC_SELECT,
  });

  // Generate tokens
  const tokens = await generateTokens(user.id, user.role);

  return {
    user,
    tokens,
  };
};

/**
 * Login user with email and password
 *
 * @param input - Login credentials (email, password)
 * @returns User data and authentication tokens
 * @throws {UnauthorizedError} If credentials are invalid
 */
export const login = async (input: LoginInput) => {
  const { email, password } = input;

  // Find user with password
  const user = await prisma.user.findUnique({
    where: { email },
    select: USER_WITH_PASSWORD_SELECT,
  });

  if (!user) {
    throw new UnauthorizedError(ERROR_MESSAGES.INVALID_CREDENTIALS, {
      email,
      errorCode: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    });
  }

  // Verify password
  const isPasswordValid = await compare(password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError(ERROR_MESSAGES.INVALID_CREDENTIALS, {
      email,
      errorCode: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    });
  }

  // Generate tokens
  const tokens = await generateTokens(user.id, user.role);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    tokens,
  };
};

/**
 * Refresh access token using refresh token
 *
 * @param refreshToken - Valid refresh token
 * @returns New access and refresh tokens
 * @throws {UnauthorizedError} If refresh token is invalid or expired
 */
export const refreshAccessToken = async (refreshToken: string) => {
  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Check if token exists in database
  const tokenDoc = await prisma.token.findUnique({
    where: {
      tokenHash: sha256(refreshToken),
      expires: { gte: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          role: true,
        },
      },
    },
  });

  if (!tokenDoc) {
    throw new UnauthorizedError(ERROR_MESSAGES.INVALID_REFRESH_TOKEN, {
      errorCode: ERROR_CODES.AUTH_INVALID_TOKEN,
    });
  }

  // Generate new tokens
  const tokens = await generateTokens(tokenDoc.user.id, tokenDoc.user.role);

  // Delete old refresh token
  await prisma.token.delete({
    where: { id: tokenDoc.id },
  });

  return tokens;
};

/**
 * Logout user by invalidating refresh token
 *
 * @param refreshToken - Refresh token to invalidate
 * @throws {NotFoundError} If token not found
 */
export const logout = async (refreshToken: string) => {
  const tokenDoc = await prisma.token.findUnique({
    where: {
      tokenHash: sha256(refreshToken),
    },
  });

  if (!tokenDoc) {
    throw new NotFoundError(ERROR_MESSAGES.TOKEN_NOT_FOUND, {
      errorCode: ERROR_CODES.AUTH_INVALID_TOKEN,
    });
  }

  await prisma.token.delete({
    where: { id: tokenDoc.id },
  });

  return { success: true };
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Find user by email (internal use)
 * Used for checking user existence
 */
export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
    select: USER_PUBLIC_SELECT,
  });
};

/**
 * Delete all expired tokens (cleanup task)
 * Should be called by cron job or scheduled task
 */
export const cleanupExpiredTokens = async () => {
  const result = await prisma.token.deleteMany({
    where: {
      expires: { lt: new Date() },
    },
  });

  return { deleted: result.count };
};