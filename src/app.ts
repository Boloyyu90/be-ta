import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler, notFoundHandler } from '@/shared/middleware/error.middleware';
import { globalLimiter } from '@/shared/middleware/rate-limit.middleware';
import { sendSuccess } from '@/shared/utils/response';

// Import version routers
import { v1Router } from '@/routes/v1.route';
// import { v2Router } from '@/routes/v2.route'; // Future

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(globalLimiter);

// Health check (no version)
app.get('/health', (req, res) => {
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API version routes
app.use('/api/v1', v1Router);
// app.use('/api/v2', v2Router); // Future

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;