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
  CloneExamParams,
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
  const userId = req.user!.id;
  const exam = await examsService.createExam(userId, req.body);

  sendSuccess(
    res,
    { exam },
    SUCCESS_MESSAGES.EXAM_CREATED,
    HTTP_STATUS.CREATED
  );
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
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const isAdmin = userRole === 'ADMIN';

  const result = await examsService.getExams(req.query, isAdmin, userId);

  const message = isAdmin
    ? SUCCESS_MESSAGES.EXAMS_RETRIEVED
    : SUCCESS_MESSAGES.AVAILABLE_EXAMS_RETRIEVED;

  sendSuccess(res, result, message, HTTP_STATUS.OK);
};

/**
 * Get single exam controller
 * GET /api/v1/admin/exams/:id (admin - full details)
 * GET /api/v1/exams/:id (participant - basic info)
 *
 * @access Private (All authenticated users)
 */
export const getExamById = async (
  req: Request<GetExamParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const isAdmin = req.user!.role === 'ADMIN';

  const exam = await examsService.getExamById(id, isAdmin);

  sendSuccess(
    res,
    { exam },
    SUCCESS_MESSAGES.EXAM_RETRIEVED,
    HTTP_STATUS.OK
  );
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
  const { id } = req.params;
  const userId = req.user!.id;

  const exam = await examsService.updateExam(id, userId, req.body);

  sendSuccess(
    res,
    { exam },
    SUCCESS_MESSAGES.EXAM_UPDATED,
    HTTP_STATUS.OK
  );
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
  const { id } = req.params;
  const userId = req.user!.id;

  const result = await examsService.deleteExam(id, userId);

  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.EXAM_DELETED,
    HTTP_STATUS.OK
  );
};

/**
 * Clone/duplicate exam controller
 * POST /api/v1/admin/exams/:id/clone
 *
 * @access Private (Admin only)
 */
export const cloneExam = async (
  req: Request<CloneExamParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  const exam = await examsService.cloneExam(id, userId);

  sendSuccess(
    res,
    { exam },
    SUCCESS_MESSAGES.EXAM_CLONED,
    HTTP_STATUS.CREATED
  );
};

/**
 * Attach questions to exam controller
 * POST /api/v1/admin/exams/:id/questions
 *
 * @access Private (Admin only - creator)
 */
export const attachQuestions = async (
  req: Request<AttachQuestionsParams, {}, AttachQuestionsInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  const result = await examsService.attachQuestions(id, userId, req.body);

  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.QUESTIONS_ATTACHED,
    HTTP_STATUS.OK
  );
};

/**
 * Detach questions from exam controller
 * DELETE /api/v1/admin/exams/:id/questions
 *
 * @access Private (Admin only - creator)
 */
export const detachQuestions = async (
  req: Request<DetachQuestionsParams, {}, DetachQuestionsInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  const result = await examsService.detachQuestions(id, userId, req.body);

  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.QUESTIONS_DETACHED,
    HTTP_STATUS.OK
  );
};

/**
 * Reorder exam questions controller
 * PATCH /api/v1/admin/exams/:id/questions/reorder
 *
 * @access Private (Admin only - creator)
 */
export const reorderQuestions = async (
  req: Request<AttachQuestionsParams, {}, { questionIds: number[] }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { questionIds } = req.body;

  const result = await examsService.reorderQuestions(id, userId, questionIds);

  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.QUESTIONS_REORDERED,
    HTTP_STATUS.OK
  );
};

/**
 * Get exam questions controller
 * GET /api/v1/admin/exams/:id/questions
 *
 * @access Private (Admin only - creator)
 */
export const getExamQuestions = async (
  req: Request<GetExamQuestionsParams, {}, {}, GetExamQuestionsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  const questions = await examsService.getExamQuestions(id, userId, req.query);

  sendSuccess(
    res,
    { questions, total: questions.length },
    SUCCESS_MESSAGES.EXAM_QUESTIONS_RETRIEVED,
    HTTP_STATUS.OK
  );
};

/**
 * Get exam statistics controller
 * GET /api/v1/admin/exams/:id/stats
 *
 * @access Private (Admin only - creator)
 */
export const getExamStats = async (
  req: Request<GetExamParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  const stats = await examsService.getExamStats(id, userId);

  sendSuccess(
    res,
    stats,
    SUCCESS_MESSAGES.EXAM_STATISTICS_RETRIEVED,
    HTTP_STATUS.OK
  );
};