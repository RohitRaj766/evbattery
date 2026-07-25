/**
 * swaps/swap.schema.ts
 */

import { z } from 'zod';

export const CreateSwapSchema = z.object({
  stationId: z.string().uuid(),
  batteryOutId: z.string().uuid('Battery to give to driver is required'),
  batteryInId: z.string().uuid().optional(),
  driverPhone: z.string().min(10).max(15),
  driverVehicleId: z.string().optional(),
  notes: z.string().optional(),
});

export const SwapListQuerySchema = z.object({
  stationId: z.string().uuid().optional(),
  driverPhone: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateSwapDto = z.infer<typeof CreateSwapSchema>;
