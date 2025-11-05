import { Request, Response, NextFunction } from 'express';
import * as dashboardService from './dashboard.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '@/config/constants';

/**
 * Get dashboard overview controller
 * GET /api/v1/dashboard/overview
 *
 * @access Private (All authenticated users)
 */
export const getDashboardOverview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  const overview = await dashboardService.getDashboardOverview(userId, userRole);

  sendSuccess(
    res,
    overview,
    SUCCESS_MESSAGES.DASHBOARD_RETRIEVED,
    HTTP_STATUS.OK
  );
};