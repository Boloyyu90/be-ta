import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as dashboardController from './dashboard.controller';
import * as dashboardValidation from './dashboard.validation';

export const dashboardRouter = Router();

// =================================================================
// MOUNTING CONTEXT:
// 1. /api/v1/dashboard    → Dashboard (authenticated users)
//
// Authorization is applied at router mounting level in v1.route.ts
// =================================================================

/**
 * @route   GET /api/v1/dashboard/overview
 * @desc    Get dashboard overview
 * @access  Private (All authenticated users)
 */
dashboardRouter.get(
  '/overview',
  validate(dashboardValidation.getDashboardOverviewSchema),
  asyncHandler(dashboardController.getDashboardOverview)
);