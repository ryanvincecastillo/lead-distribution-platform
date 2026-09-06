import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

const ISSUER = 'lead-distribution-api';
const AUDIENCE = 'lead-distribution-admin';

export interface SessionClaims {
  userId: number;
  email: string;
}

export const signSessionToken = ({ userId, email }: SessionClaims): string =>
  jwt.sign({ email }, env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });

/** Returns null for any invalid, expired or foreign token — callers treat null as 401. */
export const verifySessionToken = (token: string): SessionClaims | null => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (typeof payload === 'string' || !payload.sub) return null;

    const userId = Number(payload.sub);
    const email = typeof payload.email === 'string' ? payload.email : null;
    if (!Number.isInteger(userId) || !email) return null;

    return { userId, email };
  } catch {
    return null;
  }
};
