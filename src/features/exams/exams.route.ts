import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examsController from './exams.controller';
import * as examsValidation from './exams.validation';

export const examsRouter = Router();

// ==================== PARTICIPANT ROUTES ====================
// Public exam viewing for all authenticated users

/**
 * @route   GET /api/v1/exams
 * @desc    Get available exams for participants
 * @access  Private (All authenticated users)
 */
examsRouter.get(
  '/',
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
  '/:id',
  authenticate,
  validate(examsValidation.getExamSchema),
  asyncHandler(examsController.getExamById)
);

// ==================== ADMIN ROUTES ====================
// Full exam management for admins

/**
 * @route   POST /api/v1/admin/exams
 * @desc    Create a new exam
 * @access  Private (Admin only)
 */
examsRouter.post(
  '/admin',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.createExamSchema),
  asyncHandler(examsController.createExam)
);

/**
 * @route   GET /api/v1/admin/exams
 * @desc    Get all exams (admin view with filters)
 * @access  Private (Admin only)
 */
examsRouter.get(
  '/admin',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.getExamsSchema),
  asyncHandler(examsController.getExams)
);

/**
 * @route   GET /api/v1/admin/exams/:id
 * @desc    Get single exam details with full info
 * @access  Private (Admin only)
 */
examsRouter.get(
  '/admin/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.getExamSchema),
  asyncHandler(examsController.getExamById)
);

/**
 * @route   GET /api/v1/admin/exams/:id/stats
 * @desc    Get exam statistics (participants, scores, completion rate)
 * @access  Private (Admin only - creator)
 */
examsRouter.get(
  '/admin/:id/stats',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.getExamStatsSchema),
  asyncHandler(examsController.getExamStats)
);

/**
 * @route   PATCH /api/v1/admin/exams/:id
 * @desc    Update exam
 * @access  Private (Admin only - creator)
 */
examsRouter.patch(
  '/admin/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.updateExamSchema),
  asyncHandler(examsController.updateExam)
);

/**
 * @route   POST /api/v1/admin/exams/:id/clone
 * @desc    Clone/duplicate exam with all questions
 * @access  Private (Admin only)
 */
examsRouter.post(
  '/admin/:id/clone',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.cloneExamSchema),
  asyncHandler(examsController.cloneExam)
);

/**
 * @route   DELETE /api/v1/admin/exams/:id
 * @desc    Delete exam
 * @access  Private (Admin only - creator)
 */
examsRouter.delete(
  '/admin/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.deleteExamSchema),
  asyncHandler(examsController.deleteExam)
);

// ==================== EXAM QUESTIONS ROUTES ====================

/**
 * @route   POST /api/v1/admin/exams/:id/questions
 * @desc    Attach questions to exam
 * @access  Private (Admin only - creator)
 */
examsRouter.post(
  '/admin/:id/questions',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.attachQuestionsSchema),
  asyncHandler(examsController.attachQuestions)
);

/**
 * @route   GET /api/v1/admin/exams/:id/questions
 * @desc    Get all questions in exam (with correct answers)
 * @access  Private (Admin only - creator)
 */
examsRouter.get(
  '/admin/:id/questions',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.getExamQuestionsSchema),
  asyncHandler(examsController.getExamQuestions)
);

/**
 * @route   PATCH /api/v1/admin/exams/:id/questions/reorder
 * @desc    Reorder questions in exam
 * @access  Private (Admin only - creator)
 */
examsRouter.patch(
  '/admin/:id/questions/reorder',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.reorderQuestionsSchema),
  asyncHandler(examsController.reorderQuestions)
);

/**
 * @route   DELETE /api/v1/admin/exams/:id/questions
 * @desc    Detach questions from exam
 * @access  Private (Admin only - creator)
 */
examsRouter.delete(
  '/admin/:id/questions',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(examsValidation.detachQuestionsSchema),
  asyncHandler(examsController.detachQuestions)
);