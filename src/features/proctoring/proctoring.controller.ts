import { Request, Response, NextFunction } from 'express';
import * as proctoringService from './proctoring.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import type {
  LogEventInput,
  GetEventsParams,
  GetEventsQuery,
  AnalyzeFaceParams,
  AnalyzeFaceInput,
} from './proctoring.validation';

/**
 * Log proctoring event controller
 * POST /api/v1/proctoring/events
 *
 * @access Private (Authenticated users)
 */
export const logEvent = async (
  req: Request<{}, {}, LogEventInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const result = await proctoringService.logEvent(req.body);

  sendSuccess(
    res,
    result,
    'Event logged successfully',
    HTTP_STATUS.OK
  );
};

/**
 * Get proctoring events for user exam controller
 * GET /api/v1/proctoring/user-exams/:userExamId/events
 *
 * @access Private (Exam participant)
 */
export const getEvents = async (
  req: Request<GetEventsParams, {}, {}, GetEventsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userExamId } = req.params;
  const userId = req.user!.id;

  const result = await proctoringService.getEvents(userExamId, userId, req.query);

  sendSuccess(
    res,
    result,
    'Events retrieved successfully',
    HTTP_STATUS.OK
  );
};

/**
 * Get admin view of proctoring events controller
 * GET /api/v1/admin/proctoring/events
 *
 * @access Private (Admin only)
 */
export const getAdminEvents = async (
  req: Request<{}, {}, {}, GetEventsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const result = await proctoringService.getAdminEvents(req.query);

  sendSuccess(
    res,
    result,
    'Admin events retrieved successfully',
    HTTP_STATUS.OK
  );
};

/**
 * Analyze face detection controller
 * POST /api/v1/proctoring/user-exams/:userExamId/analyze-face
 *
 * @access Private (Exam participant)
 */
export const analyzeFace = async (
  req: Request<AnalyzeFaceParams, {}, AnalyzeFaceInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userExamId } = req.params;
  const userId = req.user!.id;
  const { imageBase64 } = req.body;

  const result = await proctoringService.analyzeFace(userExamId, userId, imageBase64);

  sendSuccess(
    res,
    result,
    'Face analysis completed',
    HTTP_STATUS.OK
  );
};