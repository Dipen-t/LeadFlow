import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './modules/auth/auth.routes';
import pipelineRouter from './modules/pipeline/pipeline.routes';
import leadsRouter from './modules/leads/leads.routes';
import webhooksRouter from './modules/webhooks/webhooks.routes';
import clientsRouter from './modules/clients/clients.routes';
import documentsRouter from './modules/documents/documents.routes';
import automationsRouter from './modules/automations/automations.routes';
import tasksRouter from './modules/tasks/tasks.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';
import usersRouter from './modules/users/users.routes';
import brokeragesRouter from './modules/brokerages/brokerages.routes';
import integrationsRouter from './modules/integrations/integrations.routes';

// Initialize BullMQ Workers (Skip during tests to prevent Redis ECONNREFUSED)
if (process.env.NODE_ENV !== 'test') {
  require('./jobs/documentWorker');
  require('./jobs/emailWorker');
}

const app = express();

// Security Middlewares
app.use(helmet());
const corsOptionsDelegate = (req: express.Request, callback: (err: Error | null, options?: cors.CorsOptions) => void) => {
  if (req.originalUrl.startsWith('/api/webhooks')) {
    // Allow any origin for webhooks (public API)
    callback(null, { origin: true });
  } else {
    // Restrict everything else to the frontend client URL
    callback(null, { origin: env.CLIENT_URL, credentials: true });
  }
};

app.use(cors(corsOptionsDelegate));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: process.env.NODE_ENV === 'development' ? 10000 : 1000, // Higher limit
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(limiter);

// Logging Middleware
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
  })
);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/automations', automationsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/users', usersRouter);
app.use('/api/brokerages', brokeragesRouter);
app.use('/api/integrations', integrationsRouter);

// Error Handling
app.use(errorHandler);

export default app;
