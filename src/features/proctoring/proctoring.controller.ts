import { Request, Response, NextFunction } from 'express';
import * as proctoringService from './proctoring.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import type {
  LogEventInput,
  LogEventsBatchInput,
  GetEventsParams,
  GetEventsQuery,
  GetStatsParams,
  GetAdminEventsQuery,
  DetectFaceInput,
} from './proctoring.validation';

/**
 * Log single proctoring event
 * POST /api/v1/proctoring/events
 *
 * @access Private (Participant - own events only)
 */
export const logEvent = async (
  req: Request<{}, {}, LogEventInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await proctoringService.logEvent(req.body);

    sendSuccess(res, result, 'Event logged successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Log multiple proctoring events (batch)
 * POST /api/v1/proctoring/events/batch
 *
 * @access Private (Participant - own events only)
 */
export const logEventsBatch = async (
  req: Request<{}, {}, LogEventsBatchInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await proctoringService.logEventsBatch(req.body);

    sendSuccess(res, result, result.message, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get proctoring events for user exam
 * GET /api/v1/proctoring/user-exams/:id/events
 *
 * @access Private (Participant - own events only)
 */
export const getEvents = async (
  req: Request<GetEventsParams, {}, {}, GetEventsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: userExamId } = req.params;

    const result = await proctoringService.getEvents(userExamId, userId, req.query);

    sendSuccess(res, result, 'Events retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get proctoring statistics for user exam
 * GET /api/v1/proctoring/user-exams/:id/stats
 *
 * @access Private (Participant - own stats only)
 */
export const getStats = async (
  req: Request<GetStatsParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id: userExamId } = req.params;

    const stats = await proctoringService.getStats(userExamId, userId);

    sendSuccess(res, stats, 'Statistics retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all proctoring events (admin)
 * GET /api/v1/admin/proctoring/events
 *
 * @access Private (Admin only)
 */
export const getAdminEvents = async (
  req: Request<{}, {}, {}, GetAdminEventsQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await proctoringService.getAdminEvents(req.query);

    sendSuccess(res, result, 'Events retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Detect face from image (ML integration endpoint)
 * POST /api/v1/proctoring/detect-face
 *
 * @access Private (Participant - own exam only)
 */
export const detectFace = async (
  req: Request<{}, {}, DetectFaceInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const result = await proctoringService.detectFace(req.body, userId);

    sendSuccess(res, result, 'Face detection completed', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};