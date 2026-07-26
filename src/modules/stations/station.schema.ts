/**
 * stations/station.schema.ts
 */

import { z } from 'zod';

export const CreateStationSchema = z.object({
  name: z.string().min(2).max(200),
  location: z.string().min(5).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const CreateDocksSchema = z.object({
  dockNumbers: z.array(z.number().int().min(1, 'Dock number must be at least 1')).min(1, 'Provide at least one dock number'),
});

export const StationIdParamSchema = z.object({
  id: z.string().uuid('Invalid station ID'),
});

export const DockCutoffParamSchema = z.object({
  stationId: z.string().uuid('Invalid station ID'),
  dockId: z.string().uuid('Invalid dock ID'),
});

export const InsertBatterySchema = z.object({
  batteryId: z.string().uuid('Invalid battery ID'),
});

export type CreateStationDto = z.infer<typeof CreateStationSchema>;
export type CreateDocksDto = z.infer<typeof CreateDocksSchema>;
