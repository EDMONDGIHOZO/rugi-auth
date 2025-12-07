// Load environment variables first
import 'dotenv/config';

import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initializeEmailClient } from './services/email.service';
import { closeRedisConnection } from './middleware/rateLimit.middleware';

// Initialize email service
try {
  initializeEmailClient();
} catch (error) {
  logger.warn({ error }, 'Email service initialization failed, continuing without email support');
}

const server = app.listen(env.port, () => {
  logger.info(
    {
      port: env.port,
      nodeEnv: env.nodeEnv,
    },
    'Server started'
  );
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Close HTTP server
  server.close(async () => {
    // Close Redis connection
    await closeRedisConnection();
    logger.info('Process terminated');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

