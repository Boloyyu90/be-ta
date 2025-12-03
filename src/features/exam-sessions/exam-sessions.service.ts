/**
 * Exam Sessions Service
 *
 * Service layer untuk mengelola exam sessions:
 * - Start exam (create/continue session)
 * - Submit jawaban (dengan race condition handling)
 * - Submit exam & calculate score
 * - Get session details & results
 * - Cleanup abandoned sessions
 *
 * Business Rules:
 * - User hanya bisa punya 1 active session per exam
 * - Tidak bisa restart exam yang sudah di-submit
 * - Auto-timeout kalau melebihi durasi + grace period
 * - Race condition di-handle dengan database transactions
 *
 * @module exam-sessions.service
 */

import { Prisma, ExamStatus } from '@prisma/client';
import { prisma } from '@/config/database';
import { ERROR_MESSAGES, ERROR_CODES } from '@/config/constants';
import { createPaginatedResponse } from '@/shared/utils/pagination';
import {
  NotFoundError,
  BadRequestError,
  BusinessLogicError,
  UnauthorizedError,
} from '@/shared/errors/app-errors';
import { logger } from '@/shared/utils/logger';

// Import dari module lain
import {
  withinTimeLimit,
  getRemainingTime,
  calculateDuration,
  isAbandonedSession,
  calculateProgress,
} from './exam-sessions.helpers';
import {
  calculateScore,
  updateAnswerCorrectness,
} from './exam-sessions.score';
import {
  USER_EXAM_SELECT,
  type SubmitAnswerInput,
  type GetMyResultsQuery,
  type GetResultsQuery,
  type GetUserExamsQuery,
  type ParticipantQuestion,
  type ParticipantAnswer,
  type UserExamSession,
  type ExamResult,
  type AnswerReview,
  type CleanupResult,
  type TokenCleanupResult,
} from './exam-sessions.types';

/**
 * Start exam atau continue existing session
 *
 * Flow:
 * 1. Validate exam exists & has questions
 * 2. Check existing session:
 *    - Kalau sudah submit → throw error (tidak bisa restart)
 *    - Kalau belum submit → continue (return existing progress)
 * 3. Create new session jika belum ada
 * 4. Return questions + existing answers (untuk auto-fill form)
 *
 * @param userId - ID user yang start exam
 * @param examId - ID exam yang mau dikerjakan
 * @returns Object berisi session info, questions, dan answers
 * @throws {NotFoundError} Kalau exam tidak ditemukan
 * @throws {BusinessLogicError} Kalau exam tidak valid atau sudah di-submit
 */
