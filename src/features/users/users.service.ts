import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '@/config/database';
import { hash } from '@/shared/utils/hash';
import { ERROR_MESSAGES } from '@/config/constants';
import type { CreateUserInput, GetUsersQuery, UpdateUserInput } from './users.validation';

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
      role: role || UserRole.PARTICIPANT,
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

  return user;
};

/**
 * Get users list with filters and pagination
 */
export const getUsers = async (query: GetUsersQuery) => {
  const { page, limit, role, search } = query;

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
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    },
  };
};

/**
 * Get single user by ID
 */
export const getUserById = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          createdExams: true,
          userExams: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  return user;
};

/**
 * Update user by ID
 */
export const updateUser = async (id: number, input: UpdateUserInput) => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // If email is being updated, check for duplicates
  if (input.email && input.email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (emailExists) {
      throw new Error(ERROR_MESSAGES.EMAIL_EXISTS);
    }
  }

  // Hash password if provided
  const updateData: Prisma.UserUpdateInput = {
    ...input,
    ...(input.password && { password: await hash(input.password) }),
  };

  // Update user
  const user = await prisma.user.update({
    where: { id },
    data: updateData,
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
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Delete user (cascade will handle related records)
  await prisma.user.delete({
    where: { id },
  });

  return { message: 'User deleted successfully' };
};