import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  confirmPasswordReset,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  signup
} from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/signup', signup);
authRoutes.post('/login', login);
authRoutes.post('/refresh', refresh);
authRoutes.post('/logout', logout);
authRoutes.post('/forgot-password', forgotPassword);
authRoutes.post('/reset-password', confirmPasswordReset);
authRoutes.get('/me', requireAuth, me);
