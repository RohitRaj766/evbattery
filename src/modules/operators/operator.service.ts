/**
 * operators/operator.service.ts
 */

import { AppError } from '../../middlewares/error.middleware';
import { CreateOperatorDto } from './operator.schema';
import { OperatorRepository } from './operator.repository';

export const OperatorService = {
  /** Create a new operator */
  async createOperator(dto: CreateOperatorDto) {
    // Check if email exists
    const existingEmail = await OperatorRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new AppError('Email is already registered', 409);
    }

    // Check if phone exists
    if (dto.phone) {
      const existingPhone = await OperatorRepository.findByPhone(dto.phone);
      if (existingPhone) {
        throw new AppError('Phone number is already registered', 409);
      }
    }

    return OperatorRepository.create(dto);
  },

  /** List all operators */
  async listOperators() {
    return OperatorRepository.findAll();
  },
};
