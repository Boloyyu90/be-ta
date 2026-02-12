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
        global: '100 requests / 15 minutes (skips proctoring, answers, submit routes)',
        auth: '5 requests / 15 minutes (successful requests not counted)',
        refresh: '10 requests / 15 minutes',
        proctoring: '30 requests / 1 minute',
        answerSubmission: '100 requests / 1 minute',
        examSubmit: '10 requests / 5 minutes',
        transactions: '10 requests / 15 minutes (configurable via ENV)',
        webhook: '100 requests / 1 minute (configurable via ENV)',
      },
      routes: {
        public: [
          'POST /api/v1/auth/register',
          'POST /api/v1/auth/login',
          'POST /api/v1/auth/refresh',
          'POST /api/v1/auth/logout',
          'GET  /api/v1/questions/cpns-config',
          'POST /api/v1/transactions/webhook',
        ],
        participant: [
          // User Management
          'GET   /api/v1/me',
          'PATCH /api/v1/me',
          'GET   /api/v1/me/stats',
          // Exams
          'GET   /api/v1/exams',
          'GET   /api/v1/exams/:id',
          'POST  /api/v1/exams/:id/start',
          // Exam Sessions
          'GET   /api/v1/exam-sessions',
          'GET   /api/v1/exam-sessions/:id',
          'GET   /api/v1/exam-sessions/:id/questions',
          'POST  /api/v1/exam-sessions/:id/answers',
          'POST  /api/v1/exam-sessions/:id/submit',
          'GET   /api/v1/exam-sessions/:id/answers',
          // Results
          'GET   /api/v1/results',
          // Proctoring
          'POST  /api/v1/proctoring/events',
          'POST  /api/v1/proctoring/exam-sessions/:userExamId/analyze-face',
          'GET   /api/v1/proctoring/exam-sessions/:userExamId/events',
          // Transactions
          'GET   /api/v1/transactions/config/client-key',
          'GET   /api/v1/transactions/exam/:examId/access',
          'GET   /api/v1/transactions/order/:orderId',
          'POST  /api/v1/transactions',
          'GET   /api/v1/transactions',
          'GET   /api/v1/transactions/:id',
          'POST  /api/v1/transactions/:id/cancel',
          'POST  /api/v1/transactions/:id/sync',
        ],
        admin: [
          // User Management
          'POST   /api/v1/admin/users',
          'GET    /api/v1/admin/users',
          'GET    /api/v1/admin/users/:id',
          'PATCH  /api/v1/admin/users/:id',
          'DELETE /api/v1/admin/users/:id',
          // Exam Management
          'POST   /api/v1/admin/exams',
          'GET    /api/v1/admin/exams',
          'GET    /api/v1/admin/exams/:id',
          'PATCH  /api/v1/admin/exams/:id',
          'DELETE /api/v1/admin/exams/:id',
          'POST   /api/v1/admin/exams/:id/questions',
          'DELETE /api/v1/admin/exams/:id/questions',
          'GET    /api/v1/admin/exams/:id/questions',
          // Question Bank
          'POST   /api/v1/admin/questions',
          'GET    /api/v1/admin/questions',
          'GET    /api/v1/admin/questions/:id',
          'PATCH  /api/v1/admin/questions/:id',
          'DELETE /api/v1/admin/questions/:id',
          // Exam Sessions
          'GET    /api/v1/admin/exam-sessions',
          'GET    /api/v1/admin/exam-sessions/:id',
          'GET    /api/v1/admin/exam-sessions/:id/answers',
          // Results
          'GET    /api/v1/admin/results',
          // Proctoring
          'GET    /api/v1/admin/proctoring/events',
          'GET    /api/v1/admin/proctoring/exam-sessions/:userExamId/events',
          // Transactions
          'GET    /api/v1/admin/transactions',
          'GET    /api/v1/admin/transactions/stats',
          'POST   /api/v1/admin/transactions/cleanup',
          'GET    /api/v1/admin/transactions/:id',
        ],
      },
      statistics: {
        totalRoutes: 58,
        publicRoutes: 6,
        participantRoutes: 24,
        adminRoutes: 28,
      },
      tips: {
        testAuth: 'curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/v1/me',
        testAdmin: 'curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3001/api/v1/admin/users',
        viewHealth: 'http://localhost:3001/health',
      },
    });
  });
}