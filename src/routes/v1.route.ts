import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';

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
// SELF-MANAGEMENT ROUTES - All authenticated users
// =================================================================
v1Router.use('/me', authenticate, usersRouter);
v1Router.use('/dashboard', authenticate, dashboardRouter);

// =================================================================
// PARTICIPANT ROUTES - Authenticated users (exam taking)
// Each router will check context and serve appropriate routes
// =================================================================
v1Router.use('/exams', authenticate, examsRouter);
v1Router.use('/user-exams', authenticate, examSessionsRouter);
v1Router.use('/results', authenticate, examSessionsRouter);
v1Router.use('/proctoring', authenticate, proctoringRouter);

// =================================================================
// ADMIN ROUTES - Admins only (full resource management)
// Same routers, different mounting path + authorization
// =================================================================
const adminRouter = Router();

// Apply admin authorization to ALL admin routes
adminRouter.use(authenticate, authorize(UserRole.ADMIN));

// Mount feature routers - they will serve admin-appropriate routes
adminRouter.use('/users', usersRouter);
adminRouter.use('/exams', examsRouter);
adminRouter.use('/questions', questionsRouter);
adminRouter.use('/results', examSessionsRouter);
adminRouter.use('/proctoring', proctoringRouter);

// Mount admin router with prefix
v1Router.use('/admin', adminRouter);

// =================================================================
// DEVELOPMENT ROUTE MAP
// =================================================================
if (process.env.NODE_ENV === 'development') {
  v1Router.get('/', (req, res) => {
    res.json({
      version: 'v1',
      baseUrl: '/api/v1',
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