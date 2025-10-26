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
} from './exam-sessions.validation';

/**
 * Start exam controller
 * POST /api/v1/exams/:id/start
 *
 * @access Private (Participant)
 */
export const startExam = async (
  req: Request<StartExamParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: examId } = req.params;

    const result = await examSessionsService.startExam(userId, examId);

    sendSuccess(res, result, SUCCESS_MESSAGES.EXAM_STARTED, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Submit answer controller
 * POST /api/v1/user-exams/:id/answers
 *
 * @access Private (Participant - owner only)
 */
export const submitAnswer = async (
  req: Request<SubmitAnswerParams, {}, SubmitAnswerInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: userExamId } = req.params;

    const result = await examSessionsService.submitAnswer(userExamId, userId, req.body);

    sendSuccess(res, result, result.message, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Submit exam controller
 * POST /api/v1/user-exams/:id/submit
 *
 * @access Private (Participant - owner only)
 */
export const submitExam = async (
  req: Request<SubmitExamParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: userExamId } = req.params;

    const result = await examSessionsService.submitExam(userExamId, userId);

    sendSuccess(res, result, result.message, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user exam session controller
 * GET /api/v1/user-exams/:id
 *
 * @access Private (Participant - owner only)
 */
export const getUserExam = async (
  req: Request<GetUserExamParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: userExamId } = req.params;

    const userExam = await examSessionsService.getUserExam(userExamId, userId);

    sendSuccess(res, { userExam }, 'User exam retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get my results controller
 * GET /api/v1/results/me
 *
 * @access Private (Participant - own results only)
 */
export const getMyResults = async (
  req: Request<{}, {}, {}, GetMyResultsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const result = await examSessionsService.getMyResults(userId, req.query);

    sendSuccess(res, result, 'Results retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all results controller (admin)
 * GET /api/v1/admin/results
 *
 * @access Private (Admin only)
 */
export const getResults = async (
  req: Request<{}, {}, {}, GetResultsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await examSessionsService.getResults(req.query);

    sendSuccess(res, result, 'Results retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get exam questions controller
 * GET /api/v1/user-exams/:id/questions
 *
 * @access Private (Participant - owner only)
 */
export const getExamQuestions = async (
  req: Request<GetExamQuestionsParams, {}, {}, GetExamQuestionsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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
  } catch (error) {
    next(error);
  }
};

/**
 * Get exam answers controller (review after submit)
 * GET /api/v1/user-exams/:id/answers
 *
 * @access Private (Participant - owner only)
 */
export const getExamAnswers = async (
  req: Request<GetExamAnswersParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: userExamId } = req.params;

    const answers = await examSessionsService.getExamAnswers(userExamId, userId);

    sendSuccess(
      res,
      { answers, total: answers.length },
      'Exam answers retrieved successfully',
      HTTP_STATUS.OK
    );
  } catch (error) {
    next(error);
  }
};