import { z } from 'zod';

/** Routes the admin app owns — a form slug must never shadow one of these. */
const RESERVED_SLUGS = new Set([
  'api',
  'login',
  'logout',
  'dashboard',
  'brokers',
  'broker',
  'leads',
  'lead',
  'form',
  'forms',
  'distribution',
  'distributions',
  'settings',
  '_next',
  'favicon.ico',
]);

export const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug must be at least 3 characters')
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single dashes')
  .refine((value) => !RESERVED_SLUGS.has(value), 'That slug is reserved, choose another');

export const createFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  slug: slugField,
});

export const formSlugParamSchema = z.object({ slug: slugField });

export type CreateFormInput = z.infer<typeof createFormSchema>;
