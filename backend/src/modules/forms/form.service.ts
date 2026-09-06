import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import type { CreateFormInput } from './form.schema.js';

/** There is at most one form, so "get" needs no id. Returns null when none exists yet. */
export const getForm = () =>
  prisma.form.findFirst({
    include: {
      distribution: { select: { id: true, name: true } },
      _count: { select: { leads: true } },
    },
  });

export const getFormBySlug = async (slug: string) => {
  const form = await prisma.form.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, createdAt: true },
  });

  if (!form) throw AppError.notFound('This form does not exist');

  return form;
};

export const createForm = async (input: CreateFormInput) => {
  try {
    return await prisma.form.create({ data: input });
  } catch (error) {
    // The singleton column and the slug both carry unique indexes, so a duplicate is
    // reported by MySQL rather than by a read-then-write check that two concurrent
    // requests could both pass.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = String(error.meta?.target ?? '');
      if (target.includes('slug')) {
        throw AppError.conflict('That URL slug is already taken');
      }
      throw AppError.conflict('A form already exists. Only one form can be created.');
    }
    throw error;
  }
};
