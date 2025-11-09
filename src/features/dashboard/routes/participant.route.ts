import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as dashboardController from '../dashboard.controller';
import * as dashboardValidation from '../dashboard.validation';

export const participantDashboardRouter = Router();

// =================================================================
// DASHBOARD ROUTES
// Mounted at: /api/v1/dashboard
// Authorization: Authenticated users (enforced at parent router)
// =================================================================

/**
 * @route   GET /api/v1/dashboard
 * @desc    Get dashboard overview (upcoming exams, active sessions, recent results)
 * @access  Authenticated users
 */
participantDashboardRouter.get(
  '/',
  validate(dashboardValidation.getDashboardOverviewSchema),
  asyncHandler(dashboardController.getDashboardOverview)
);