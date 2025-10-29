import { UserRole } from '@prisma/client';
import { prisma } from '@/config/database';
import { hash, compare, sha256 } from '@/shared/utils/hash';
import { generateTokens, verifyRefreshToken } from '@/shared/utils/jwt';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { ConflictError, UnauthorizedError, NotFoundError } from '@/shared/errors/app-errors';
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
 * Login user
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
 * Refresh access token
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
 * Logout user (invalidate refresh token)
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

  return { message: 'Logged out successfully' };
};