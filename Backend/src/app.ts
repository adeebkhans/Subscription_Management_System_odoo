import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './core/errors/error-handler.js';
import { authRoutes } from './modules/auth/index.js';
import { catalogRoutes } from './modules/catalog/index.js';
import { userRoutes } from './modules/users/index.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.APP_URL, credentials: true }));
  app.use(helmet());
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.get('/health', (_request, response) => response.json({ data: { status: 'ok' } }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/catalog', catalogRoutes);
  app.use(errorHandler);
  return app;
}
