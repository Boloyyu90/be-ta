import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examSessionsController from '../exam-sessions.controller';
import * as examSessionsValidation from '../exam-sessions.validation';

export const participantExamSessionsRouter = Router();

// =================================================================
// EXAM SESSION MANAGEMENT ROUTES
// Mounted at: /api/v1/exam-sessions
// Authorization: Authenticated users (enforced at parent router)
// =================================================================

/**
 * @route   GET /api/v1/exam-sessions
 * @desc    Get my exam sessions
 * @access  Authenticated users
 */
participantExamSessionsRouter.get(
  '/',
  validate(examSessionsValidation.getUserExamsSchema),
  asyncHandler(examSessionsController.getUserExams)
);

/**
 * @route   GET /api/v1/exam-sessions/:id
 * @desc    Get exam session details
 * @access  Session owner only
 */
participantExamSessionsRouter.get(
  '/:id',
  validate(examSessionsValidation.getUserExamSchema),
  asyncHandler(examSessionsController.getUserExam)
);

/**
 * @route   GET /api/v1/exam-sessions/:id/questions
 * @desc    Get questions for active exam (without correct answers)
 * @access  Session owner only
 */
participantExamSessionsRouter.get(
  '/:id/questions',
  validate(examSessionsValidation.getExamQuestionsSchema),
  asyncHandler(examSessionsController.getExamQuestions)
);

/**
 * @route   POST /api/v1/exam-sessions/:id/answers
 * @desc    Submit/update answer (auto-save)
 * @access  Session owner only
 */
participantExamSessionsRouter.post(
  '/:id/answers',
  validate(examSessionsValidation.submitAnswerSchema),
  asyncHandler(examSessionsController.submitAnswer)
);

/**
 * @route   POST /api/v1/exam-sessions/:id/submit
 * @desc    Submit exam and finalize
 * @access  Session owner only
 */
participantExamSessionsRouter.post(
  '/:id/submit',
  validate(examSessionsValidation.submitExamSchema),
  asyncHandler(examSessionsController.submitExam)
);

/**
 * @route   GET /api/v1/exam-sessions/:id/answers
 * @desc    Get exam answers for review (after submission)
 * @access  Session owner only
 */
participantExamSessionsRouter.get(
  '/:id/answers',
  validate(examSessionsValidation.getExamAnswersSchema),
  asyncHandler(examSessionsController.getExamAnswers)
);