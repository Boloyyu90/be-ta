/**
 * Answer Service — Answer submission and retrieval
 *
 * Handles submitting answers, retrieving questions, and answer review.
 *
 * Functions:
 * - submitAnswer: Submit or update an answer (auto-save)
 * - getExamQuestions: Get questions for active session
 * - getExamAnswers: Get answers for review (post-submission)
 *
 * @module exam-sessions/services/answer.service
 */

import { ExamStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import {
  NotFoundError,
  BadRequestError,
  BusinessLogicError,
  UnauthorizedError,
} from '@/shared/errors/app-errors';

import {
  withinTimeLimit,
  calculateProgress,
} from '../exam-sessions.helpers';

import type {
  SubmitAnswerInput,
  ParticipantQuestion,
  AnswerReview,
} from '../exam-sessions.validation';

// ==================== SERVICE FUNCTIONS ====================

/**
 * Submit or update answer (auto-save)
 * Transaction-safe to prevent race conditions
 */
export const submitAnswer = async (
  userExamId: number,
  userId: number,
  data: SubmitAnswerInput
) => {
  return await prisma.$transaction(
    async (tx) => {
      const userExam = await tx.userExam.findUnique({
        where: { id: userExamId },
        include: {
          exam: { include: { examQuestions: true } },
        },
      });

      if (!userExam) {
        throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, ERROR_CODES.EXAM_SESSION_NOT_FOUND, {
          userExamId,
          userId,
        });
      }

      if (userExam.userId !== userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_EXAM_SESSION, ERROR_CODES.UNAUTHORIZED, {
          userExamId,
          userId,
          ownerId: userExam.userId,
        });
      }

      if (userExam.submittedAt) {
        throw new BusinessLogicError(
          ERROR_MESSAGES.UNABLE_SUBMIT_ANSWER_EXAM_FINISHED,
          ERROR_CODES.EXAM_SESSION_ALREADY_SUBMITTED,
          { userExamId, userId, submittedAt: userExam.submittedAt }
        );
      }

      if (!withinTimeLimit(userExam.startedAt!, userExam.exam.durationMinutes!)) {
        await tx.userExam.update({
          where: { id: userExamId },
          data: {
            status: ExamStatus.TIMEOUT,
            submittedAt: new Date(),
          },
        });

        throw new BusinessLogicError(
          ERROR_MESSAGES.EXAM_TIMEOUT,
          ERROR_CODES.EXAM_SESSION_TIMEOUT,
          {
            userExamId,
            userId,
            startedAt: userExam.startedAt,
            durationMinutes: userExam.exam.durationMinutes,
          }
        );
      }

      const examQuestion = userExam.exam.examQuestions.find(
        (eq) => eq.id === data.examQuestionId
      );

      if (!examQuestion) {
        throw new BadRequestError(ERROR_MESSAGES.INVALID_EXAM_QUESTION_FOR_EXAM, ERROR_CODES.EXAM_SESSION_INVALID_QUESTION, {
          userExamId,
          examQuestionId: data.examQuestionId,
          examId: userExam.examId,
        });
      }

      const answer = await tx.answer.upsert({
        where: {
          userExamId_examQuestionId: {
            userExamId,
            examQuestionId: data.examQuestionId,
          },
        },
        update: {
          selectedOption: data.selectedOption,
          answeredAt: new Date(),
        },
        create: {
          userExamId,
          examQuestionId: data.examQuestionId,
          selectedOption: data.selectedOption,
          answeredAt: new Date(),
        },
      });

      const totalAnswered = await tx.answer.count({
        where: {
          userExamId,
          selectedOption: { not: null },
        },
      });

      const totalQuestions = userExam.exam.examQuestions.length;

      return {
        answer: {
          examQuestionId: answer.examQuestionId,
          selectedOption: answer.selectedOption,
          answeredAt: answer.answeredAt,
        },
        progress: {
          answered: totalAnswered,
          total: totalQuestions,
          percentage: calculateProgress(totalAnswered, totalQuestions),
        },
      };
    },
    { timeout: 10000 }
  );
};

/**
 * Get exam questions for active session
 */
export const getExamQuestions = async (userExamId: number, userId: number) => {
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    include: {
      exam: {
        include: {
          examQuestions: {
            include: { question: true },
            orderBy: { orderNumber: 'asc' },
          },
        },
      },
    },
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, ERROR_CODES.EXAM_SESSION_NOT_FOUND, {
      userExamId,
      userId,
    });
  }

  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_EXAM_SESSION, ERROR_CODES.EXAM_SESSION_UNAUTHORIZED, {
      userExamId,
      userId,
      ownerId: userExam.userId,
    });
  }

  const questions: ParticipantQuestion[] = userExam.exam.examQuestions.map((eq) => ({
    id: eq.question.id,
    examQuestionId: eq.id,
    content: eq.question.content,
    options: eq.question.options as ParticipantQuestion['options'],
    questionType: eq.question.questionType as ParticipantQuestion['questionType'],
    orderNumber: eq.orderNumber,
  }));

  return questions;
};

/**
 * Get exam answers for review (after submission)
 */
export const getExamAnswers = async (userExamId: number, userId: number) => {
  const userExam = await prisma.userExam.findUnique({
    where: { id: userExamId },
    include: {
      exam: {
        include: {
          examQuestions: {
            include: { question: true },
            orderBy: { orderNumber: 'asc' },
          },
        },
      },
      answers: true,
    },
  });

  if (!userExam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, ERROR_CODES.EXAM_SESSION_NOT_FOUND, {
      userExamId,
      userId,
    });
  }

  if (userExam.userId !== userId) {
    throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_EXAM_SESSION, ERROR_CODES.EXAM_SESSION_UNAUTHORIZED, {
      userExamId,
      userId,
      ownerId: userExam.userId,
    });
  }

  if (!userExam.submittedAt) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.REVIEW_NOT_AVAILABLE_BEFORE_SUBMIT,
      ERROR_CODES.EXAM_SESSION_ALREADY_SUBMITTED,
      { userExamId, userId }
    );
  }

  const answers: AnswerReview[] = userExam.exam.examQuestions.map((eq) => {
    const answer = userExam.answers.find((a) => a.examQuestionId === eq.id);
    const optionScores = eq.question.optionScores as Record<string, number> | null;

    // Use stored score if available, otherwise calculate
    let score = 0;
    if (answer?.score != null) {
      score = answer.score;
    } else if (answer?.selectedOption) {
      if (eq.question.questionType === 'TKP' && optionScores) {
        score = optionScores[answer.selectedOption] ?? 0;
      } else {
        score = answer.isCorrect ? eq.question.defaultScore : 0;
      }
    }

    return {
      examQuestionId: eq.id,
      questionContent: eq.question.content,
      questionType: eq.question.questionType,
      options: eq.question.options as AnswerReview['options'],
      optionScores,
      selectedOption: answer?.selectedOption || null,
      correctAnswer: eq.question.correctAnswer,
      isCorrect: answer?.isCorrect ?? null,
      score,
    };
  });

  return answers;
};
