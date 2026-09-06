import type { RequestHandler } from 'express';
import { signSessionToken } from '../../lib/jwt.js';
import { clearSessionCookie, setSessionCookie } from '../../lib/cookies.js';
import { AppError } from '../../lib/errors.js';
import { authenticate, findUserById } from './auth.service.js';
import type { LoginInput } from './auth.schema.js';

export const login: RequestHandler = async (req, res) => {
  const credentials = req.body as LoginInput;
  const user = await authenticate(credentials);

  setSessionCookie(res, signSessionToken({ userId: user.id, email: user.email }));

  res.json({ data: user });
};

export const logout: RequestHandler = (_req, res) => {
  clearSessionCookie(res);
  res.json({ data: { success: true } });
};

export const me: RequestHandler = async (req, res) => {
  if (!req.user) throw AppError.unauthorized();
  res.json({ data: await findUserById(req.user.id) });
};
