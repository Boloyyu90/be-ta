/**
 * Questions Public Routes
 *
 * Public endpoints untuk question-related configuration.
 * Tidak memerlukan authentication.
 *
 * @module features/questions/routes/public
 */

import { Router } from 'express';
import {
  CPNS_PASSING_GRADES,
  CPNS_TOTAL_PASSING_SCORE,
  CPNS_CATEGORIES,
} from '@/config/cpns.constants';

export const publicQuestionsRouter = Router();

/**
 * GET /api/v1/questions/cpns-config
 * Get CPNS configuration (passing grades, categories)
 */
publicQuestionsRouter.get('/cpns-config', (req, res) => {
  res.json({
    success: true,
    data: {
      passingGrades: CPNS_PASSING_GRADES,
      totalPassingScore: CPNS_TOTAL_PASSING_SCORE,
      categories: CPNS_CATEGORIES,
    },
    message: 'CPNS configuration retrieved successfully',
    timestamp: new Date().toISOString(),
  });
});
