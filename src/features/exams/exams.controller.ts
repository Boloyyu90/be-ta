import { Request, Response, NextFunction } from 'express';
import * as examsService from './exams.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '@/config/constants';
import type {
  CreateExamInput,
  UpdateExamParams,
  UpdateExamInput,
  GetExamParams,
  DeleteExamParams,
  GetExamsQuery,
  AttachQuestionsParams,
  AttachQuestionsInput,
  DetachQuestionsParams,
  DetachQuestionsInput,
  GetExamQuestionsParams,
  GetExamQuestionsQuery,
} from './exams.validation';

/**
 * Create exam controller
 * POST /api/v1/admin/exams
 *
 * @access Private (Admin only)
 */
export const createExam = async (
  req: Request<{}, {}, CreateExamInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // req.user is set by authenticate middleware
    const userId = req.user!.id;

    const exam = await examsService.createExam(userId, req.body);

    sendSuccess(res, { exam }, SUCCESS_MESSAGES.EXAM_CREATED, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get exams list controller
 * GET /api/v1/admin/exams (for admin - all exams)
 * GET /api/v1/exams (for participants - available exams only)
 *
 * @access Private (All authenticated users)
 */
export const getExams = async (
  req: Request<{}, {}, {}, GetExamsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';

    const result = await examsService.getExams(req.query, isAdmin);

    sendSuccess(
      res,
      result,
      isAdmin ? 'Exams retrieved successfully' : 'Available exams retrieved successfully',
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single exam controller
 * GET /api/v1/admin/exams/:id
 *
 * @access Private (Admin only)
 */
export const getExamById = async (
  req: Request<GetExamParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const exam = await examsService.getExamById(id, false);

    sendSuccess(res, { exam }, 'Exam retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Update exam controller
 * PATCH /api/v1/admin/exams/:id
 *
 * @access Private (Admin only - creator)
 */
export const updateExam = async (
  req: Request<UpdateExamParams, {}, UpdateExamInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const exam = await examsService.updateExam(id, userId, req.body);

    sendSuccess(res, { exam }, SUCCESS_MESSAGES.EXAM_UPDATED, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete exam controller
 * DELETE /api/v1/admin/exams/:id
 *
 * @access Private (Admin only - creator)
 */
export const deleteExam = async (
  req: Request<DeleteExamParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const result = await examsService.deleteExam(id, userId);

    sendSuccess(res, result, SUCCESS_MESSAGES.EXAM_DELETED, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Attach questions to exam controller
 * POST /api/v1/admin/exams/:id/questions
 *
 * @access Private (Admin only)
 */
export const attachQuestions = async (
  req: Request<AttachQuestionsParams, {}, AttachQuestionsInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await examsService.attachQuestions(id, req.body);

    sendSuccess(res, result, result.message, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Detach questions from exam controller
 * DELETE /api/v1/admin/exams/:id/questions
 *
 * @access Private (Admin only)
 */
export const detachQuestions = async (
  req: Request<DetachQuestionsParams, {}, DetachQuestionsInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await examsService.detachQuestions(id, req.body);

    sendSuccess(res, result, result.message, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get exam questions controller
 * GET /api/v1/admin/exams/:id/questions
 *
 * @access Private (Admin only)
 */
export const getExamQuestions = async (
  req: Request<GetExamQuestionsParams, {}, {}, GetExamQuestionsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const questions = await examsService.getExamQuestions(id, req.query);

    sendSuccess(
      res,
      { questions, total: questions.length },
      'Exam questions retrieved successfully',
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};