import { prisma } from '@/config/database';
import { ExamStatus } from '@prisma/client';
import * as examSessionsService from '@/features/exam-sessions/exam-sessions.service';

/**
 * Get dashboard overview data
 * Combines multiple queries into single response
 */
export const getDashboardOverview = async (userId: number, userRole: string) => {
  // Get user profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isEmailVerified: true,
    },
  });

  // Get upcoming exams (exams with questions, ordered by startTime)
  const upcomingExams = await prisma.exam.findMany({
    where: {
      examQuestions: {
        some: {}, // Only exams with questions
      },
      // Optional: Add startTime filter for truly "upcoming" exams
      // startTime: { gte: new Date() }
    },
    select: {
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
    },
    orderBy: {
      startTime: 'asc',
    },
    take: 5,
  });

  // Get active sessions (in progress)
  const activeSessions = await prisma.userExam.findMany({
    where: {
      userId,
      status: ExamStatus.IN_PROGRESS,
    },
    select: {
      id: true,
      startedAt: true,
      exam: {
        select: {
          id: true,
          title: true,
          durationMinutes: true,
        },
      },
    },
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
    select: {
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
    },
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