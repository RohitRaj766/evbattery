/**
 * assignments/assignment.schema.ts
 */

import { z } from 'zod';
import { AssignmentStatus } from '@prisma/client';

export const AssignOperatorSchema = z.object({
  operatorId: z.string().uuid('Invalid operator ID'),
  isPrimary: z.boolean().optional(),
});

export const UpdateAssignmentSchema = z.object({
  assignmentStatus: z.nativeEnum(AssignmentStatus).optional(),
  isPrimary: z.boolean().optional(),
});

export const AssignmentParamsSchema = z.object({
  stationId: z.string().uuid('Invalid station ID'),
  operatorId: z.string().uuid('Invalid operator ID'),
});

export const StationParamSchema = z.object({
  stationId: z.string().uuid('Invalid station ID'),
});

export const OperatorParamSchema = z.object({
  operatorId: z.string().uuid('Invalid operator ID'),
});

export type AssignOperatorDto = z.infer<typeof AssignOperatorSchema>;
export type UpdateAssignmentDto = z.infer<typeof UpdateAssignmentSchema>;
