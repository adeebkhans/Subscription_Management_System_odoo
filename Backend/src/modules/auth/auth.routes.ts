import { Router } from 'express';
import * as controller from './auth.controller.js';

export const authRoutes = Router();
authRoutes.post('/signup', controller.signup);
authRoutes.post('/login', controller.login);
authRoutes.post('/logout', controller.logout);
