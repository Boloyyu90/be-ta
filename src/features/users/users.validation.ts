import { z } from 'zod';
import { UserRole } from '@prisma/client';

// ==================== REQUEST SCHEMAS ====================

/**
 * Create user schema (Admin only)
 */
export const createUserSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    name: z
      .string({ required_error: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must not exceed 100 characters')
      .trim(),
    role: z
      .nativeEnum(UserRole, {
        errorMap: () => ({ message: 'Role must be either ADMIN or PARTICIPANT' }),
      })
      .optional()
      .default(UserRole.PARTICIPANT),
  }),
});

/**
 * Get users list schema (with filters)
 */
export const getUsersSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .default('1')
      .transform(Number)
      .pipe(z.number().int().positive().min(1)),
    limit: z
      .string()
      .optional()
      .default('10')
      .transform(Number)
      .pipe(z.number().int().positive().min(1).max(100)),
    role: z.nativeEnum(UserRole).optional(),
    search: z
      .string()
      .optional()
      .transform(val => (val ? val.trim() : undefined)),
  }),
});

/**
 * Get single user schema
 */
export const getUserSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'User ID is required' })
      .regex(/^\d+$/, 'User ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
});

/**
 * Update user schema
 */
export const updateUserSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'User ID is required' })
      .regex(/^\d+$/, 'User ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
  body: z
    .object({
      email: z.string().email('Invalid email format').toLowerCase().trim().optional(),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
          'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        )
        .optional(),
      name: z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must not exceed 100 characters')
        .trim()
        .optional(),
      role: z
        .nativeEnum(UserRole, {
          errorMap: () => ({ message: 'Role must be either ADMIN or PARTICIPANT' }),
        })
        .optional(),
      isEmailVerified: z.boolean().optional(),
    })
    .refine(data => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

/**
 * Delete user schema
 */
export const deleteUserSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'User ID is required' })
      .regex(/^\d+$/, 'User ID must be a number')
      .transform(Number)
      .pipe(z.number().int().positive()),
  }),
});

// ==================== TYPE EXPORTS ====================

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type GetUsersQuery = z.infer<typeof getUsersSchema>['query'];
export type GetUserParams = z.infer<typeof getUserSchema>['params'];
export type UpdateUserParams = z.infer<typeof updateUserSchema>['params'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type DeleteUserParams = z.infer<typeof deleteUserSchema>['params'];

// ==================== RESPONSE TYPES ====================

/**
 * User public data (without password)
 */
export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User with stats (for detail view)
 */
export interface UserDetailResponse extends UserResponse {
  _count: {
    createdExams: number;
    userExams: number;
  };
}

/**
 * Users list response with pagination
 */
export interface UsersListResponse {
  users: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Single user response
 */
export interface SingleUserResponse {
  user: UserDetailResponse;
}

/**
 * User created response
 */
export interface UserCreatedResponse {
  user: UserResponse;
}

/**
 * User updated response
 */
export interface UserUpdatedResponse {
  user: UserResponse;
}

/**
 * User deleted response
 */
export interface UserDeletedResponse {
  message: string;
}