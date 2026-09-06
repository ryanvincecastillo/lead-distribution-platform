import { z } from 'zod';

export const createDistributionSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  brokers: z
    .array(
      z.object({
        brokerId: z.coerce.number().int().positive(),
        percentage: z.coerce.number().min(0).max(100),
        isActive: z.boolean().default(true),
      }),
    )
    .default([]),
});

export const setDistributionBrokersSchema = z.object({
  brokers: z.array(
    z.object({
      brokerId: z.coerce.number().int().positive(),
      percentage: z.coerce.number().min(0).max(100),
      isActive: z.boolean().default(true),
    }),
  ),
});

export type CreateDistributionInput = z.infer<typeof createDistributionSchema>;
export type SetDistributionBrokersInput = z.infer<typeof setDistributionBrokersSchema>;
