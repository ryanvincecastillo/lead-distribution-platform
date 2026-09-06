import { z } from 'zod';
import { isValidTimezone, parseWorkingDays, timeToMinutes } from '../distribution/schedule.js';

const timeField = z
  .string()
  .trim()
  .refine((value) => timeToMinutes(value) !== null, 'Use 24-hour HH:mm format, e.g. 09:00');

const workingDaysField = z
  .string()
  .trim()
  .refine(
    (value) => parseWorkingDays(value).length > 0,
    'Select at least one working day (1 = Monday … 7 = Sunday)',
  )
  .transform((value) => parseWorkingDays(value).join(','));

export const createBrokerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  dailyCap: z.coerce.number().int().min(0, 'Daily cap cannot be negative').max(100_000).default(0),
  timezone: z.string().trim().refine(isValidTimezone, 'Unknown timezone'),
  openingTime: timeField,
  closingTime: timeField,
  workingDays: workingDaysField,
});

export const updateBrokerSchema = createBrokerSchema.partial();

export const brokerIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateBrokerInput = z.infer<typeof createBrokerSchema>;
export type UpdateBrokerInput = z.infer<typeof updateBrokerSchema>;
