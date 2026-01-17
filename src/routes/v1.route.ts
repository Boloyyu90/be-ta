/**
 * API v1 Router
 *
 * Main router yang mengorganisir routes berdasarkan role (public, participant, admin).
 * Pattern: Role-based route separation dengan centralized authorization.
 *
 * @module routes/v1
 */

import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';

// Import routers by role
import { authRouter } from '@/features/auth/routes/participant.route';
import { selfRouter } from '@/features/users/routes/participant.route';
import { participantExamsRouter } from '@/features/exams/routes/participant.route';
import { participantExamSessionsRouter } from '@/features/exam-sessions/routes/participant.route';
import { participantResultsRouter } from '@/features/exam-sessions/routes/participant-results.route';
import { participantProctoringRouter } from '@/features/proctoring/routes/participant.route';
import { adminUsersRouter } from '@/features/users/routes/admin.route';
import { adminExamsRouter } from '@/features/exams/routes/admin.route';
import { adminExamSessionsRouter } from '@/features/exam-sessions/routes/admin.route';
import { adminResultsRouter } from '@/features/exam-sessions/routes/admin-results.route';
import { adminQuestionsRouter } from '@/features/questions/routes/admin.route';
import { adminProctoringRouter } from '@/features/proctoring/routes/admin.route';
import { publicQuestionsRouter } from '@/features/questions/routes/public.route';
import { participantTransactionsRouter } from '@/features/transactions/routes/participant.route';
import { publicTransactionsRouter } from '@/features/transactions/routes/public.route';
import { adminTransactionsRouter } from '@/features/transactions/routes/admin.route';

export const v1Router = Router();

// ==================== PUBLIC ROUTES ====================
// No authentication required

/**
 * Authentication routes (/auth)
 * Register, login, refresh token, logout
 */
v1Router.use('/auth', authRouter);

/**
 * Questions public routes (/questions)
 * Public configuration endpoints (CPNS passing grades, etc.)
 */
v1Router.use('/questions', publicQuestionsRouter);

/**
 * Transaction webhook routes (/transactions/webhook)
 * Midtrans payment notification - must be public for Midtrans to call
 */
v1Router.use('/transactions', publicTransactionsRouter);

// ==================== PARTICIPANT ROUTES ====================
// All authenticated users (authenticate middleware)

/**
 * Self-management routes (/me)
 * Get dan update profile sendiri
 */
v1Router.use('/me', authenticate, selfRouter);

/**
 * Exam browsing routes (/exams)
 * List, view details, dan start exam
 */
v1Router.use('/exams', authenticate, participantExamsRouter);

/**
 * Exam session management (/exam-sessions)
 * Submit answers, submit exam, review results
 */
v1Router.use('/exam-sessions', authenticate, participantExamSessionsRouter);

/**
 * Results viewing (/results)
 * View own exam results
 */
v1Router.use('/results', authenticate, participantResultsRouter);

/**
 * Proctoring routes (/proctoring)
 * Log events, analyze face, view own events
 */
v1Router.use('/proctoring', authenticate, participantProctoringRouter);

/**
 * Transaction routes (/transactions)
 * Create payment, check access, view history
 */
v1Router.use('/transactions', authenticate, participantTransactionsRouter);

// ==================== ADMIN ROUTES ====================
// Admin only (authenticate + authorize(ADMIN))

const adminRouter = Router();

// Apply authorization globally untuk semua admin routes
adminRouter.use(authenticate, authorize(UserRole.ADMIN));

/**
 * User management (/admin/users)
 * CRUD users
 */
adminRouter.use('/users', adminUsersRouter);

/**
 * Exam management (/admin/exams)
 * CRUD exams, attach/detach questions
 */
adminRouter.use('/exams', adminExamsRouter);

/**
 * Exam session monitoring (/admin/exam-sessions)
 * View all sessions dan answers
 */
adminRouter.use('/exam-sessions', adminExamSessionsRouter);

/**
 * Results monitoring (/admin/results)
 * View all results dengan filters
 */
adminRouter.use('/results', adminResultsRouter);

