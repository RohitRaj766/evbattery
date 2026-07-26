/**
 * assignments/assignment.repository.ts
 */

import { AssignmentStatus } from '@prisma/client';
import { prisma } from '../../config/database.config';
import { AssignOperatorDto, UpdateAssignmentDto } from './assignment.schema';

export const AssignmentRepository = {
  /** Check if a station exists */
  checkStationExists: (stationId: string) =>
    prisma.station.findUnique({
      where: { id: stationId },
      select: { id: true },
    }),

  /** Check if an operator exists */
  checkOperatorExists: (operatorId: string) =>
    prisma.user.findUnique({
      where: { id: operatorId, role: 'OPERATOR' },
      select: { id: true },
    }),

  /** Find existing assignment */
  findAssignment: (stationId: string, operatorId: string) =>
    prisma.stationAssignment.findUnique({
      where: {
        operatorId_stationId: { operatorId, stationId },
      },
    }),

  /** Assign an operator */
  createAssignment: (stationId: string, dto: AssignOperatorDto) =>
    prisma.stationAssignment.create({
      data: {
        stationId,
        operatorId: dto.operatorId,
        isPrimary: dto.isPrimary ?? false,
      },
      include: { operator: { select: { id: true, name: true, email: true } } },
    }),

  /** Get all operators for a station */
  getOperatorsByStation: (stationId: string) =>
    prisma.stationAssignment.findMany({
      where: { stationId },
      include: {
        operator: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { assignedAt: 'desc' },
    }),

  /** Get all stations for an operator */
  getStationsByOperator: (operatorId: string) =>
    prisma.stationAssignment.findMany({
      where: { operatorId },
      include: {
        station: { select: { id: true, name: true, location: true, isActive: true } },
      },
      orderBy: { assignedAt: 'desc' },
    }),

  /** Update an assignment */
  updateAssignment: (stationId: string, operatorId: string, dto: UpdateAssignmentDto) =>
    prisma.stationAssignment.update({
      where: {
        operatorId_stationId: { operatorId, stationId },
      },
      data: {
        assignmentStatus: dto.assignmentStatus,
        isPrimary: dto.isPrimary,
        unassignedAt: dto.assignmentStatus === AssignmentStatus.INACTIVE ? new Date() : null,
      },
    }),

  /** Soft delete (remove) an assignment by setting it inactive */
  removeAssignment: (stationId: string, operatorId: string) =>
    prisma.stationAssignment.update({
      where: {
        operatorId_stationId: { operatorId, stationId },
      },
      data: {
        assignmentStatus: AssignmentStatus.INACTIVE,
        unassignedAt: new Date(),
      },
    }),
};
