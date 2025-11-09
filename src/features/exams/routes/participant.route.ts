import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examsController from '../exams.controller';
import * as examsValidation from '../exams.validation';
import * as examSessionsController from '@/features/exam-sessions/exam-sessions.controller';
import * as examSessionsValidation from '@/features/exam-sessions/exam-sessions.validation';

export const participantExamsRouter = Router();

// =================================================================
// EXAM BROWSING & STARTING ROUTES
// Mounted at: /api/v1/exams
// Authorization: Authenticated users (enforced at parent router)
// =================================================================

/**
 * @route   GET /api/v1/exams
 * @desc    Get available exams (published with questions only)
 * @access  Authenticated users
 */
participantExamsRouter.get(
  '/',
  validate(examsValidation.getExamsSchema),
  asyncHandler(examsController.getExams)
);

/**
 * @route   GET /api/v1/exams/:id
 * @desc    Get exam details (without correct answers)
 * @access  Authenticated users
 */
participantExamsRouter.get(
  '/:id',
  validate(examsValidation.getExamSchema),
  asyncHandler(examsController.getExamById)
);

/**
 * @route   POST /api/v1/exams/:id/start
 * @desc    Start exam session
 * @access  Authenticated users
 */
participantExamsRouter.post(
  '/:id/start',
  validate(examSessionsValidation.startExamSchema),
  asyncHandler(examSessionsController.startExam)
);