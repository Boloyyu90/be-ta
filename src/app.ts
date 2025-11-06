import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler, notFoundHandler } from '@/shared/middleware/error.middleware';
import { globalLimiter } from '@/shared/middleware/rate-limit.middleware';
import { sendSuccess } from '@/shared/utils/response';
import { logger } from '@/shared/utils/logger';

// Import version routers
import { v1Router } from '@/routes/v1.route';

const app = express();

// Security & parsing middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'development' ? '*' : false),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(globalLimiter);

// Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.info(
      {
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
      },
      'Incoming request'
    );
    next();
  });
}

// Health check (no version)
app.get('/health', (req, res) => {
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Root endpoint
app.get('/', (req, res) => {
  sendSuccess(res, {
    message: 'Backend Tryout & Proctoring API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: {
        v1: '/api/v1',
      },
    },
  });
});

// API version routes
app.use('/api/v1', v1Router);

// Future versions
// app.use('/api/v2', v2Router);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;