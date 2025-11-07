import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';
import { asyncHandler } from '@/shared/utils/route-handler';
import * as examSessionsController from '@/features/exam-sessions/exam-sessions.controller';

// Import feature routes
import { authRouter } from '@/features/auth/auth.route';
import { usersRouter } from '@/features/users/users.route';
import { examsRouter } from '@/features/exams/exams.route';
import { questionsRouter } from '@/features/questions/questions.route';
import { examSessionsRouter } from '@/features/exam-sessions/exam-sessions.route';
import { dashboardRouter } from '@/features/dashboard/dashboard.route';
import { proctoringRouter } from '@/features/proctoring/proctoring.route';

export const v1Router = Router();

// =================================================================
// PUBLIC ROUTES - No authentication
// =================================================================
v1Router.use('/auth', authRouter);

// =================================================================
// PARTICIPANT ROUTES - Authenticated users
// Context: participant (no /admin in baseUrl)
// =================================================================

// Self-management
v1Router.use('/me', authenticate, usersRouter);
v1Router.use('/dashboard', authenticate, dashboardRouter);

// Exam browsing & taking
v1Router.use('/exams', authenticate, examsRouter);
v1Router.use('/user-exams', authenticate, examSessionsRouter);

// Results viewing (participant)
v1Router.use('/results', authenticate, examSessionsRouter);

// Proctoring events
v1Router.use('/proctoring', authenticate, proctoringRouter);

// =================================================================
// ADMIN ROUTES - Admin only
// Context: admin (/admin in baseUrl)
// Authorization applied once at router level
// =================================================================
const adminRouter = Router();

// ✅ Global authorization for ALL admin routes
  adminRouter.use(authenticate, authorize(UserRole.ADMIN));

// User management (admin)
  adminRouter.use('/users', usersRouter);

// Exam management (admin)
  adminRouter.use('/exams', examsRouter);

// Question bank
  adminRouter.use('/questions', questionsRouter);

// Results monitoring (admin)
  adminRouter.use('/results', examSessionsRouter);

// Proctoring monitoring (admin)
  adminRouter.use('/proctoring', proctoringRouter);

  v1Router.use('/admin', adminRouter);

// =================================================================
// DEVELOPMENT ROUTE MAP
// =================================================================
if (process.env.NODE_ENV === 'development') {
  v1Router.get('/', (req, res) => {
    res.json({
      version: 'v1',
      baseUrl: '/api/v1',
      mountingStrategy: {
        participant: {
          prefix: '/api/v1',
          routes: ['/exams', '/user-exams', '/results', '/proctoring', '/me'],
        },
        admin: {
          prefix: '/api/v1/admin',
          routes: ['/users', '/exams', '/questions', '/results', '/proctoring'],
        },
      },
      routes: {
        public: ['POST /auth/register', 'POST /auth/login', 'POST /auth/refresh', 'POST /auth/logout'],
        user: ['GET /me', 'PATCH /me', 'GET /dashboard/overview'],
        participant: [
          'GET /exams',
          'GET /exams/:id',
          'GET /user-exams',
          'POST /user-exams/:id/answers',
          'POST /user-exams/:id/submit',
          'GET /results/me',
          'POST /proctoring/events',
        ],
        admin: [
          'GET /admin/users',
          'POST /admin/users',
          'GET /admin/users/:id',
          'PATCH /admin/users/:id',
          'DELETE /admin/users/:id',
          'GET /admin/exams',
          'POST /admin/exams',
          'PATCH /admin/exams/:id',
          'DELETE /admin/exams/:id',
          'GET /admin/questions',
          'POST /admin/questions',
          'GET /admin/results',
          'GET /admin/proctoring/events',
        ],
      },
    });
  });
}