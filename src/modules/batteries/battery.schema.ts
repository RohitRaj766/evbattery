/**
 * batteries/battery.schema.ts
 */

import { z } from 'zod';

export const CreateBatterySchema = z.object({
  serialNumber: z.string().min(3).max(100),
  manufacturer: z.string().min(2).max(100),
  modelName: z.string().min(2).max(100),
  capacityKwh: z.number().min(0.1).max(100),
  soh: z.number().min(0).max(100).default(100),
  manufacturedAt: z.string().datetime(),
  notes: z.string().optional(),
});

export const BatteryListQuerySchema = z.object({
  healthState: z.enum(['HEALTHY', 'DEGRADED', 'CRITICAL', 'DECOMMISSIONED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const BatteryIdParamSchema = z.object({
  id: z.string().uuid('Invalid battery ID'),
});

export const DecommissionSchema = z.object({
  notes: z.string().optional(),
});

export type CreateBatteryDto = z.infer<typeof CreateBatterySchema>;
