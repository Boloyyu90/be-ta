import { prisma } from '@/config/database';
import { ExamStatus } from '@prisma/client';
import * as examSessionsService from '@/features/exam-sessions/exam-sessions.service';

// ==================== PRISMA SELECT OBJECTS ====================

/**
 * User profile select object
 */
const USER_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isEmailVerified: true,
} as const;

/**
 * Upcoming exam select object
 */
const UPCOMING_EXAM_SELECT = {
  id: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  durationMinutes: true,
  _count: {
    select: {
      examQuestions: true,
    },
  },
} as const;

/**
 * Active session select object
 */
const ACTIVE_SESSION_SELECT = {
  id: true,
  startedAt: true,
  exam: {
    select: {
      id: true,
      title: true,
      durationMinutes: true,
    },
  },
} as const;

/**
 * Recent result select object
 */
const RECENT_RESULT_SELECT = {
  id: true,
  submittedAt: true,
  totalScore: true,
  exam: {
    select: {
      id: true,
      title: true,
      examQuestions: {
        select: {
          question: {
            select: {
              defaultScore: true,
            },
          },
        },
      },
    },
  },
} as const;

// ==================== SERVICE FUNCTIONS ====================

/**
 * Get dashboard overview data
 * Combines multiple queries into single response
 */
export const getDashboardOverview = async (userId: number, userRole: string) => {
  // Get user profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_PROFILE_SELECT,
  });

  // Get upcoming exams
  const upcomingExams = await prisma.exam.findMany({
    where: {
      examQuestions: {
        some: {},
      },
    },
    select: UPCOMING_EXAM_SELECT,
    orderBy: {
      startTime: 'asc',
    },
    take: 5,
  });

  // Get active sessions
  const activeSessions = await prisma.userExam.findMany({
    where: {
      userId,
      status: ExamStatus.IN_PROGRESS,
    },
    select: ACTIVE_SESSION_SELECT,
    orderBy: {
      startedAt: 'desc',
    },
    take: 5,
  });

  // Calculate remaining time for active sessions
  const activeSessionsWithTime = activeSessions.map((session) => ({
    id: session.id,
    examId: session.exam.id,
    examTitle: session.exam.title,
    startedAt: session.startedAt,
    durationMinutes: session.exam.durationMinutes,
    remainingTimeMs:
      session.startedAt && session.exam.durationMinutes
        ? examSessionsService.getRemainingTime(session.startedAt, session.exam.durationMinutes)
        : null,
  }));

  // Get recent results
  const recentResults = await prisma.userExam.findMany({
    where: {
      userId,
      status: ExamStatus.FINISHED,
    },
    select: RECENT_RESULT_SELECT,
    orderBy: {
      submittedAt: 'desc',
    },
    take: 5,
  });

  // Calculate percentage for each result
  const recentResultsWithPercentage = recentResults.map((result) => {
    const maxScore = result.exam.examQuestions.reduce(
      (sum, eq) => sum + eq.question.defaultScore,
      0
    );
    const percentage = maxScore > 0 ? ((result.totalScore || 0) / maxScore) * 100 : 0;

    return {
      id: result.id,
      examId: result.exam.id,
      examTitle: result.exam.title,
      submittedAt: result.submittedAt,
      score: result.totalScore,
      maxScore,
      percentage: Math.round(percentage * 10) / 10,
    };
  });

  // Get summary statistics
  const summary = await examSessionsService.getMyResultsSummary(userId);

  return {
    user,
    upcomingExams: upcomingExams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      startTime: exam.startTime,
      endTime: exam.endTime,
      durationMinutes: exam.durationMinutes,
      totalQuestions: exam._count.examQuestions,
    })),
    activeSessions: activeSessionsWithTime,
    recentResults: recentResultsWithPercentage,
    summary,
  };
};