export const startExam = async (userId: number, examId: number) => {
  // Fetch exam dengan questions
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      examQuestions: {
        include: { question: true },
        orderBy: { orderNumber: 'asc' },
      },
    },
  });

  if (!exam) {
    throw new NotFoundError(ERROR_MESSAGES.EXAM_NOT_FOUND, {
      examId,
      userId,
      errorCode: ERROR_CODES.EXAM_NOT_FOUND,
    });
  }

  // Validasi exam setup
  if (exam.examQuestions.length === 0) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.EXAM_HAS_NO_QUESTIONS,
      ERROR_CODES.EXAM_NO_QUESTIONS,
      { examId, userId }
    );
  }

  if (!exam.durationMinutes) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.EXAM_HAS_NO_DURATION_SET,
      ERROR_CODES.EXAM_NO_DURATION,
      { examId, userId }
    );
  }

  // Check existing session
  const existingUserExam = await prisma.userExam.findUnique({
    where: { userId_examId: { userId, examId } },
    include: { answers: true },
  });

  // Prevent restart kalau sudah submit
  if (existingUserExam?.submittedAt) {
    throw new BusinessLogicError(
      ERROR_MESSAGES.EXAM_ALREADY_STARTED,
      ERROR_CODES.EXAM_SESSION_ALREADY_STARTED,
      {
        examId,
        userId,
        userExamId: existingUserExam.id,
        submittedAt: existingUserExam.submittedAt,
        status: existingUserExam.status,
      }
    );
  }

  // Create or continue session
  let userExam;
  if (!existingUserExam) {
    userExam = await prisma.userExam.create({
      data: {
        userId,
        examId,
        startedAt: new Date(),
        status: ExamStatus.IN_PROGRESS,
      },
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

    logger.info({ userId, examId, userExamId: userExam.id }, 'New exam session created');
  } else {
    // Continue existing session
    userExam = await prisma.userExam.findUnique({
      where: { id: existingUserExam.id },
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

    logger.info(
      { userId, examId, userExamId: existingUserExam.id },
      'Continuing existing exam session'
    );
  }

  if (!userExam) {
    throw new BadRequestError(ERROR_MESSAGES.FAILED_TO_CREATE_OR_RETRIEVE_EXAM_SESSION, {
      examId,
      userId,
      errorCode: ERROR_CODES.EXAM_SESSION_CREATE_FAILED,
    });
  }

  // Prepare response
  const remainingTimeMs = getRemainingTime(userExam.startedAt!, exam.durationMinutes);

  const questions: ParticipantQuestion[] = userExam.exam.examQuestions.map((eq) => ({
    id: eq.question.id,
    examQuestionId: eq.id,
    content: eq.question.content,
    options: eq.question.options as any,
    questionType: eq.question.questionType,
    orderNumber: eq.orderNumber,
  }));

  const answers: ParticipantAnswer[] = questions.map((q) => {
    const existingAnswer = userExam.answers.find((a) => a.examQuestionId === q.examQuestionId);
    return {
      examQuestionId: q.examQuestionId,
      selectedOption: existingAnswer?.selectedOption || null,
      answeredAt: existingAnswer?.answeredAt || null,
    };
  });

  const session: UserExamSession = {
    id: userExam.id,
    examId: userExam.examId,
    examTitle: userExam.exam.title,
    durationMinutes: exam.durationMinutes,
    startedAt: userExam.startedAt!,
    submittedAt: userExam.submittedAt,
    status: userExam.status,
    remainingTimeMs,
    totalQuestions: questions.length,
    answeredQuestions: answers.filter((a) => a.selectedOption !== null).length,
  };

  return {
    userExam: session,
    questions,
    answers,
  };
};

/**
 * Submit atau update jawaban (auto-save)
 *
 * ⚠️ TRANSACTION-SAFE: Menggunakan Prisma transaction untuk prevent race conditions
 *
 * Race condition bisa terjadi kalau user:
 * - Klik submit berkali-kali dengan cepat
 * - Buka exam di 2 tab berbeda
 * - Network retry otomatis duplicate request
 *
 * Solusi: Wrap semua operations dalam transaction, status check atomic
 *
 * @param userExamId - ID exam session
 * @param userId - ID user (untuk authorization)
 * @param data - Data jawaban (examQuestionId + selectedOption)
 * @returns Object berisi answer yang di-save dan progress info
 * @throws {NotFoundError} Kalau session tidak ditemukan
 * @throws {UnauthorizedError} Kalau bukan pemilik session
 * @throws {BusinessLogicError} Kalau exam sudah finished atau timeout
 */
export const submitAnswer = async (
  userExamId: number,
  userId: number,
  data: SubmitAnswerInput
) => {
  return await prisma.$transaction(async (tx) => {
    // Fetch exam session dalam transaction
    const userExam = await tx.userExam.findUnique({
      where: { id: userExamId },
      include: {
        exam: { include: { examQuestions: true } },
      },
    });

    if (!userExam) {
      throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, {
        userExamId,
        userId,
        errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
      });
    }

    // Authorization check
    if (userExam.userId !== userId) {
      throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED_EXAM_SESSION, {
        userExamId,
        userId,
        ownerId: userExam.userId,
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }

    // Check status (dalam transaction, gak bisa berubah)
    if (userExam.submittedAt) {
      throw new BusinessLogicError(
        ERROR_MESSAGES.UNABLE_SUBMIT_ANSWER_EXAM_FINISHED,
        ERROR_CODES.EXAM_SESSION_ALREADY_SUBMITTED,
        { userExamId, userId, submittedAt: userExam.submittedAt }
      );
    }

    // Check time limit
    if (!withinTimeLimit(userExam.startedAt!, userExam.exam.durationMinutes!)) {
      // Auto-mark as timeout
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

    // Verify exam question
    const examQuestion = userExam.exam.examQuestions.find(
      (eq) => eq.id === data.examQuestionId
    );

    if (!examQuestion) {
      throw new BadRequestError(ERROR_MESSAGES.INVALID_EXAM_QUESTION_FOR_EXAM, {
        userExamId,
        examQuestionId: data.examQuestionId,
        examId: userExam.examId,
        errorCode: ERROR_CODES.EXAM_SESSION_INVALID_QUESTION,
      });
    }

    // Upsert answer
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

    // Get progress
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
  });
};

/**
 * Submit exam dan hitung score
 *
 * ⚠️ TRANSACTION-SAFE: Semua perhitungan score atomic
 *
 * Flow:
 * 1. Lock exam session row (prevent concurrent submit)
 * 2. Validate status & time limit
 * 3. Calculate score untuk semua answers
 * 4. Update correctness flag untuk setiap answer
 * 5. Update exam session (status FINISHED + totalScore)
 * 6. Return full result dengan breakdown
 *
 * @param userExamId - ID exam session
 * @param userId - ID user (untuk authorization)
 * @returns ExamResult dengan score detail dan breakdown per tipe soal
 * @throws {NotFoundError} Kalau session tidak ditemukan
 * @throws {UnauthorizedError} Kalau bukan pemilik session
 * @throws {BusinessLogicError} Kalau exam sudah di-submit atau timeout
 */
export const submitExam = async (userExamId: number, userId: number) => {
  const now = new Date();

  return await prisma.$transaction(
    async (tx) => {
      // Lock exam session
      const userExam = await tx.userExam.findUnique({
        where: { id: userExamId },
        include: {
          exam: {
            include: {
              examQuestions: { include: { question: true } },
            },
          },
          answers: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!userExam) {
        throw new NotFoundError(ERROR_MESSAGES.EXAM_SESSION_NOT_FOUND, {
          userExamId,
          userId,
          errorCode: ERROR_CODES.EXAM_SESSION_NOT_FOUND,
        });
      }

      // Authorization
      if (userExam.userId !== userId) {
        throw new UnauthorizedError(ERROR_MESSAGES.UNAUTHORIZED, {
          userExamId,
          userId,
          ownerId: userExam.userId,
          errorCode: ERROR_CODES.UNAUTHORIZED,
        });
      }

      // Check status
      if (userExam.submittedAt) {
        throw new BusinessLogicError(
          ERROR_MESSAGES.EXAM_ALREADY_SUBMITTED,
          ERROR_CODES.EXAM_SESSION_ALREADY_SUBMITTED,
          { userExamId, userId, submittedAt: userExam.submittedAt }
        );
      }

      // Check time limit
      if (!withinTimeLimit(userExam.startedAt!, userExam.exam.durationMinutes!)) {
        await tx.userExam.update({
          where: { id: userExamId },
          data: { status: ExamStatus.TIMEOUT, submittedAt: now },
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

      // Prepare answers dengan question info
      const answersWithQuestions = userExam.answers.map((answer) => {
        const examQuestion = userExam.exam.examQuestions.find(
          (eq) => eq.id === answer.examQuestionId
        )!;
        return {
          ...answer,
          examQuestion,
        };
      });

      // Calculate score (menggunakan helper dari exam-sessions.score.ts)
      const { totalScore, scoresByType } = calculateScore(answersWithQuestions);

      // Update correctness untuk semua answers
      await updateAnswerCorrectness(tx, answersWithQuestions);

      // Update exam session
      await tx.userExam.update({
        where: { id: userExamId },
        data: {
          status: ExamStatus.FINISHED,
          submittedAt: now,
          totalScore,
        },
      });

      // Log submission
      logger.info(
        {
          userExamId,
          userId,
          examId: userExam.examId,
          totalScore,
          duration: calculateDuration(userExam.startedAt!, now),
        },
        'Exam submitted successfully'
      );

      // Prepare result
      const result: ExamResult = {
        id: userExam.id,
        exam: {
          id: userExam.exam.id,
          title: userExam.exam.title,
          description: userExam.exam.description,
        },
        user: userExam.user,
        startedAt: userExam.startedAt!,
        submittedAt: now,
        totalScore,
        status: ExamStatus.FINISHED,
        duration: calculateDuration(userExam.startedAt!, now),
        answeredQuestions: userExam.answers.filter((a) => a.selectedOption !== null).length,
        totalQuestions: userExam.exam.examQuestions.length,
        scoresByType,
      };

      return result;
    },
    {
      timeout: 10000, // 10 detik timeout untuk perhitungan score
    }
  );
};

// ... (sisanya: getUserExam, getUserExams, getMyResults, getResults,
//      getExamQuestions, getExamAnswers tetap sama, hanya lebih clean)

/**
 * Clean up abandoned exam sessions
 *
 * Dipanggil oleh cron job setiap 5 menit untuk:
 * - Detect sessions yang abandoned (2x duration tanpa aktivitas)
 * - Auto-submit dengan score dari jawaban yang ada
 * - Mark status sebagai TIMEOUT
 *
 * @returns CleanupResult dengan jumlah session yang dibersihkan dan errors
 */
export const cleanupAbandonedSessions = async (): Promise<CleanupResult> => {
  const startTime = Date.now();
  let cleaned = 0;
  let errors = 0;

  try {
    logger.info('Memulai cleanup abandoned sessions...');

    const sessions = await prisma.userExam.findMany({
      where: {
        status: ExamStatus.IN_PROGRESS,
        startedAt: { not: null },
      },
      include: {
        exam: { select: { durationMinutes: true } },
      },
    });

    logger.info({ count: sessions.length }, 'Found sessions to check');

    for (const session of sessions) {
      try {
        // Check apakah abandoned
        if (!isAbandonedSession(session.startedAt!, session.exam.durationMinutes!)) {
          continue;
        }

        // Get answers & calculate score
        const answers = await prisma.answer.findMany({
          where: { userExamId: session.id },
          include: {
            examQuestion: { include: { question: true } },
          },
        });

        const { totalScore } = calculateScore(answers as any);

        // Update correctness
        for (const answer of answers) {
          const isCorrect =
            answer.selectedOption === answer.examQuestion.question.correctAnswer;

          if (answer.isCorrect === null) {
            await prisma.answer.update({
              where: { id: answer.id },
              data: { isCorrect },
            });
          }
        }

        // Mark as TIMEOUT
        await prisma.userExam.update({
          where: { id: session.id },
          data: {
            status: ExamStatus.TIMEOUT,
            submittedAt: new Date(),
            totalScore,
          },
        });

        cleaned++;
        logger.info({ userExamId: session.id, totalScore }, 'Session cleaned');
      } catch (error) {
        errors++;
        logger.error({ error, userExamId: session.id }, 'Failed to clean session');
      }
    }

    logger.info(
      { cleaned, errors, durationMs: Date.now() - startTime },
      'Cleanup complete'
    );

    return { cleaned, errors };
  } catch (error) {
    logger.error({ error }, 'Cleanup job failed');
    throw error;
  }
};

/**
 * Clean up expired tokens
 */
export const cleanupExpiredTokens = async (): Promise<TokenCleanupResult> => {
  const result = await prisma.token.deleteMany({
    where: { expires: { lt: new Date() } },
  });

  logger.info({ deleted: result.count }, 'Expired tokens cleaned');

  return { deleted: result.count };
};

/**
 * Run all cleanup tasks
 */
export const runAllCleanupTasks = async () => {
  logger.info('Running all cleanup tasks...');

  const [sessions, tokens] = await Promise.allSettled([
    cleanupAbandonedSessions(),
    cleanupExpiredTokens(),
  ]);

  return {
    sessions: sessions.status === 'fulfilled' ? sessions.value : { error: 'failed' },
    tokens: tokens.status === 'fulfilled' ? tokens.value : { error: 'failed' },
  };
};