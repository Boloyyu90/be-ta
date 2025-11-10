import app from './app';
import { env } from './config/env';
import { disconnectDatabase } from './config/database';
import { logger } from './shared/utils/logger';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info('🚀 Server started successfully');
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🌐 Port: ${PORT}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔗 API v1: http://localhost:${PORT}/api/v1`);
  logger.info('');
  logger.info('Press CTRL+C to stop');
});

// Graceful shutdown
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

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('❌ Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', error => {
  logger.error({ error }, '❌ Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, '❌ Unhandled Rejection');
  process.exit(1);
});