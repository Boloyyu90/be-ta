import { Request, Response, NextFunction } from 'express';
import * as dashboardService from './dashboard.service';
import { sendSuccess } from '@/shared/utils/response';
import { HTTP_STATUS } from '@/config/constants';

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
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const overview = await dashboardService.getDashboardOverview(userId, userRole);

    sendSuccess(res, overview, 'Dashboard overview retrieved successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};