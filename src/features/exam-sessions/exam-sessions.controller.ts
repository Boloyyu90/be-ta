import { Request, Response, NextFunction } from 'express';
import * as examSessionsService from './exam-sessions.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '@/config/constants';
import type {
  StartExamParams,
  SubmitAnswerParams,
  SubmitAnswerInput,
  SubmitExamParams,
  GetUserExamParams,
  GetMyResultsQuery,
  GetResultsQuery,
  GetExamQuestionsParams,
  GetExamQuestionsQuery,
  GetExamAnswersParams,
  GetUserExamsQuery,
} from './exam-sessions.validation';

/**
 * Start exam controller
 * POST /api/v1/exams/:id/start
 *
 * @access Private (Authenticated users)
 */
export const startExam = async (
  req: Request<StartExamParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;
  const { id: examId } = req.params;

  const result = await examSessionsService.startExam(userId, examId);

  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.EXAM_STARTED,
    HTTP_STATUS.OK
  );
};

/**
 * Get user's exam sessions controller
 * GET /api/v1/user-exams
 *
 * @access Private (Authenticated users)
 */
export const getUserExams = async (
  req: Request<{}, {}, {}, GetUserExamsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;

  const result = await examSessionsService.getUserExams(userId, req.query);

  sendSuccess(
    res,
    result,
    'User exam sessions retrieved successfully',
    HTTP_STATUS.OK
  );
};

/**
 * Get user exam session details controller
 * GET /api/v1/user-exams/:id
 *
 * @access Private (Owner only)
 */
export const getUserExam = async (
  req: Request<GetUserExamParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;
  const { id: userExamId } = req.params;

  const userExam = await examSessionsService.getUserExam(userExamId, userId);

  sendSuccess(
    res,
    { userExam },
    'User exam retrieved successfully',
    HTTP_STATUS.OK
  );
};

/**
 * Get exam questions controller
 * GET /api/v1/user-exams/:id/questions
 *
 * @access Private (Owner only)
 */
export const getExamQuestions = async (
  req: Request<GetExamQuestionsParams, {}, {}, GetExamQuestionsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;
  const { id: userExamId } = req.params;

  const questions = await examSessionsService.getExamQuestions(
    userExamId,
    userId,
    req.query
  );

  sendSuccess(
    res,
    { questions, total: questions.length },
    'Exam questions retrieved successfully',
    HTTP_STATUS.OK
  );
};

/**
 * Submit answer controller
 * POST /api/v1/user-exams/:id/answers
 *
 * @access Private (Owner only)
 */
export const submitAnswer = async (
  req: Request<SubmitAnswerParams, {}, SubmitAnswerInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;
  const { id: userExamId } = req.params;

  const result = await examSessionsService.submitAnswer(userExamId, userId, req.body);

  sendSuccess(
    res,
    result,
    result.message,
    HTTP_STATUS.OK
  );
};

/**
 * Submit exam controller
 * POST /api/v1/user-exams/:id/submit
 *
 * @access Private (Owner only)
 */
export const submitExam = async (
  req: Request<SubmitExamParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;
  const { id: userExamId } = req.params;

  const result = await examSessionsService.submitExam(userExamId, userId);

  sendSuccess(
    res,
    result,
    SUCCESS_MESSAGES.EXAM_SUBMITTED,
    HTTP_STATUS.OK
  );
};

/**
 * Get exam answers controller (review after submit)
 * GET /api/v1/user-exams/:id/answers
 *
 * @access Private (Owner only)
 */
export const getExamAnswers = async (
  req: Request<GetExamAnswersParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;
  const { id: userExamId } = req.params;

  const answers = await examSessionsService.getExamAnswers(userExamId, userId);

  sendSuccess(
    res,
    { answers, total: answers.length },
    'Exam answers retrieved successfully',
    HTTP_STATUS.OK
  );
};

/**
 * Get my results summary controller
 * GET /api/v1/results/me/summary
 *
 * @access Private (Authenticated users)
 */
export const getMyResultsSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;

  const summary = await examSessionsService.getMyResultsSummary(userId);

  sendSuccess(
    res,
    summary,
    'Results summary retrieved successfully',
    HTTP_STATUS.OK
  );
};

/**
 * Get my results controller
 * GET /api/v1/results/me
 *
 * @access Private (Authenticated users)
 */
export const getMyResults = async (
  req: Request<{}, {}, {}, GetMyResultsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;

  const result = await examSessionsService.getMyResults(userId, req.query);

  sendSuccess(
    res,
    result,
    'Results retrieved successfully',
    HTTP_STATUS.OK
  );
};

/**
 * Get all results controller
 * GET /api/v1/admin/results
 *
 * @access Private (Admin only)
 */
export const getResults = async (
  req: Request<{}, {}, {}, GetResultsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const result = await examSessionsService.getResults(req.query);

  sendSuccess(
    res,
    result,
    'Results retrieved successfully',
    HTTP_STATUS.OK
  );
};