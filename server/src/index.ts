import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { logger } from './utils/logger';
import { initSocket } from './sockets';

const startServer = async () => {
  // Connect to Database
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  // Start Express server
  const server = httpServer.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('Process terminated.');
      process.exit(0);
    });
  });
};

startServer();
