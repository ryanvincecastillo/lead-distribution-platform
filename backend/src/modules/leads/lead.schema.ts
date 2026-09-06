import { z } from 'zod';
import { paginationSchema } from '../../lib/http.js';

export const publicLeadSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(120),
  // Normalisation happens here, once, so every downstream duplicate check compares
  // like with like.
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(160),
  phone: z
    .string()
    .trim()
    .min(7, 'Enter a valid phone number')
    .max(32)
    .regex(/^[+()\d][\d\s()+-]*$/, 'Enter a valid phone number'),
});

export const leadQuerySchema = paginationSchema.extend({
  status: z.enum(['sent', 'unsent', 'duplicate', 'failed']).optional(),
  brokerId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(120).optional(),
});

export const leadIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const assignLeadSchema = z.object({
  brokerId: z.coerce.number().int().positive(),
});

export type PublicLeadInput = z.infer<typeof publicLeadSchema>;
export type LeadQuery = z.infer<typeof leadQuerySchema>;
