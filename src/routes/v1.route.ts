import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';

// =================================================================
// IMPORT ROUTERS
// =================================================================

// Public routes
import { authRouter } from '@/features/auth/routes/participant.route';

// Participant routes
import { selfRouter } from '@/features/users/routes/self.route';
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
// PUBLIC ROUTES - No authentication required
// =================================================================

/**
 * Authentication routes
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/refresh
 * - POST /api/v1/auth/logout
 */
v1Router.use('/auth', authRouter);

// =================================================================
// PARTICIPANT ROUTES - Authenticated users only
// Authorization: authenticate middleware
// =================================================================

/**
 * Self-management routes
 * - GET /api/v1/me (get profile)
 * - PATCH /api/v1/me (update profile)
 */
v1Router.use('/me', authenticate, selfRouter);

/**
 * Dashboard routes
 * - GET /api/v1/dashboard (overview with stats)
 */
v1Router.use('/dashboard', authenticate, participantDashboardRouter);

/**
 * Exam browsing routes
 * - GET /api/v1/exams (list published exams)
 * - GET /api/v1/exams/:id (view exam details)
 * - POST /api/v1/exams/:id/start (start exam session)
 */
v1Router.use('/exams', authenticate, participantExamsRouter);

/**
 * Exam session routes
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
 * - GET /api/v1/results/summary (my statistics)
 * - GET /api/v1/results (my results list)
 */
v1Router.use('/results', authenticate, participantResultsRouter);

/**
 * Proctoring routes
 * - POST /api/v1/proctoring/events (log event)
 * - POST /api/v1/proctoring/exam-sessions/:id/analyze-face (face analysis)
 * - GET /api/v1/proctoring/exam-sessions/:id/events (my events)
 */
v1Router.use('/proctoring', authenticate, participantProctoringRouter);

// =================================================================
// ADMIN ROUTES - Admin only
// Authorization: authenticate + authorize(ADMIN) at router level
// =================================================================

const adminRouter = Router();

// 🔒 GLOBAL AUTHORIZATION FOR ALL ADMIN ROUTES
// Applied once here, not repeated in child routers
adminRouter.use(authenticate, authorize(UserRole.ADMIN));

/**
 * User management routes
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
 * - POST /api/v1/admin/exams (create exam)
 * - GET /api/v1/admin/exams (list all exams)
 * - GET /api/v1/admin/exams/:id (get exam details)
 * - PATCH /api/v1/admin/exams/:id (update exam)
 * - DELETE /api/v1/admin/exams/:id (delete exam)
 * - POST /api/v1/admin/exams/:id/clone (clone exam)
 * - GET /api/v1/admin/exams/:id/stats (exam statistics)
 * - POST /api/v1/admin/exams/:id/questions (attach questions)
 * - DELETE /api/v1/admin/exams/:id/questions (detach questions)
 * - PATCH /api/v1/admin/exams/:id/questions/reorder (reorder questions)
 */
adminRouter.use('/exams', adminExamsRouter);

/**
 * Exam session monitoring routes
 * - GET /api/v1/admin/exam-sessions (all sessions)
 * - GET /api/v1/admin/exam-sessions/:id (session details)
 * - GET /api/v1/admin/exam-sessions/:id/answers (review answers)
 */
adminRouter.use('/exam-sessions', adminExamSessionsRouter);

/**
 * Results monitoring routes
 * - GET /api/v1/admin/results (all results with filters)
 */
adminRouter.use('/results', adminResultsRouter);

/**
 * Question bank management routes
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
 * - GET /api/v1/admin/proctoring/events (all events)
 * - GET /api/v1/admin/proctoring/exam-sessions/:id/events (session events)
 */
adminRouter.use('/proctoring', adminProctoringRouter);

// Mount admin router
v1Router.use('/admin', adminRouter);

// =================================================================
// DEVELOPMENT ROUTE MAP
// =================================================================
if (process.env.NODE_ENV === 'development') {
  v1Router.get('/', (req, res) => {
    res.json({
      version: 'v1',
      baseUrl: '/api/v1',
      architecture: 'Role-based route separation',
      security: {
        participant: 'authenticate middleware',
        admin: 'authenticate + authorize(ADMIN) middleware',
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
          'GET /api/v1/dashboard',
          'GET /api/v1/exams',
          'GET /api/v1/exams/:id',
          'POST /api/v1/exams/:id/start',
          'GET /api/v1/exam-sessions',
          'POST /api/v1/exam-sessions/:id/answers',
          'POST /api/v1/exam-sessions/:id/submit',
          'GET /api/v1/results',
          'POST /api/v1/proctoring/events',
        ],
        admin: [
          'GET /api/v1/admin/users',
          'POST /api/v1/admin/users',
          'GET /api/v1/admin/exams',
          'POST /api/v1/admin/exams',
          'GET /api/v1/admin/questions',
          'POST /api/v1/admin/questions',
          'GET /api/v1/admin/results',
          'GET /api/v1/admin/proctoring/events',
        ],
      },
    });
  });
}