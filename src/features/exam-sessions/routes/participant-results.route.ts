import { Router } from 'express';
import { validate } from '@/shared/middleware/validate.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examSessionsController from '../exam-sessions.controller';
import * as examSessionsValidation from '../exam-sessions.validation';

export const participantResultsRouter = Router();

// =================================================================
// RESULTS VIEWING ROUTES (OWN RESULTS)
// Mounted at: /api/v1/results
// Authorization: Authenticated users (enforced at parent router)
// =================================================================
/**
 * @route   GET /api/v1/results
 * @desc    Get my exam results with pagination
 * @access  Authenticated users
 */
participantResultsRouter.get(
  '/',
  validate(examSessionsValidation.getMyResultsSchema),
  asyncHandler(examSessionsController.getMyResults)
);