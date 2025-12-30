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

/**
 * User ID parameter validation
 */
const userIdParamSchema = z
  .string({ required_error: 'User ID is required' })
  .regex(/^\d+$/, 'User ID must be a number')
  .transform(Number)
  .pipe(z.number().int().positive());

// ==================== REQUEST SCHEMAS ====================

/**
 * Schema for creating a new user
 * POST /api/v1/users
 *
 * @access Admin only
 */
export const createUserSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema,
    role: z
      .nativeEnum(UserRole, {
        errorMap: () => ({ message: 'Role must be either ADMIN or PARTICIPANT' }),
      })
      .optional()
      .default(UserRole.PARTICIPANT),
  }),
});

/**
 * Schema for getting users list
 * GET /api/v1/users
 *
 * @access Admin only
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
      .transform((val) => (val ? val.trim() : undefined)),
    sortBy: z
      .enum(['createdAt', 'name', 'email', 'role'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

/**
 * Schema for getting current user profile
 * GET /api/v1/users/me
 *
 * @access All authenticated users
 */
export const getMeSchema = z.object({
  // No params, query, or body needed - user comes from req.user
});

/**
 * Schema for updating current user profile
 * PATCH /api/v1/users/me
 *
 * @access All authenticated users
 */
export const updateMeSchema = z.object({
  body: z
    .object({
      name: nameSchema.optional(),
      password: passwordSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

/**
 * Schema for getting single user
 * GET /api/v1/users/:id
 *
 * @access Admin only
 */
export const getUserSchema = z.object({
  params: z.object({
    id: userIdParamSchema,
  }),
});

/**
 * Schema for updating user
 * PATCH /api/v1/users/:id
 *
 * @access Admin only
 */
export const updateUserSchema = z.object({
  params: z.object({
    id: userIdParamSchema,
  }),
  body: z
    .object({
      email: emailSchema.optional(),
      password: passwordSchema.optional(),
      name: nameSchema.optional(),
      role: z
        .nativeEnum(UserRole, {
          errorMap: () => ({ message: 'Role must be either ADMIN or PARTICIPANT' }),
        })
        .optional(),
      isEmailVerified: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

/**
 * Schema for deleting user
 * DELETE /api/v1/users/:id
 *
 * @access Admin only
 */
export const deleteUserSchema = z.object({
  params: z.object({
    id: userIdParamSchema,
  }),
});

// ==================== REQUEST TYPES ====================

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type GetUsersQuery = z.infer<typeof getUsersSchema>['query'];
export type GetUserParams = z.infer<typeof getUserSchema>['params'];
export type GetMeInput = z.infer<typeof getMeSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>['body'];
export type UpdateUserParams = z.infer<typeof updateUserSchema>['params'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type DeleteUserParams = z.infer<typeof deleteUserSchema>['params'];

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
 * Detailed user data with counts
 */
export interface UserDetailData extends UserPublicData {
  _count: {
    createdExams: number;
    userExams: number;
  };
}

/**
 * Paginated users list response
 */
export interface UsersListResponse {
  data: UserPublicData[];
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
export interface UserResponse {
  user: UserPublicData;
}

/**
 * Current user profile response
 */
export interface MeResponse {
  user: UserPublicData;
}

/**
 * Detailed user response (with counts)
 */
export interface UserDetailResponse {
  user: UserDetailData;
}

/**
 * User deleted response
 */
export interface UserDeletedResponse {
  success: boolean;
  message: string;
}

/**
 * User exam statistics for dashboard
 * Aggregated metrics from UserExam table
 */
export interface UserStats {
  completedExams: number;      // Count of FINISHED exams
  averageScore: number | null; // AVG(totalScore) or null if no completed exams
  totalTimeMinutes: number;    // SUM(submittedAt - startedAt) in minutes
  activeExams: number;         // Count of IN_PROGRESS exams
}