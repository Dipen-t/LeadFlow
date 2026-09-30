import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export let io: SocketIOServer;

export const initSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow the specific CLIENT_URL, but also allow requests to reflect their origin
        // This helps with Render deployments and preview URLs.
        callback(null, origin || true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication Middleware for Sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded: any = jwt.verify(token, env.JWT_SECRET);
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    
    // Join tenant-specific room securely
    if (user.brokerageId) {
      const room = `brokerage:${user.brokerageId}`;
      socket.join(room);
      logger.info(`Socket ${socket.id} joined room ${room}`);
    }

    socket.on('disconnect', () => {
      logger.info(`Socket ${socket.id} disconnected`);
    });
  });
};

export const broadcastToBrokerage = (brokerageId: string, event: string, payload: any) => {
  if (io) {
    io.to(`brokerage:${brokerageId}`).emit(event, payload);
  }
};
