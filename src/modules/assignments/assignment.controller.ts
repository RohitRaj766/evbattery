/**
 * assignments/assignment.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import { AssignmentService } from './assignment.service';
import { AuthRequest } from '../../types';

export const AssignmentController = {
  /** POST /stations/:stationId/operators */
  async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { stationId } = req.params;
      const assignment = await AssignmentService.assignOperator(stationId!, req.body);
      res.status(201).json({
        success: true,
        message: 'Operator assigned successfully.',
        data: assignment,
      });
    } catch (err) { next(err); }
  },

  /** GET /stations/:stationId/operators */
  async getStationOperators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { stationId } = req.params;
      const assignments = await AssignmentService.getStationOperators(stationId!);
      res.status(200).json({
        success: true,
        message: 'Station operators retrieved successfully.',
        data: assignments,
      });
    } catch (err) { next(err); }
  },

  /** GET /operators/:operatorId/stations */
  async getOperatorStations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { operatorId } = req.params;
      
      // If user is OPERATOR, they can only view their own assignments
      if (req.user?.role === 'OPERATOR' && req.user.sub !== operatorId) {
        res.status(403).json({ success: false, message: 'Forbidden: Cannot view other operator stations' });
        return;
      }

      const stations = await AssignmentService.getOperatorStations(operatorId!);
      res.status(200).json({
        success: true,
        message: 'Operator stations retrieved successfully.',
        data: stations,
      });
    } catch (err) { next(err); }
  },

  /** PATCH /stations/:stationId/operators/:operatorId */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { stationId, operatorId } = req.params;
      const assignment = await AssignmentService.updateAssignment(stationId!, operatorId!, req.body);
      res.status(200).json({
        success: true,
        message: 'Assignment updated successfully.',
        data: assignment,
      });
    } catch (err) { next(err); }
  },

  /** DELETE /stations/:stationId/operators/:operatorId */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { stationId, operatorId } = req.params;
      const assignment = await AssignmentService.removeAssignment(stationId!, operatorId!);
      res.status(200).json({
        success: true,
        message: 'Operator removed successfully.',
        data: assignment,
      });
    } catch (err) { next(err); }
  },
};
