import { UserRole } from '@prisma/client';

/**
 * Prisma select object for public user data (reusable)
 */
export const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Prisma select object for user detail with counts
 */
export const USER_DETAIL_SELECT = {
  ...USER_PUBLIC_SELECT,
  _count: {
    select: {
      createdExams: true,
      userExams: true,
    },
  },
} as const;

/**
 * Internal service data types
 */
export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  name?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
}

export interface GetUsersFilter {
  page: number;
  limit: number;
  role?: UserRole;
  search?: string;
}