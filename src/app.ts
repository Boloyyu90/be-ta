/**
 * Express Application
 *
 * Main Express app dengan middleware stack (security, parsing, logging).
 * Mengorganisir routes, health check, dan error handling.
 *
 * @module app
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler, notFoundHandler } from '@/shared/middleware/error.middleware';
import { globalLimiter } from '@/shared/middleware/rate-limit.middleware';
import { sendSuccess } from '@/shared/utils/response';
import { logger } from '@/shared/utils/logger';
import { v1Router } from '@/routes/v1.route';

const app = express();

// ==================== SECURITY & PARSING ====================

/**
 * Helmet untuk security headers.
 * crossOriginResourcePolicy: "cross-origin" untuk allow images/assets dari CDN.
 */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

/**
 * CORS configuration.
 * Development: allow all origins (*), Production: explicit CORS_ORIGIN dari env.
 */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'development' ? '*' : false),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

/**
 * Body parsing dengan 10MB limit.
 * Untuk support image upload di proctoring (base64).
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== MIDDLEWARE ====================

/**
 * Global rate limiter (100 req/15min).
 * Applied to all routes, more specific limiters di routes individual.
 */
app.use(globalLimiter);

/**
 * Request logging (development only).
 * Log method, url, body, query untuk debugging.
 */
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

// ==================== PUBLIC ENDPOINTS ====================

/**
 * Health check endpoint (no version).
 * Returns status, uptime, environment untuk monitoring.
 */
app.get('/health', (req, res) => {
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

/**
 * Root endpoint.
 * API documentation links untuk quick reference.
 */
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

// ==================== API ROUTES ====================

/**
 * API version 1 routes.
 * Semua business logic routes di bawah /api/v1.
 */
app.use('/api/v1', v1Router);

// Future versions support
// app.use('/api/v2', v2Router);

// ==================== ERROR HANDLING ====================

/**
 * 404 handler untuk undefined routes.
 * Harus sebelum error handler.
 */
app.use(notFoundHandler);

/**
 * Global error handler.
 * Harus terakhir untuk catch semua errors dari middleware/routes sebelumnya.
 */
app.use(errorHandler);

export default app;