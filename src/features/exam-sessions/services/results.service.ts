/**
 * Results Service — Exam result retrieval
 *
 * Handles fetching exam results for participants and admins.
 *
 * Functions:
 * - getMyResults: Get participant's own exam results (paginated)
 * - getResults: Get all exam results - admin view (paginated)
 *
 * @module exam-sessions/services/results.service
 */

import { Prisma, ExamStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { createPaginatedResponse } from '@/shared/utils/pagination';

import { calculateDuration } from '../exam-sessions.helpers';
import { calculateScore } from '../exam-sessions.score';

import type {
  GetMyResultsQuery,
  GetResultsQuery,
  ExamResult,
  AnswerWithQuestion,
  ScoreCalculationResult,
} from '../exam-sessions.validation';

// ==================== PRISMA SELECT CONSTANTS ====================

/**
 * Select for exam results
 */
const EXAM_RESULT_SELECT = {
  id: true,
  userId: true,
  examId: true,
  startedAt: true,
  submittedAt: true,
  totalScore: true,
  status: true,
  attemptNumber: true,
  exam: {
    select: {
      id: true,
      title: true,
      description: true,
      passingScore: true,
      examQuestions: {
        select: {
          id: true,
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  answers: {
    select: {
      id: true,
      selectedOption: true,
    },
  },
} as const;

// ==================== INTERNAL HELPERS ====================

/**
 * Batch calculate scoresByType for multiple userExams
 *
 * Efficiently fetches all answers for the given userExam IDs in a single query,
 * groups them by userExamId, then calculates per-category scores for each.
 *
 * @param userExamIds - Array of userExam IDs (should be FINISHED or TIMEOUT only)
 * @returns Map from userExamId to scoresByType array
 */
const batchCalculateScoresByType = async (
  userExamIds: number[]
): Promise<Map<number, ScoreCalculationResult['scoresByType']>> => {
  if (userExamIds.length === 0) return new Map();

  // Single query to fetch all answers with question details for all sessions
  const answers = await prisma.answer.findMany({
    where: { userExamId: { in: userExamIds } },
    select: {
      id: true,
      selectedOption: true,
      examQuestionId: true,
      userExamId: true,
      examQuestion: {
        select: {
          question: {
            select: {
              questionType: true,
              correctAnswer: true,
              defaultScore: true,
              optionScores: true,
            },
          },
        },
      },
    },
  });

  // Group answers by userExamId
  const answersByExam = new Map<number, AnswerWithQuestion[]>();
  for (const answer of answers) {
    const group = answersByExam.get(answer.userExamId) ?? [];
    group.push({
      id: answer.id,
      selectedOption: answer.selectedOption,
      examQuestionId: answer.examQuestionId,
      examQuestion: {
        question: {
          ...answer.examQuestion.question,
          optionScores: answer.examQuestion.question.optionScores as Record<string, number> | null,
        },
      },
    });
    answersByExam.set(answer.userExamId, group);
  }

  // Calculate scores per exam
  const result = new Map<number, ScoreCalculationResult['scoresByType']>();
  for (const [userExamId, examAnswers] of answersByExam) {
    const scoreResult = calculateScore(examAnswers);
    result.set(userExamId, scoreResult.scoresByType);
  }

  return result;
};

// ==================== SERVICE FUNCTIONS ====================

/**
 * Get user's exam results (participant view)
 */
export const getMyResults = async (userId: number, query: GetMyResultsQuery) => {
  const { page, limit, status, examId } = query;

  const where: Prisma.UserExamWhereInput = {
    userId,
    ...(status
        ? { status }
        : { status: { not: ExamStatus.IN_PROGRESS } }
    ),
    ...(examId && { examId }),
  };

  const skip = (page - 1) * limit;

  const [userExams, total] = await Promise.all([
    prisma.userExam.findMany({
      where,
      select: EXAM_RESULT_SELECT,
      skip,
      take: limit,
      orderBy: {
        submittedAt: 'desc',
      },
    }),
    prisma.userExam.count({ where }),
  ]);

  // Batch calculate scoresByType for FINISHED/TIMEOUT sessions
  const completedIds = userExams
    .filter((ue) => ue.status === ExamStatus.FINISHED || ue.status === ExamStatus.TIMEOUT)
    .map((ue) => ue.id);
  const scoresMap = await batchCalculateScoresByType(completedIds);

  const data: ExamResult[] = userExams.map((ue) => ({
    id: ue.id,
    exam: {
      id: ue.exam.id,
      title: ue.exam.title,
      description: ue.exam.description,
      passingScore: ue.exam.passingScore,
    },
    attemptNumber: ue.attemptNumber,
    user: ue.user,
    startedAt: ue.startedAt!,
    submittedAt: ue.submittedAt,
    totalScore: ue.totalScore,
    status: ue.status,
    duration: ue.startedAt && ue.submittedAt
      ? calculateDuration(ue.startedAt, ue.submittedAt)
      : null,
    answeredQuestions: ue.answers.filter((a) => a.selectedOption !== null).length,
    totalQuestions: ue.exam.examQuestions.length,
    scoresByType: scoresMap.get(ue.id) ?? [],
  }));

  return createPaginatedResponse(data, page, limit, total);
};

/**
 * Get all exam results (admin view)
 */
export const getResults = async (query: GetResultsQuery) => {
  const { page, limit, examId, userId, status } = query;

  const where: Prisma.UserExamWhereInput = {
    ...(examId && { examId }),
    ...(userId && { userId }),
    ...(status && { status }),
  };

  const skip = (page - 1) * limit;

  const [userExams, total] = await Promise.all([
    prisma.userExam.findMany({
      where,
      select: EXAM_RESULT_SELECT,
      skip,
      take: limit,
      orderBy: {
        submittedAt: 'desc',
      },
    }),
    prisma.userExam.count({ where }),
  ]);

  // Batch calculate scoresByType for FINISHED/TIMEOUT sessions
  const completedIds = userExams
    .filter((ue) => ue.status === ExamStatus.FINISHED || ue.status === ExamStatus.TIMEOUT)
    .map((ue) => ue.id);
  const scoresMap = await batchCalculateScoresByType(completedIds);

  const data: ExamResult[] = userExams.map((ue) => ({
    id: ue.id,
    exam: {
      id: ue.exam.id,
      title: ue.exam.title,
      description: ue.exam.description,
      passingScore: ue.exam.passingScore,
    },
    user: ue.user,
    startedAt: ue.startedAt!,
    submittedAt: ue.submittedAt,
    totalScore: ue.totalScore,
    status: ue.status,
    duration: ue.startedAt && ue.submittedAt
      ? calculateDuration(ue.startedAt, ue.submittedAt)
      : null,
    answeredQuestions: ue.answers.filter((a) => a.selectedOption !== null).length,
    totalQuestions: ue.exam.examQuestions.length,
    attemptNumber: ue.attemptNumber,
    scoresByType: scoresMap.get(ue.id) ?? [],
  }));

  return createPaginatedResponse(data, page, limit, total);
};
