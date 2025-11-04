import { z } from 'zod';
import { UserRole, ExamStatus } from '@prisma/client';

// ==================== REQUEST SCHEMAS ====================

/**
 * Schema for getting dashboard overview
 * GET /api/v1/dashboard/overview
 */
export const getDashboardOverviewSchema = z.object({
  // No query params needed
});

// ==================== REQUEST TYPES ====================

export type GetDashboardOverviewInput = z.infer<typeof getDashboardOverviewSchema>;

// ==================== RESPONSE TYPES ====================

export interface DashboardUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
}

export interface DashboardUpcomingExam {
  id: number;
  title: string;
  description: string | null;
  startTime: Date | null;
  endTime: Date | null;
  durationMinutes: number | null;
  totalQuestions: number;
}

export interface DashboardActiveSession {
  id: number;
  examId: number;
  examTitle: string;
  startedAt: Date | null;
  durationMinutes: number | null;
  remainingTimeMs: number | null;
}

export interface DashboardRecentResult {
  id: number;
  examId: number;
  examTitle: string;
  submittedAt: Date | null;
  score: number | null;
  maxScore: number;
  percentage: number;
}

export interface DashboardSummary {
  taken: number;
  avgScore: number;
  passed: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
}

export interface DashboardOverviewResponse {
  user: DashboardUser;
  upcomingExams: DashboardUpcomingExam[];
  activeSessions: DashboardActiveSession[];
  recentResults: DashboardRecentResult[];
  summary: DashboardSummary;
}