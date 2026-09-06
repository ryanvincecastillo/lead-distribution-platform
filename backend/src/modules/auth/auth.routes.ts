import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { authLimiter } from '../../middleware/rate-limit.js';
import { loginSchema } from './auth.schema.js';
import { login, logout, me } from './auth.controller.js';

export const authRoutes = Router();

authRoutes.post('/login', authLimiter, validate({ body: loginSchema }), login);
authRoutes.post('/logout', logout);
authRoutes.get('/me', requireAuth, me);
