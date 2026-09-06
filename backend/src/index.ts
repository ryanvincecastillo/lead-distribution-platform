import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const server = createApp().listen(env.PORT, env.HOST, () => {
  logger.info(`API listening on http://${env.HOST}:${env.PORT} [${env.NODE_ENV}]`);
});

/**
 * PM2 sends SIGINT on restart. Without this, in-flight requests are severed mid-write
 * and MySQL connections are left for the server to time out on its own.
 */
const shutdown = (signal: string) => async () => {
  logger.info(`${signal} received, shutting down`);

  const forceExit = setTimeout(() => {
    logger.error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});
