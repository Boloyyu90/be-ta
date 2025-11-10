import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';

// =================================================================
// IMPORT ROUTERS
// =================================================================

// Public routes
import { authRouter } from '@/features/auth/routes/participant.route';

// Participant routes
import { selfRouter } from '@/features/users/routes/participant.route';
import { participantDashboardRouter } from '@/features/dashboard/routes/participant.route';
import { participantExamsRouter } from '@/features/exams/routes/participant.route';
import { participantExamSessionsRouter } from '@/features/exam-sessions/routes/participant.route';
import { participantResultsRouter } from '@/features/exam-sessions/routes/participant-results.route';
import { participantProctoringRouter } from '@/features/proctoring/routes/participant.route';

// Admin routes
import { adminUsersRouter } from '@/features/users/routes/admin.route';
import { adminExamsRouter } from '@/features/exams/routes/admin.route';
import { adminExamSessionsRouter } from '@/features/exam-sessions/routes/admin.route';
import { adminResultsRouter } from '@/features/exam-sessions/routes/admin-results.route';
import { adminQuestionsRouter } from '@/features/questions/routes/admin.route';
import { adminProctoringRouter } from '@/features/proctoring/routes/admin.route';

export const v1Router = Router();

// =================================================================
// 🌐 PUBLIC ROUTES
// No authentication required
// =================================================================

/**
 * Authentication routes
 * Base: /api/v1/auth
 *
 * Routes:
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/refresh
 * - POST /api/v1/auth/logout
 */
v1Router.use('/auth', authRouter);

// =================================================================
// 👤 PARTICIPANT ROUTES
// Authorization: authenticate middleware (all authenticated users)
// =================================================================

/**
 * Self-management routes
 * Base: /api/v1/me
 *
 * Routes:
 * - GET /api/v1/me (get profile)
 * - PATCH /api/v1/me (update profile)
 */
v1Router.use('/me', authenticate, selfRouter);

/**
 * Dashboard routes
 * Base: /api/v1/dashboard
 *
 * Routes:
 * - GET /api/v1/dashboard (overview with stats)
 */
v1Router.use('/dashboard', authenticate, participantDashboardRouter);

/**
 * Exam browsing routes
 * Base: /api/v1/exams
 *
 * Routes:
 * - GET /api/v1/exams (list published exams)
 * - GET /api/v1/exams/:id (view exam details)
 * - POST /api/v1/exams/:id/start (start exam session)
 */
v1Router.use('/exams', authenticate, participantExamsRouter);

/**
 * Exam session management routes
 * Base: /api/v1/exam-sessions
 *
 * Routes:
 * - GET /api/v1/exam-sessions (my sessions)
 * - GET /api/v1/exam-sessions/:id (session details)
 * - GET /api/v1/exam-sessions/:id/questions (get questions)
 * - POST /api/v1/exam-sessions/:id/answers (submit answer)
 * - POST /api/v1/exam-sessions/:id/submit (submit exam)
 * - GET /api/v1/exam-sessions/:id/answers (review after submit)
 */
v1Router.use('/exam-sessions', authenticate, participantExamSessionsRouter);

/**
 * Results viewing routes
 * Base: /api/v1/results
 *
 * Routes:
 * - GET /api/v1/results (my results list)
 */
v1Router.use('/results', authenticate, participantResultsRouter);

/**
 * Proctoring routes
 * Base: /api/v1/proctoring
 * Rate Limited: 30 requests/minute (proctoringLimiter)
 *
 * Routes:
 * - POST /api/v1/proctoring/events (log event)
 * - POST /api/v1/proctoring/exam-sessions/:id/analyze-face (face analysis)
 * - GET /api/v1/proctoring/exam-sessions/:id/events (my events)
 */
v1Router.use('/proctoring', authenticate, participantProctoringRouter);

// =================================================================
// 🔒 ADMIN ROUTES
// Authorization: authenticate + authorize(ADMIN)
// All routes under /admin require ADMIN role
// =================================================================

const adminRouter = Router();

// 🔐 GLOBAL AUTHORIZATION FOR ALL ADMIN ROUTES
// Applied once here, inherited by all child routers
adminRouter.use(authenticate, authorize(UserRole.ADMIN));

/**
 * User management routes
 * Base: /api/v1/admin/users
 *
 * Routes:
 * - POST /api/v1/admin/users (create user)
 * - GET /api/v1/admin/users (list users)
 * - GET /api/v1/admin/users/:id (get user details)
 * - GET /api/v1/admin/users/:id/stats (user statistics)
 * - PATCH /api/v1/admin/users/:id (update user)
 * - DELETE /api/v1/admin/users/:id (delete user)
 */
adminRouter.use('/users', adminUsersRouter);

/**
 * Exam management routes
 * Base: /api/v1/admin/exams
 *
 * Routes:
 * - POST /api/v1/admin/exams (create exam)
 * - GET /api/v1/admin/exams (list all exams)
 * - GET /api/v1/admin/exams/:id (get exam details)
 * - PATCH /api/v1/admin/exams/:id (update exam)
 * - DELETE /api/v1/admin/exams/:id (delete exam)
 * - GET /api/v1/admin/exams/:id/stats (exam statistics)
 * - POST /api/v1/admin/exams/:id/questions (attach questions)
 * - DELETE /api/v1/admin/exams/:id/questions (detach questions)
 * - GET /api/v1/admin/exams/:id/questions (get questions with answers)
 */
