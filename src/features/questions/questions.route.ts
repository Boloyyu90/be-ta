import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as questionsController from './questions.controller';
import * as questionsValidation from './questions.validation';

export const questionsRouter = Router();

// ==================== SPECIAL ROUTES (Must be before :id routes) ====================

/**
 * @route   GET /api/v1/admin/questions/stats
 * @desc    Get question statistics
 * @access  Private (Admin only)
 */
questionsRouter.get(
  '/admin/questions/stats',
  authenticate,
  authorize(UserRole.ADMIN),
  asyncHandler(questionsController.getQuestionStats)
);

/**
 * @route   POST /api/v1/admin/questions/bulk
 * @desc    Bulk create questions
 * @access  Private (Admin only)
 */
questionsRouter.post(
  '/admin/questions/bulk',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.bulkCreateQuestionsSchema),
  asyncHandler(questionsController.bulkCreateQuestions)
);

/**
 * @route   POST /api/v1/admin/questions/bulk-delete
 * @desc    Bulk delete questions
 * @access  Private (Admin only)
 */
questionsRouter.post(
  '/admin/questions/bulk-delete',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.bulkDeleteQuestionsSchema),
  asyncHandler(questionsController.bulkDeleteQuestions)
);

// ==================== STANDARD CRUD ROUTES ====================

/**
 * @route   POST /api/v1/admin/questions
 * @desc    Create a new question
 * @access  Private (Admin only)
 */
questionsRouter.post(
  '/admin/questions',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.createQuestionSchema),
  asyncHandler(questionsController.createQuestion)
);

/**
 * @route   GET /api/v1/admin/questions
 * @desc    Get all questions with filters
 * @access  Private (Admin only)
 */
questionsRouter.get(
  '/admin/questions',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.getQuestionsSchema),
  asyncHandler(questionsController.getQuestions)
);

/**
 * @route   GET /api/v1/admin/questions/:id
 * @desc    Get single question details
 * @access  Private (Admin only)
 */
questionsRouter.get(
  '/admin/questions/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.getQuestionSchema),
  asyncHandler(questionsController.getQuestionById)
);

/**
 * @route   PATCH /api/v1/admin/questions/:id
 * @desc    Update question
 * @access  Private (Admin only)
 */
questionsRouter.patch(
  '/admin/questions/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.updateQuestionSchema),
  asyncHandler(questionsController.updateQuestion)
);

/**
 * @route   DELETE /api/v1/admin/questions/:id
 * @desc    Delete question
 * @access  Private (Admin only)
 */
questionsRouter.delete(
  '/admin/questions/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.deleteQuestionSchema),
  asyncHandler(questionsController.deleteQuestion)
);