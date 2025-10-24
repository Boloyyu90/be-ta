import { Router } from 'express';

// Import feature routes
import { authRouter } from '@/features/auth/auth.route';
import { usersRouter } from '@/features/users/users.route';
// Import future routes here
// import { examsRouter } from '@/features/exams/exams.route';
// import { examSessionsRouter } from '@/features/exam-sessions/exam-sessions.route';
// import { questionsRouter } from '@/features/questions/questions.route';
// import { proctoringRouter } from '@/features/proctoring/proctoring.route';

export const v1Router = Router();

// Mount feature routes
v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);

// Mount future routes
// v1Router.use('/exams', examsRouter);
// v1Router.use('/exam-sessions', examSessionsRouter);
// v1Router.use('/questions', questionsRouter);
// v1Router.use('/proctoring', proctoringRouter);