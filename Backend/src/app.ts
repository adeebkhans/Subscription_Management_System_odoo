import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './core/errors/error-handler.js';
import { apiRoutes } from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(helmet());
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.get('/health', (_request, response) => {
    response.json({ data: { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() } });
  });

  app.use('/api', apiRoutes);
  app.use(errorHandler);

  return app;
}
