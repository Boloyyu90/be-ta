import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examsController from '../exams.controller';
import * as examsValidation from '../exams.validation';

export const adminExamsRouter = Router();

// =================================================================
// EXAM MANAGEMENT ROUTES
// Mounted at: /api/v1/admin/exams
// Authorization: Admin only (enforced at parent router level)
// =================================================================

/**
 * @route   POST /api/v1/admin/exams
 * @desc    Create new exam
 * @access  Admin only
 */
adminExamsRouter.post(
  '/',
  validate(examsValidation.createExamSchema),
  asyncHandler(examsController.createExam)
);

/**
 * @route   GET /api/v1/admin/exams
 * @desc    Get all exams (including drafts without questions)
 * @access  Admin only
 */
adminExamsRouter.get(
  '/',
  validate(examsValidation.getExamsSchema),
  asyncHandler(examsController.getExams)
);

/**
 * @route   GET /api/v1/admin/exams/:id/questions
 * @desc    Get exam questions with correct answers
 * @access  Admin only
 */
adminExamsRouter.get(
  '/:id/questions',
  validate(examsValidation.getExamQuestionsSchema),
  asyncHandler(examsController.getExamQuestions)
);

/**
 * @route   POST /api/v1/admin/exams/:id/questions
 * @desc    Attach questions to exam
 * @access  Admin only
 */
adminExamsRouter.post(
  '/:id/questions',
  validate(examsValidation.attachQuestionsSchema),
  asyncHandler(examsController.attachQuestions)
);

/**
 * @route   DELETE /api/v1/admin/exams/:id/questions
 * @desc    Detach questions from exam
 * @access  Admin only
 */
adminExamsRouter.delete(
  '/:id/questions',
  validate(examsValidation.detachQuestionsSchema),
  asyncHandler(examsController.detachQuestions)
);

/**
 * @route   GET /api/v1/admin/exams/:id
 * @desc    Get exam by ID with full details
 * @access  Admin only
 */
adminExamsRouter.get(
  '/:id',
  validate(examsValidation.getExamSchema),
  asyncHandler(examsController.getExamById)
);

/**
 * @route   PATCH /api/v1/admin/exams/:id
 * @desc    Update exam
 * @access  Admin only
 */
adminExamsRouter.patch(
  '/:id',
  validate(examsValidation.updateExamSchema),
  asyncHandler(examsController.updateExam)
);

/**
 * @route   DELETE /api/v1/admin/exams/:id
 * @desc    Delete exam
 * @access  Admin only
 */
adminExamsRouter.delete(
  '/:id',
  validate(examsValidation.deleteExamSchema),
  asyncHandler(examsController.deleteExam)
);