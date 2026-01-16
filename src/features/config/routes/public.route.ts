/**
 * Config Public Routes
 *
 * Public endpoints untuk configuration data.
 * Tidak memerlukan authentication.
 *
 * @module features/config/routes/public
 */

import { Router } from 'express';
import {
  CPNS_PASSING_GRADES,
  CPNS_TOTAL_PASSING_SCORE,
  CPNS_CATEGORIES,
} from '@/config/cpns.constants';

export const configRouter = Router();

/**
 * GET /api/v1/config/cpns
 * Get CPNS configuration (passing grades, categories)
 */
configRouter.get('/cpns', (req, res) => {
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
