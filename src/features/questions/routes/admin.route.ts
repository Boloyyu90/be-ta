import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as questionsController from '../questions.controller';
import * as questionsValidation from '../questions.validation';

export const adminQuestionsRouter = Router();

// =================================================================
// QUESTION BANK MANAGEMENT ROUTES
// Mounted at: /api/v1/admin/questions
// Authorization: Admin only (enforced at parent router level)
// =================================================================

/**
 * @route   POST /api/v1/admin/questions
 * @desc    Create new question
 * @access  Admin only
 */
adminQuestionsRouter.post(
  '/',
  validate(questionsValidation.createQuestionSchema),
  asyncHandler(questionsController.createQuestion)
);

/**
 * @route   GET /api/v1/admin/questions
 * @desc    Get all questions with pagination and filters
 * @access  Admin only
 */
adminQuestionsRouter.get(
  '/',
  validate(questionsValidation.getQuestionsSchema),
  asyncHandler(questionsController.getQuestions)
);

/**
 * @route   GET /api/v1/admin/questions/:id
 * @desc    Get question by ID
 * @access  Admin only
 */
adminQuestionsRouter.get(
  '/:id',
  validate(questionsValidation.getQuestionSchema),
  asyncHandler(questionsController.getQuestionById)
);

/**
 * @route   PATCH /api/v1/admin/questions/:id
 * @desc    Update question
 * @access  Admin only
 */
adminQuestionsRouter.patch(
  '/:id',
  validate(questionsValidation.updateQuestionSchema),
  asyncHandler(questionsController.updateQuestion)
);

/**
 * @route   DELETE /api/v1/admin/questions/:id
 * @desc    Delete question
 * @access  Admin only
 */
adminQuestionsRouter.delete(
  '/:id',
  validate(questionsValidation.deleteQuestionSchema),
  asyncHandler(questionsController.deleteQuestion)
);