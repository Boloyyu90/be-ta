import { Request, Response, NextFunction } from 'express';
import * as questionsService from './questions.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '@/config/constants';
import type {
  CreateQuestionInput,
  UpdateQuestionParams,
  UpdateQuestionInput,
  GetQuestionParams,
  DeleteQuestionParams,
  GetQuestionsQuery,
  BulkCreateQuestionsInput,
  BulkDeleteQuestionsInput,
} from './questions.validation';

/**
 * Create question controller
 * POST /api/v1/admin/questions
 *
 * @access Private (Admin only)
 */
export const createQuestion = async (
  req: Request<{}, {}, CreateQuestionInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const question = await questionsService.createQuestion(req.body);

    sendSuccess(res, { question }, SUCCESS_MESSAGES.QUESTION_CREATED, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get questions list controller
 * GET /api/v1/admin/questions
 *
 * @access Private (Admin only)
 */
export const getQuestions = async (
  req: Request<{}, {}, {}, GetQuestionsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await questionsService.getQuestions(req.query);

    sendSuccess(res, result, 'Questions retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get single question controller
 * GET /api/v1/admin/questions/:id
 *
 * @access Private (Admin only)
 */
export const getQuestionById = async (
  req: Request<GetQuestionParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const question = await questionsService.getQuestionById(id);

    sendSuccess(res, { question }, 'Question retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Update question controller
 * PATCH /api/v1/admin/questions/:id
 *
 * @access Private (Admin only)
 */
export const updateQuestion = async (
  req: Request<UpdateQuestionParams, {}, UpdateQuestionInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const question = await questionsService.updateQuestion(id, req.body);

    sendSuccess(res, { question }, SUCCESS_MESSAGES.QUESTION_UPDATED, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete question controller
 * DELETE /api/v1/admin/questions/:id
 *
 * @access Private (Admin only)
 */
export const deleteQuestion = async (
  req: Request<DeleteQuestionParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await questionsService.deleteQuestion(id);

    sendSuccess(res, result, SUCCESS_MESSAGES.QUESTION_DELETED, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk create questions controller
 * POST /api/v1/admin/questions/bulk
 *
 * @access Private (Admin only)
 */
export const bulkCreateQuestions = async (
  req: Request<{}, {}, BulkCreateQuestionsInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await questionsService.bulkCreateQuestions(req.body);

    sendSuccess(res, result, result.message, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete questions controller
 * POST /api/v1/admin/questions/bulk-delete
 *
 * @access Private (Admin only)
 */
export const bulkDeleteQuestions = async (
  req: Request<{}, {}, BulkDeleteQuestionsInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await questionsService.bulkDeleteQuestions(req.body);

    sendSuccess(res, result, result.message, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get question statistics controller
 * GET /api/v1/admin/questions/stats
 *
 * @access Private (Admin only)
 */
export const getQuestionStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await questionsService.getQuestionStats();

    sendSuccess(res, stats, 'Question statistics retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};