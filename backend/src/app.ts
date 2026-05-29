import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createServer } from 'http';

import { requestContextMiddleware } from './middleware/request-context.middleware';
import { createRateLimiter } from './middleware/rate-limit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { setupSocket } from './sockets/whatsapp.socket';

import authRoutes from './modules/auth/auth.routes';
import whatsappRoutes from './modules/whatsapp';

/**
 * Express App Setup
 * Configura middlewares, rotas e Socket.IO
 */

export const createApp = (): { app: Application; httpServer: any } => {
  const app = express();
  const httpServer = createServer(app);

  // Segurança
  app.use(helmet());
  app.disable('x-powered-by');

  // CORS
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      optionsSuccessStatus: 200,
    })
  );

  // Body parsers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // Request context (logging, request ID)
  app.use(requestContextMiddleware);

  // Rate limiting global
  const globalLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 1000, // 1000 requisições
  });
  app.use(globalLimiter);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  });

  // API v1 routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/instances', whatsappRoutes);

  // Setup Socket.IO
  setupSocket(httpServer);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (deve ser o último)
  app.use(errorHandler);

  return { app, httpServer };
};
