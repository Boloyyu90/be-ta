import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as questionsController from './questions.controller';
import * as questionsValidation from './questions.validation';

export const questionsRouter = Router();

// =================================================================
// MOUNTING CONTEXT:
// 1. /api/v1/admin/questions    → Question bank (admin only)
//
// Note: This router is ONLY mounted at admin path
// Authorization is applied at router mounting level in v1.route.ts
// =================================================================

/**
 * @route   POST /api/v1/admin/questions/bulk
 * @desc    Bulk create questions
 * @access  Private (Admin only)
 */
questionsRouter.post(
  '/bulk',
  validate(questionsValidation.bulkCreateQuestionsSchema),
  asyncHandler(questionsController.bulkCreateQuestions)
);

/**
 * @route   GET /api/v1/admin/questions/:id
 * @desc    Get question by ID
 * @access  Private (Admin only)
 */
questionsRouter.get(
  '/:id',
  validate(questionsValidation.getQuestionSchema),
  asyncHandler(questionsController.getQuestionById)
);

/**
 * @route   PATCH /api/v1/admin/questions/:id
 * @desc    Update question
 * @access  Private (Admin only)
 */
questionsRouter.patch(
  '/:id',
  validate(questionsValidation.updateQuestionSchema),
  asyncHandler(questionsController.updateQuestion)
);

/**
 * @route   DELETE /api/v1/admin/questions/:id
 * @desc    Delete question
 * @access  Private (Admin only)
 */
questionsRouter.delete(
  '/:id',
  validate(questionsValidation.deleteQuestionSchema),
  asyncHandler(questionsController.deleteQuestion)
);

/**
 * @route   GET /api/v1/admin/questions
 * @desc    Get all questions
 * @access  Private (Admin only)
 */
questionsRouter.get(
  '/',
  validate(questionsValidation.getQuestionsSchema),
  asyncHandler(questionsController.getQuestions)
);

/**
 * @route   POST /api/v1/admin/questions
 * @desc    Create question
 * @access  Private (Admin only)
 */
questionsRouter.post(
  '/',
  validate(questionsValidation.createQuestionSchema),
  asyncHandler(questionsController.createQuestion)
);