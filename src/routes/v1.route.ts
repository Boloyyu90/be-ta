import { Router } from 'express';
import { authenticate, authorize } from '@/shared/middleware/auth.middleware';
import { UserRole } from '@prisma/client';

// Import feature routes
import { authRouter } from '@/features/auth/auth.route';
import { usersRouter } from '@/features/users/users.route';
import { examsRouter } from '@/features/exams/exams.route';
import { questionsRouter } from '@/features/questions/questions.route';
import { examSessionsRouter } from '@/features/exam-sessions/exam-sessions.route';
import { dashboardRouter } from '@/features/dashboard/dashboard.route';
import { proctoringRouter } from '@/features/proctoring/proctoring.route';

export const v1Router = Router();

// ==================== PUBLIC ROUTES ====================
v1Router.use('/auth', authRouter);

// ==================== AUTHENTICATED ROUTES ====================
v1Router.use('/dashboard', dashboardRouter);
v1Router.use('/users', usersRouter);

// ==================== PARTICIPANT ROUTES ====================
v1Router.use('/exams', examsRouter);
v1Router.use('/', examSessionsRouter); // mounts /user-exams, /results
v1Router.use('/proctoring', proctoringRouter);

// ==================== ADMIN ROUTES ====================
// Admin routes with /admin prefix
v1Router.use('/admin/questions', authenticate, authorize(UserRole.ADMIN), questionsRouter);

// Route list endpoint (for debugging/documentation)
if (process.env.NODE_ENV === 'development') {
  v1Router.get('/', (req, res) => {
    res.json({
      version: 'v1',
      environment: process.env.NODE_ENV,
      message: 'Visit individual routes for full API documentation',
      routes: {
        public: ['/auth/*'],
        authenticated: ['/dashboard/*', '/users/me'],
        participant: ['/exams/*', '/user-exams/*', '/results/me', '/proctoring/*'],
        admin: [
          '/admin/users/*',
          '/admin/exams/*',
          '/admin/questions/*',
          '/admin/results',
          '/admin/proctoring/*',
        ],
      },
    });
  });
}