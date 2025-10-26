import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examsController from './exams.controller';
import * as examsValidation from './exams.validation';

export const examsRouter = Router();

// ==================== ADMIN ROUTES ====================

/**
 * @route   POST /api/v1/admin/exams
 * @desc    Create a new exam
 * @access  Private (Admin only)
 */
examsRouter.post(
  '/admin/exams',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.createExamSchema),
  asyncHandler(examsController.createExam)
);

/**
 * @route   GET /api/v1/admin/exams
 * @desc    Get all exams (admin view)
 * @access  Private (Admin only)
 */
examsRouter.get(
  '/admin/exams',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.getExamsSchema),
  asyncHandler(examsController.getExams)
);

/**
 * @route   GET /api/v1/admin/exams/:id
 * @desc    Get single exam details
 * @access  Private (Admin only)
 */
examsRouter.get(
  '/admin/exams/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.getExamSchema),
  asyncHandler(examsController.getExamById)
);

/**
 * @route   PATCH /api/v1/admin/exams/:id
 * @desc    Update exam
 * @access  Private (Admin only - creator)
 */
examsRouter.patch(
  '/admin/exams/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.updateExamSchema),
  asyncHandler(examsController.updateExam)
);

/**
 * @route   DELETE /api/v1/admin/exams/:id
 * @desc    Delete exam
 * @access  Private (Admin only - creator)
 */
examsRouter.delete(
  '/admin/exams/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.deleteExamSchema),
  asyncHandler(examsController.deleteExam)
);

/**
 * @route   POST /api/v1/admin/exams/:id/questions
 * @desc    Attach questions to exam
 * @access  Private (Admin only)
 */
examsRouter.post(
  '/admin/exams/:id/questions',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.attachQuestionsSchema),
  asyncHandler(examsController.attachQuestions)
);

/**
 * @route   DELETE /api/v1/admin/exams/:id/questions
 * @desc    Detach questions from exam
 * @access  Private (Admin only)
 */
examsRouter.delete(
  '/admin/exams/:id/questions',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.detachQuestionsSchema),
  asyncHandler(examsController.detachQuestions)
);

/**
 * @route   GET /api/v1/admin/exams/:id/questions
 * @desc    Get all questions in exam (with correct answers)
 * @access  Private (Admin only)
 */
examsRouter.get(
  '/admin/exams/:id/questions',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.getExamQuestionsSchema),
  asyncHandler(examsController.getExamQuestions)
);

// ==================== PARTICIPANT ROUTES ====================

/**
 * @route   GET /api/v1/exams
 * @desc    Get available exams for participants
 * @access  Private (All authenticated users)
 */
examsRouter.get(
  '/exams',
  authenticate,
  validate(examsValidation.getExamsSchema),
  asyncHandler(examsController.getExams)
);

/**
 * @route   GET /api/v1/exams/:id
 * @desc    Get exam details (without questions for participants)
 * @access  Private (All authenticated users)
 */
examsRouter.get(
  '/exams/:id',
  authenticate,
  validate(examsValidation.getExamSchema),
  asyncHandler(examsController.getExamById)
);