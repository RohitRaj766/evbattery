/**
 * operators/operator.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import { OperatorService } from './operator.service';

export const OperatorController = {
  /** POST /operators */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const operator = await OperatorService.createOperator(req.body);
      res.status(201).json({
        success: true,
        message: 'Operator created successfully.',
        data: operator,
      });
    } catch (err) {
      next(err);
    }
  },

  /** GET /operators */
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const operators = await OperatorService.listOperators();
      res.status(200).json({
        success: true,
        message: 'Operators retrieved successfully.',
        data: operators,
      });
    } catch (err) {
      next(err);
    }
  },
};
