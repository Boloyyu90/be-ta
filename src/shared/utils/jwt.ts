import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { UserRole } from '@prisma/client';
import { prisma } from '@/config/database';
import { sha256 } from './hash';

interface TokenPayload {
  userId: number;
  role: UserRole;
  type: 'access' | 'refresh';
}

export const generateAccessToken = (userId: number, role: UserRole): string => {
  return jwt.sign(
    { userId, role, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: `${env.JWT_ACCESS_EXPIRATION_MINUTES}m` }
  );
};

export const generateRefreshToken = (userId: number, role: UserRole): string => {
  return jwt.sign(
    { userId, role, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: `${env.JWT_REFRESH_EXPIRATION_DAYS}d` }
  );
};

export const verifyAccessToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }

  return decoded;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return decoded;
};

export const generateTokens = async (userId: number, role: UserRole) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId, role);

  // Save refresh token to database (hashed)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.JWT_REFRESH_EXPIRATION_DAYS);

  await prisma.token.create({
    data: {
      tokenHash: sha256(refreshToken),
      type: 'REFRESH',
      expires: expiresAt,
      userId,
    },
  });

  return {
    accessToken,
    refreshToken,
  };
};