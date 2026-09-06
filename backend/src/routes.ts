import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes.js';

export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
