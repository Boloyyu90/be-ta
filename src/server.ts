/**
 * Server Entrypoint
 *
 * Server startup logic dengan ML warmup, cleanup tasks, dan graceful shutdown.
 * Handles process signals dan uncaught errors untuk stability.
 *
 * @module server
 */

import app from './app';
import { env } from './config/env';
import { disconnectDatabase } from './config/database';
import { runAllCleanupTasks } from '@/features/exam-sessions/exam-sessions.service';
import { logger } from './shared/utils/logger';
import { warmupFaceAnalyzer } from '@/features/proctoring/ml/analyzer.factory';

const PORT = env.PORT;

/**
 * Start server dengan ML warmup dan background tasks.
 * Startup sequence: warmup ML → start HTTP → setup cleanup interval.
 */
const startServer = async () => {
  try {
    // ==================== ML WARMUP ====================

    /**
     * Warmup face analyzer kalau enabled.
     * Pre-load model untuk avoid cold start di request pertama.
     */
    if (env.ML_WARMUP_ON_STARTUP && env.YOLO_ENABLED) {
      logger.info('🔥 Warming up face analyzer...');
      await warmupFaceAnalyzer();
    } else {
      logger.info('⚠️ ML warmup disabled or YOLO not enabled');
    }

    // ==================== HTTP SERVER ====================

    /**
     * Start HTTP server dan log startup info.
     * Display health check dan API URLs untuk quick access.
     */
    const server = app.listen(PORT, () => {
      logger.info('🚀 Server started successfully');
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🌐 Port: ${PORT}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔗 API v1: http://localhost:${PORT}/api/v1`);
      logger.info('');
      logger.info('Press CTRL+C to stop');
    });

    // ==================== BACKGROUND TASKS ====================

    /**
     * Cleanup task interval (5 menit).
     * Auto-submit abandoned exam sessions untuk maintain data integrity.
     */
    setInterval(async () => {
      try {
        await runAllCleanupTasks();
      } catch (error) {
        logger.error({ error }, 'Cleanup failed');
      }
    }, 5 * 60 * 1000);

    // ==================== GRACEFUL SHUTDOWN ====================

    /**
     * Graceful shutdown handler.
     * Close HTTP server → disconnect database → exit process.
     * Force exit after 10 detik kalau masih hanging.
     */
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('✅ HTTP server closed');

        try {
          await disconnectDatabase();
          logger.info('✅ Database disconnected');
          process.exit(0);
        } catch (error) {
          logger.error({ error }, '❌ Error during shutdown');
          process.exit(1);
        }
      });

      // Force close after 10 seconds timeout
      setTimeout(() => {
        logger.error('❌ Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen untuk SIGTERM (Docker/k8s) dan SIGINT (Ctrl+C)
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // ==================== ERROR HANDLERS ====================

    /**
     * Uncaught exception handler.
     * Log error dan exit untuk restart (handled by process manager).
     */
    process.on('uncaughtException', error => {
      logger.error({ error }, '❌ Uncaught Exception');
      process.exit(1);
    });

    /**
     * Unhandled rejection handler.
     * Catch unhandled promise rejections yang bisa crash app.
     */
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, '❌ Unhandled Rejection');
      process.exit(1);
    });

  } catch (error) {
    logger.error({ error }, '❌ Failed to start server');
    process.exit(1);
  }
};

// Start server
startServer();