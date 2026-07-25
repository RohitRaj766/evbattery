/**
 * telemetry/telemetry.schema.ts
 * Zod schemas for telemetry endpoints.
 */

import { z } from 'zod';

export const IngestTelemetrySchema = z.object({
  dockId: z.string().uuid('Invalid dock ID'),
  batteryId: z.string().uuid('Invalid battery ID'),
  voltage: z.number().min(0).max(100),
  current: z.number().min(-500).max(500), // Negative = discharging
  temperature: z.number().min(-40).max(150),
  soc: z.number().min(0).max(100),
  soh: z.number().min(0).max(100),
});

export const TelemetryHistoryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});

export const BatteryIdParamSchema = z.object({
  batteryId: z.string().uuid('Invalid battery ID'),
});

export type IngestTelemetryDto = z.infer<typeof IngestTelemetrySchema>;
export type TelemetryHistoryQuery = z.infer<typeof TelemetryHistoryQuerySchema>;
