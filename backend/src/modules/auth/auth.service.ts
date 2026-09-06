import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import type { LoginInput } from './auth.schema.js';

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string | null;
}

/**
 * A wrong email and a wrong password must be indistinguishable to the caller, both in
 * message and in timing — otherwise the endpoint becomes an account enumeration oracle.
 * bcrypt.compare against a dummy hash keeps the work factor identical on both paths.
 */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.k6vJ7uLDNsGSC7O0N1FyGe0R3D8jQ8O';

export const authenticate = async ({ email, password }: LoginInput): Promise<AuthenticatedUser> => {
  const user = await prisma.user.findUnique({ where: { email } });

  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw AppError.unauthorized('Incorrect email or password');
  }

  return { id: user.id, email: user.email, name: user.name };
};

export const findUserById = async (id: number): Promise<AuthenticatedUser> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });

  if (!user) throw AppError.unauthorized();

  return user;
};
