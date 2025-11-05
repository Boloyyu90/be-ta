import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as questionsController from './questions.controller';
import * as questionsValidation from './questions.validation';

export const questionsRouter = Router();

// ==================== ADMIN ROUTES ====================

/**
 * @route   POST /api/v1/admin/questions
 * @desc    Create a new question
 * @access  Private (Admin only)
 */
questionsRouter.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.createQuestionSchema),
  asyncHandler(questionsController.createQuestion)
);

/**
 * @route   POST /api/v1/admin/questions/bulk
 * @desc    Bulk create questions from array
 * @access  Private (Admin only)
 */
questionsRouter.post(
  '/bulk',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.bulkCreateQuestionsSchema),
  asyncHandler(questionsController.bulkCreateQuestions)
);

/**
 * @route   GET /api/v1/admin/questions
 * @desc    Get questions list with filters
 * @access  Private (Admin only)
 */
questionsRouter.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.getQuestionsSchema),
  asyncHandler(questionsController.getQuestions)
);

/**
 * @route   GET /api/v1/admin/questions/:id
 * @desc    Get single question by ID
 * @access  Private (Admin only)
 */
questionsRouter.get(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.getQuestionSchema),
  asyncHandler(questionsController.getQuestionById)
);

/**
 * @route   PATCH /api/v1/admin/questions/:id
 * @desc    Update question by ID
 * @access  Private (Admin only)
 */
questionsRouter.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.updateQuestionSchema),
  asyncHandler(questionsController.updateQuestion)
);

/**
 * @route   DELETE /api/v1/admin/questions/:id
 * @desc    Delete question by ID
 * @access  Private (Admin only)
 */
questionsRouter.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validate(questionsValidation.deleteQuestionSchema),
  asyncHandler(questionsController.deleteQuestion)
);