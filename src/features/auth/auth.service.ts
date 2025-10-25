import { UserRole } from '@prisma/client';
import { prisma } from '@/config/database';
import { hash, compare, sha256 } from '@/shared/utils/hash';
import { generateTokens, verifyRefreshToken } from '@/shared/utils/jwt';
import { ERROR_MESSAGES } from '@/config/constants';
import { logger } from '@/shared/utils/logger';
import type { RegisterInput, LoginInput } from './auth.validation';

// Reusable Prisma select objects (internal to service)
const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

const USER_WITH_PASSWORD_SELECT = {
  ...USER_PUBLIC_SELECT,
  password: true,
} as const;

/**
 * Register a new user
 */
export const register = async (input: RegisterInput) => {
  const { email, password, name } = input;

  logger.info({ email }, 'User registration attempt');

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    logger.warn({ email }, 'Registration failed - email exists');
    throw new Error(ERROR_MESSAGES.EMAIL_EXISTS);
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

  logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

  return {
    user,
    tokens,
  };
};

/**
 * Login user
 */
export const login = async (input: LoginInput) => {
  const { email, password } = input;

  logger.info({ email }, 'User login attempt');

  // Find user with password
  const user = await prisma.user.findUnique({
    where: { email },
    select: USER_WITH_PASSWORD_SELECT,
  });

  if (!user) {
    logger.warn({ email }, 'Login failed - user not found');
    throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  // Verify password
  const isPasswordValid = await compare(password, user.password);

  if (!isPasswordValid) {
    logger.warn({ email }, 'Login failed - invalid password');
    throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  // Generate tokens
  const tokens = await generateTokens(user.id, user.role);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

  return {
    user: userWithoutPassword,
    tokens,
  };
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (refreshToken: string) => {
  logger.debug('Token refresh attempt');

  // Verify refresh token
  const payload = verifyRefreshToken(refreshToken);

  // Check if token exists in database
  const tokenDoc = await prisma.token.findUnique({
    where: {
      tokenHash: sha256(refreshToken),
      expires: { gte: new Date() }, // Only get non-expired tokens
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
    logger.warn('Token refresh failed - invalid or expired token');
    throw new Error(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
  }

  // Generate new tokens
  const tokens = await generateTokens(tokenDoc.user.id, tokenDoc.user.role);

  // Delete old refresh token
  await prisma.token.delete({
    where: { id: tokenDoc.id },
  });

  logger.info({ userId: tokenDoc.user.id }, 'Token refreshed successfully');

  return tokens;
};

/**
 * Logout user (invalidate refresh token)
 */
export const logout = async (refreshToken: string) => {
  logger.debug('User logout attempt');

  const tokenDoc = await prisma.token.findUnique({
    where: {
      tokenHash: sha256(refreshToken),
    },
  });

  if (!tokenDoc) {
    logger.warn('Logout failed - token not found');
    throw new Error(ERROR_MESSAGES.TOKEN_NOT_FOUND);
  }

  await prisma.token.delete({
    where: { id: tokenDoc.id },
  });

  logger.info({ userId: tokenDoc.userId }, 'User logged out successfully');

  return { message: 'Logged out successfully' };
};