adminRouter.use('/exams', adminExamsRouter);

/**
 * Exam session monitoring routes
 * Base: /api/v1/admin/exam-sessions
 *
 * Routes:
 * - GET /api/v1/admin/exam-sessions (all sessions)
 * - GET /api/v1/admin/exam-sessions/:id (session details)
 * - GET /api/v1/admin/exam-sessions/:id/answers (review answers)
 */
adminRouter.use('/exam-sessions', adminExamSessionsRouter);

/**
 * Results monitoring routes
 * Base: /api/v1/admin/results
 *
 * Routes:
 * - GET /api/v1/admin/results (all results with filters)
 */
adminRouter.use('/results', adminResultsRouter);

/**
 * Question bank management routes
 * Base: /api/v1/admin/questions
 *
 * Routes:
 * - POST /api/v1/admin/questions (create question)
 * - POST /api/v1/admin/questions/bulk (bulk create)
 * - GET /api/v1/admin/questions (list questions)
 * - GET /api/v1/admin/questions/:id (get question)
 * - PATCH /api/v1/admin/questions/:id (update question)
 * - DELETE /api/v1/admin/questions/:id (delete question)
 */
adminRouter.use('/questions', adminQuestionsRouter);

/**
 * Proctoring monitoring routes
 * Base: /api/v1/admin/proctoring
 *
 * Routes:
 * - GET /api/v1/admin/proctoring/events (all events)
 * - GET /api/v1/admin/proctoring/exam-sessions/:id/events (session events)
 */
adminRouter.use('/proctoring', adminProctoringRouter);

// Mount admin router
v1Router.use('/admin', adminRouter);

// =================================================================
// 🛠️ DEVELOPMENT UTILITIES
// Only available in development mode
// =================================================================

if (process.env.NODE_ENV === 'development') {
  /**
   * Route map endpoint
   * GET /api/v1
   *
   * Returns comprehensive route information for development
   */
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
          // Self-management
          'GET /api/v1/me',
          'PATCH /api/v1/me',

          // Dashboard
          'GET /api/v1/dashboard',

          // Exams
          'GET /api/v1/exams',
          'GET /api/v1/exams/:id',
          'POST /api/v1/exams/:id/start',

          // Exam Sessions
          'GET /api/v1/exam-sessions',
          'GET /api/v1/exam-sessions/:id',
          'GET /api/v1/exam-sessions/:id/questions',
          'POST /api/v1/exam-sessions/:id/answers',
          'POST /api/v1/exam-sessions/:id/submit',
          'GET /api/v1/exam-sessions/:id/answers',

          // Results
          'GET /api/v1/results/summary',
          'GET /api/v1/results',

          // Proctoring
          'POST /api/v1/proctoring/events',
          'POST /api/v1/proctoring/exam-sessions/:id/analyze-face',
          'GET /api/v1/proctoring/exam-sessions/:id/events',
        ],
        admin: [
          // Users
          'POST /api/v1/admin/users',
          'GET /api/v1/admin/users',
          'GET /api/v1/admin/users/:id',
          'GET /api/v1/admin/users/:id/stats',
          'PATCH /api/v1/admin/users/:id',
          'DELETE /api/v1/admin/users/:id',

          // Exams
          'POST /api/v1/admin/exams',
          'GET /api/v1/admin/exams',
          'GET /api/v1/admin/exams/:id',
          'PATCH /api/v1/admin/exams/:id',
          'DELETE /api/v1/admin/exams/:id',
          'GET /api/v1/admin/exams/:id/stats',
          'POST /api/v1/admin/exams/:id/questions',
          'DELETE /api/v1/admin/exams/:id/questions',
          'GET /api/v1/admin/exams/:id/questions',

          // Questions
          'POST /api/v1/admin/questions',
          'POST /api/v1/admin/questions/bulk',
          'GET /api/v1/admin/questions',
          'GET /api/v1/admin/questions/:id',
          'PATCH /api/v1/admin/questions/:id',
          'DELETE /api/v1/admin/questions/:id',

          // Sessions & Results
          'GET /api/v1/admin/exam-sessions',
          'GET /api/v1/admin/exam-sessions/:id',
          'GET /api/v1/admin/exam-sessions/:id/answers',
          'GET /api/v1/admin/results',

          // Proctoring
          'GET /api/v1/admin/proctoring/events',
          'GET /api/v1/admin/proctoring/exam-sessions/:id/events',
        ],
      },
      statistics: {
        totalRoutes: 4 + 19 + 27, // public + participant + admin
        publicRoutes: 4,
        participantRoutes: 19,
        adminRoutes: 27,
      },
      documentation: {
        routingGuide: 'See docs/ROUTING_GUIDE.md',
        postman: 'Import collection from docs/postman/',
      },
      tips: {
        testAuth: 'curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/me',
        testAdmin: 'curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/v1/admin/users',
        viewHealth: 'http://localhost:3000/health',
      },
    });
  });
}