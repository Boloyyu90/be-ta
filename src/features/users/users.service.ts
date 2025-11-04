import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '@/config/database';
import { hash } from '@/shared/utils/hash';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { ConflictError, NotFoundError } from '@/shared/errors/app-errors';
import type { CreateUserInput, UpdateUserInput, GetUsersQuery } from './users.validation';

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

const USER_DETAIL_SELECT = {
  ...USER_PUBLIC_SELECT,
  _count: {
    select: {
      createdExams: true,
      userExams: true,
    },
  },
} as const;

/**
 * Create a new user (Admin only)
 */
export const createUser = async (input: CreateUserInput) => {
  const { email, password, name, role } = input;

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
      role: role || UserRole.PARTICIPANT,
    },
    select: USER_PUBLIC_SELECT,
  });

  return user;
};

/**
 * Get users list with filters and pagination
 */
export const getUsers = async (filter: GetUsersQuery) => {
  const { page, limit, role, search } = filter;

  // Build where clause
  const where: Prisma.UserWhereInput = {
    ...(role && { role }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute queries in parallel
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_PUBLIC_SELECT,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return createPaginatedResponse(users, page, limit, total);
};

/**
 * Get single user by ID
 */
export const getUserById = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: USER_DETAIL_SELECT,
  });

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND, {
      userId: id,
      errorCode: ERROR_CODES.USER_NOT_FOUND,
    });
  }

  return user;
};

/**
 * Get current authenticated user profile
 */
export const getMe = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_PUBLIC_SELECT,
  });

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND, {
      userId,
      errorCode: ERROR_CODES.USER_NOT_FOUND,
    });
  }

  return user;
};

/**
 * Update user by ID
 */
export const updateUser = async (id: number, data: UpdateUserInput) => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND, {
      userId: id,
      errorCode: ERROR_CODES.USER_NOT_FOUND,
    });
  }

  // If email is being updated, check for duplicates
  if (data.email && data.email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (emailExists) {
      throw new ConflictError(ERROR_MESSAGES.EMAIL_EXISTS, {
        email: data.email,
        userId: id,
        errorCode: ERROR_CODES.AUTH_EMAIL_EXISTS,
      });
    }
  }

  // Hash password if provided
  const updateData: Prisma.UserUpdateInput = {
    ...data,
    ...(data.password && { password: await hash(data.password) }),
  };

  // Update user
  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: USER_PUBLIC_SELECT,
  });

  return user;
};

/**
 * Delete user by ID
 */
export const deleteUser = async (id: number) => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND, {
      userId: id,
      errorCode: ERROR_CODES.USER_NOT_FOUND,
    });
  }

  // Delete user (cascade will handle related records)
  await prisma.user.delete({
    where: { id },
  });

  return { message: 'User deleted successfully' };
};