import { Router } from 'express';
import { authenticate } from '@/shared/middleware/auth.middleware';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as dashboardController from './dashboard.controller';
import * as dashboardValidation from './dashboard.validation';

export const dashboardRouter = Router();

/**
 * @route   GET /api/v1/dashboard/overview
 * @desc    Get dashboard overview (user profile, upcoming exams, active sessions, recent results, summary)
 * @access  Private (All authenticated users)
 */
dashboardRouter.get(
  '/overview',
  authenticate,
  validate(dashboardValidation.getDashboardOverviewSchema),
  asyncHandler(dashboardController.getDashboardOverview)
);