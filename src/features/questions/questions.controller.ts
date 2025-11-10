import { Request, Response, NextFunction } from 'express';
import * as questionsService from './questions.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '@/config/constants';
import type {
  CreateQuestionInput,
  UpdateQuestionParams,
  UpdateQuestionInput,
  GetQuestionsQuery,
  GetQuestionParams,
  DeleteQuestionParams,
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
  const question = await questionsService.createQuestion(req.body);

  sendSuccess(
    res,
    { question },
    SUCCESS_MESSAGES.QUESTION_CREATED,
    HTTP_STATUS.CREATED
  );
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
  const result = await questionsService.getQuestions(req.query);

  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.QUESTIONS_RETRIEVED,
    HTTP_STATUS.OK
  );
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
  const { id } = req.params;
  const question = await questionsService.getQuestionById(id);

  sendSuccess(
    res,
    { question },
    SUCCESS_MESSAGES.QUESTION_RETRIEVED,
    HTTP_STATUS.OK
  );
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
  const { id } = req.params;
  const question = await questionsService.updateQuestion(id, req.body);

  sendSuccess(
    res,
    { question },
    SUCCESS_MESSAGES.QUESTION_UPDATED,
    HTTP_STATUS.OK
  );
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
  const { id } = req.params;
  const result = await questionsService.deleteQuestion(id);

  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.QUESTION_DELETED,
    HTTP_STATUS.OK
  );
};

