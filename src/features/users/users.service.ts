import { Prisma, UserRole, ExamStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { hash } from '@/shared/utils/hash';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import { ConflictError, NotFoundError, BadRequestError } from '@/shared/errors/app-errors';
import type { CreateUserInput, UpdateUserInput, GetUsersQuery, UpdateMeInput, UserStats } from './users.validation';

// ==================== PRISMA SELECT OBJECTS ====================

/**
 * Public user data without password
 * Used for API responses
 */
const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Detailed user data with counts
 * Used for admin views
 */
const USER_DETAIL_SELECT = {
  ...USER_PUBLIC_SELECT,
  _count: {
    select: {
      createdExams: true,
      userExams: true,
    },
  },
} as const;

// ==================== SERVICE FUNCTIONS ====================

/**
 * Create a new user (Admin only)
 *
 * @param input - User creation data
 * @returns Created user data
 * @throws {ConflictError} If email already exists
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
 *
 * @param filter - Query filters (page, limit, role, search)
 * @returns Paginated list of users
 */
export const getUsers = async (filter: GetUsersQuery) => {
  const { page, limit, role, search, sortBy, sortOrder } = filter;

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

  // Build orderBy
  const orderBy: Prisma.UserOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  // Execute queries in parallel
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_PUBLIC_SELECT,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.user.count({ where }),
  ]);

  return createPaginatedResponse(users, page, limit, total);
};

/**
 * Get single user by ID with detailed information
 *
 * @param id - User ID
 * @returns User data with counts
 * @throws {NotFoundError} If user not found
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
 *
 * @param userId - Current user ID
 * @returns User profile data
 * @throws {NotFoundError} If user not found
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
 * Update user by ID (Admin only)
 *
 * @param id - User ID to update
 * @param data - Update data
 * @returns Updated user data
 * @throws {NotFoundError} If user not found
 * @throws {ConflictError} If email already exists
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
 * Update current user profile (Self-update)
 * Users can only update: name, password (not email, role)
 *
 * @param userId - Current user ID
 * @param data - Update data (limited fields)
 * @returns Updated user data
 * @throws {NotFoundError} If user not found
 */
export const updateMe = async (userId: number, data: UpdateMeInput) => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND, {
      userId,
      errorCode: ERROR_CODES.USER_NOT_FOUND,
    });
  }

  // Build update data (only allowed fields)
  const updateData: Prisma.UserUpdateInput = {
    ...(data.name && { name: data.name }),
    ...(data.password && { password: await hash(data.password) }),
  };

  // Update user
  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: USER_PUBLIC_SELECT,
  });

  return user;
};

/**
 * Delete user by ID
 *
 * @param id - User ID to delete
 * @returns Success indicator
 * @throws {NotFoundError} If user not found
 * @throws {BadRequestError} If user has exam attempts or created exams
 */
export const deleteUser = async (id: number) => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          userExams: true,
          createdExams: true,
        },
      },
    },
  });

  if (!existingUser) {
    throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND, {
      userId: id,
      errorCode: ERROR_CODES.USER_NOT_FOUND,
    });
  }

  // Prevent deletion if user has exam attempts
  if (existingUser._count.userExams > 0) {
    throw new BadRequestError(
      ERROR_MESSAGES.USER_HAS_EXAM_ATTEMPTS,
      {
        userId: id,
        examAttempts: existingUser._count.userExams,
        errorCode: ERROR_CODES.USER_HAS_EXAM_ATTEMPTS,
      }
    );
  }

  // Prevent deletion if user created exams
  if (existingUser._count.createdExams > 0) {
    throw new BadRequestError(
      ERROR_MESSAGES.USER_HAS_CREATED_EXAMS,
      {
        userId: id,
        createdExams: existingUser._count.createdExams,
        errorCode: ERROR_CODES.USER_HAS_CREATED_EXAMS,
      }
    );
  }

  // Delete user
  await prisma.user.delete({
    where: { id },
  });

  return { success: true };
};

/**
 * Get current user's exam statistics
 * Aggregates: completed exams, average score, total time, active exams
 *
 * @param userId - Current user ID
 * @returns User exam statistics
 */
export const getMyStats = async (userId: number): Promise<UserStats> => {
  // Run all aggregations in parallel for performance
  const [completedExams, activeExams, scoreAggregate, timeData] = await Promise.all([
    // Count of FINISHED exams
    prisma.userExam.count({
      where: {
        userId,
        status: ExamStatus.FINISHED,
      },
    }),

    // Count of IN_PROGRESS exams
    prisma.userExam.count({
      where: {
        userId,
        status: ExamStatus.IN_PROGRESS,
      },
    }),

    // Average score from FINISHED exams with non-null totalScore
    prisma.userExam.aggregate({
      where: {
        userId,
        status: ExamStatus.FINISHED,
        totalScore: { not: null },
      },
      _avg: {
        totalScore: true,
      },
    }),

    // Get all FINISHED exams with timestamps to calculate total time
    prisma.userExam.findMany({
      where: {
        userId,
        status: ExamStatus.FINISHED,
        startedAt: { not: null },
        submittedAt: { not: null },
      },
      select: {
        startedAt: true,
        submittedAt: true,
      },
    }),
  ]);

  // Calculate total time in minutes from timestamps
  let totalTimeMinutes = 0;
  for (const exam of timeData) {
    if (exam.startedAt && exam.submittedAt) {
      const durationMs = exam.submittedAt.getTime() - exam.startedAt.getTime();
      totalTimeMinutes += Math.round(durationMs / 60000); // Convert ms to minutes
    }
  }

  return {
    completedExams,
    averageScore: scoreAggregate._avg.totalScore ?? null,
    totalTimeMinutes,
    activeExams,
  };
};