/**
 * Question bank management (/admin/questions)
 * CRUD questions
 */
adminRouter.use('/questions', adminQuestionsRouter);

/**
 * Proctoring monitoring (/admin/proctoring)
 * View all proctoring events
 */
adminRouter.use('/proctoring', adminProctoringRouter);

/**
 * Transaction management (/admin/transactions)
 * View all transactions
 */
adminRouter.use('/transactions', adminTransactionsRouter);

// Mount admin router
v1Router.use('/admin', adminRouter);

// ==================== DEVELOPMENT UTILITIES ====================

/**
 * Route map endpoint (development only).
 * Returns comprehensive API information untuk debugging.
 */
if (process.env.NODE_ENV === 'development') {
  v1Router.get('/', (req, res) => {
    res.json({
      version: 'v1',
      baseUrl: '/api/v1',
      environment: process.env.NODE_ENV,
      architecture: {
        pattern: 'Role-based route separation',
        structure: 'features/[name]/routes/{participant|admin}.route.ts',
      },
      security: {
        public: 'No authentication required',
        participant: 'authenticate middleware',
        admin: 'authenticate + authorize(ADMIN) middleware',
      },
      rateLimits: {
        global: '100 requests / 15 minutes',
        auth: '5 requests / 15 minutes',
        proctoring: '30 requests / 1 minute',
        refresh: '10 requests / 15 minutes',
      },
      routes: {
        public: [
          'POST /api/v1/auth/register',
          'POST /api/v1/auth/login',
          'POST /api/v1/auth/refresh',
          'POST /api/v1/auth/logout',
        ],
        participant: [
          'GET /api/v1/me',
          'PATCH /api/v1/me',
          'GET /api/v1/me/stats',
          'GET /api/v1/exams',
          'GET /api/v1/exams/:id',
          'POST /api/v1/exams/:id/start',
          'GET /api/v1/exam-sessions',
          'GET /api/v1/exam-sessions/:id',
          'GET /api/v1/exam-sessions/:id/questions',
          'POST /api/v1/exam-sessions/:id/answers',
          'POST /api/v1/exam-sessions/:id/submit',
          'GET /api/v1/exam-sessions/:id/answers',
          'GET /api/v1/results',
          'POST /api/v1/proctoring/events',
          'POST /api/v1/proctoring/exam-sessions/:id/analyze-face',
          'GET /api/v1/proctoring/exam-sessions/:id/events',
        ],
        admin: [
          'POST /api/v1/admin/users',
          'GET /api/v1/admin/users',
          'GET /api/v1/admin/users/:id',
          'PATCH /api/v1/admin/users/:id',
          'DELETE /api/v1/admin/users/:id',
          'POST /api/v1/admin/exams',
          'GET /api/v1/admin/exams',
          'GET /api/v1/admin/exams/:id',
          'PATCH /api/v1/admin/exams/:id',
          'DELETE /api/v1/admin/exams/:id',
          'POST /api/v1/admin/exams/:id/questions',
          'DELETE /api/v1/admin/exams/:id/questions',
          'GET /api/v1/admin/exams/:id/questions',
          'POST /api/v1/admin/questions',
          'GET /api/v1/admin/questions',
          'GET /api/v1/admin/questions/:id',
          'PATCH /api/v1/admin/questions/:id',
          'DELETE /api/v1/admin/questions/:id',
          'GET /api/v1/admin/exam-sessions',
          'GET /api/v1/admin/exam-sessions/:id',
          'GET /api/v1/admin/exam-sessions/:id/answers',
          'GET /api/v1/admin/results',
          'GET /api/v1/admin/proctoring/events',
          'GET /api/v1/admin/proctoring/exam-sessions/:id/events',
        ],
      },
      statistics: {
        totalRoutes: 44,
        publicRoutes: 4,
        participantRoutes: 16,
        adminRoutes: 24,
      },
      tips: {
        testAuth: 'curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/me',
        testAdmin: 'curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/v1/admin/users',
        viewHealth: 'http://localhost:3000/health',
      },
    });
  });
}