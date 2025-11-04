import { Router } from 'express';

// Import feature routes
import { authRouter } from '@/features/auth/auth.route';
import { usersRouter } from '@/features/users/users.route';
import { examsRouter } from '@/features/exams/exams.route';
import { questionsRouter } from '@/features/questions/questions.route';
import { examSessionsRouter } from '@/features/exam-sessions/exam-sessions.route';
import { dashboardRouter } from '@/features/dashboard/dashboard.route';
import { proctoringRouter } from '@/features/proctoring/proctoring.route';

export const v1Router = Router();

// Mount feature routes
v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);

// Mount exam routes
// Note: examsRouter already contains both /admin/exams and /exams paths
v1Router.use('/', examsRouter);
v1Router.use('/', questionsRouter);
v1Router.use('/', examSessionsRouter);
v1Router.use('/dashboard', dashboardRouter);

// Mount proctoring routes
// Note: proctoringRouter contains both /proctoring and /admin/proctoring paths
v1Router.use('/', proctoringRouter);

// Route list endpoint (for debugging/documentation)
if (process.env.NODE_ENV === 'development') {
  v1Router.get('/', (req, res) => {
    res.json({
      version: 'v1',
      endpoints: {
        auth: [
          'POST /api/v1/auth/register',
          'POST /api/v1/auth/login',
          'POST /api/v1/auth/refresh',
          'POST /api/v1/auth/logout',
        ],
        users: [
          'POST /api/v1/users',
          'GET /api/v1/users',
          'GET /api/v1/users/:id',
          'PATCH /api/v1/users/:id',
          'DELETE /api/v1/users/:id',
        ],
        exams: {
          admin: [
            'POST /api/v1/admin/exams',
            'GET /api/v1/admin/exams',
            'GET /api/v1/admin/exams/:id',
            'PATCH /api/v1/admin/exams/:id',
            'DELETE /api/v1/admin/exams/:id',
            'POST /api/v1/admin/exams/:id/questions',
            'DELETE /api/v1/admin/exams/:id/questions',
            'GET /api/v1/admin/exams/:id/questions',
          ],
          participant: ['GET /api/v1/exams', 'GET /api/v1/exams/:id'],
        },
        questions: {
          admin: [
            'POST /api/v1/admin/questions',
            'GET /api/v1/admin/questions',
            'GET /api/v1/admin/questions/:id',
            'PATCH /api/v1/admin/questions/:id',
            'DELETE /api/v1/admin/questions/:id',
            'POST /api/v1/admin/questions/bulk',
            'POST /api/v1/admin/questions/bulk-delete',
            'GET /api/v1/admin/questions/stats',
          ],
        },
        examSessions: {
          participant: [
            'POST /api/v1/exams/:id/start',
            'GET /api/v1/user-exams/:id',
            'GET /api/v1/user-exams/:id/questions',
            'POST /api/v1/user-exams/:id/answers',
            'POST /api/v1/user-exams/:id/submit',
            'GET /api/v1/user-exams/:id/answers',
            'GET /api/v1/results/me',
          ],
          admin: ['GET /api/v1/admin/results'],
        },
        proctoring: {
          participant: [
            'POST /api/v1/proctoring/events',
            'POST /api/v1/proctoring/events/batch',
            'POST /api/v1/proctoring/detect-face',
            'GET /api/v1/proctoring/user-exams/:id/events',
            'GET /api/v1/proctoring/user-exams/:id/stats',
          ],
          admin: ['GET /api/v1/admin/proctoring/events'],
        },
      },
    });
  });
}