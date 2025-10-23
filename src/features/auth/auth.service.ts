import { UserRole } from '@prisma/client';
import { prisma } from '@/config/database';
import { hash, compare, sha256 } from '@/shared/utils/hash';
import { generateTokens, verifyRefreshToken } from '@/shared/utils/jwt';
import { ERROR_MESSAGES } from '@/config/constants';
import type { RegisterInput, LoginInput } from './auth.validation';

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
      role: UserRole.PARTICIPANT, // Default role
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
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
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  // Verify password
  const isPasswordValid = await compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  // Optional: Check if email is verified
  // if (!user.isEmailVerified) {
  //   throw new Error('Please verify your email before logging in');
  // }

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
    throw new Error('Invalid refresh token');
  }

  // Check if token is expired
  if (tokenDoc.expires < new Date()) {
    // Delete expired token
    await prisma.token.delete({
      where: { id: tokenDoc.id },
    });
    throw new Error('Refresh token expired');
  }

  // Delete old refresh token
  await prisma.token.delete({
    where: { id: tokenDoc.id },
  });

  // Generate new tokens
  const tokens = await generateTokens(tokenDoc.user.id, tokenDoc.user.role);

  return tokens;
};

/**
 * Logout user (invalidate refresh token)
 */
export const logout = async (refreshToken: string) => {
  // Find and delete token
  const tokenDoc = await prisma.token.findUnique({
    where: {
      tokenHash: sha256(refreshToken),
    },
  });

  if (!tokenDoc) {
    throw new Error('Token not found');
  }

  await prisma.token.delete({
    where: { id: tokenDoc.id },
  });

  return { message: 'Logged out successfully' };
};