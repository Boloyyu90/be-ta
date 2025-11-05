import { z } from 'zod';
import { UserRole } from '@prisma/client';

// ==================== VALIDATION HELPERS ====================

/**
 * Password validation rules
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

/**
 * Email validation rules
 * - Valid email format
 * - Lowercase
 * - Trimmed
 */
const emailSchema = z
  .string({ required_error: 'Email is required' })
  .email('Invalid email format')
  .toLowerCase()
  .trim();

/**
 * Name validation rules
 * - Minimum 2 characters
 * - Maximum 100 characters
 * - Trimmed
 */
const nameSchema = z
  .string({ required_error: 'Name is required' })
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .trim();

// ==================== REQUEST SCHEMAS ====================

/**
 * Schema for user registration
 * POST /api/v1/auth/register
 */
export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema,
  }),
});

/**
 * Schema for user login
 * POST /api/v1/auth/login
 */
export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string({ required_error: 'Password is required' }).min(1),
  }),
});

/**
 * Schema for token refresh
 * POST /api/v1/auth/refresh
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({ required_error: 'Refresh token is required' })
      .min(1, 'Refresh token is required'),
  }),
});

/**
 * Schema for logout
 * POST /api/v1/auth/logout
 */
export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({ required_error: 'Refresh token is required' })
      .min(1, 'Refresh token is required'),
  }),
});

// ==================== REQUEST TYPES ====================

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type LogoutInput = z.infer<typeof logoutSchema>['body'];

// ==================== RESPONSE TYPES ====================

/**
 * Public user data (without password)
 */
export interface UserPublicData {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication tokens
 */
export interface TokensData {
  accessToken: string;
  refreshToken: string;
}

/**
 * Response for register and login
 */
export interface AuthResponse {
  user: UserPublicData;
  tokens: TokensData;
}

/**
 * Response for token refresh
 */
export interface TokenResponse {
  tokens: TokensData;
}

/**
 * Response for logout
 */
export interface LogoutResponse {
  success: boolean;
}