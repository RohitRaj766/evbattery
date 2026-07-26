/**
 * assignments/assignment.service.ts
 */

import { AppError } from '../../middlewares/error.middleware';
import { AssignOperatorDto, UpdateAssignmentDto } from './assignment.schema';
import { AssignmentRepository } from './assignment.repository';

export const AssignmentService = {
  /** Assign an operator to a station */
  async assignOperator(stationId: string, dto: AssignOperatorDto) {
    const station = await AssignmentRepository.checkStationExists(stationId);
    if (!station) throw new AppError('Station not found', 404);

    const operator = await AssignmentRepository.checkOperatorExists(dto.operatorId);
    if (!operator) throw new AppError('Operator not found or user is not an OPERATOR', 404);

    const existing = await AssignmentRepository.findAssignment(stationId, dto.operatorId);
    if (existing) {
      throw new AppError('Operator is already assigned to this station', 409);
    }

    return AssignmentRepository.createAssignment(stationId, dto);
  },

  /** Get all operators assigned to a station */
  async getStationOperators(stationId: string) {
    const station = await AssignmentRepository.checkStationExists(stationId);
    if (!station) throw new AppError('Station not found', 404);

    return AssignmentRepository.getOperatorsByStation(stationId);
  },

  /** Get all stations assigned to an operator */
  async getOperatorStations(operatorId: string) {
    const operator = await AssignmentRepository.checkOperatorExists(operatorId);
    if (!operator) throw new AppError('Operator not found', 404);

    return AssignmentRepository.getStationsByOperator(operatorId);
  },

  /** Update an assignment */
  async updateAssignment(stationId: string, operatorId: string, dto: UpdateAssignmentDto) {
    const existing = await AssignmentRepository.findAssignment(stationId, operatorId);
    if (!existing) throw new AppError('Assignment not found', 404);

    return AssignmentRepository.updateAssignment(stationId, operatorId, dto);
  },

  /** Remove an operator from a station */
  async removeAssignment(stationId: string, operatorId: string) {
    const existing = await AssignmentRepository.findAssignment(stationId, operatorId);
    if (!existing) throw new AppError('Assignment not found', 404);

    return AssignmentRepository.removeAssignment(stationId, operatorId);
  },
};
