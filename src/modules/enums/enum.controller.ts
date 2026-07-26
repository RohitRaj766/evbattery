/**
 * enums/enum.controller.ts
 */

import { Request, Response } from 'express';
import {
  Role,
  DockState,
  AssignmentStatus,
  AlarmStatus,
  BatteryHealthState,
  SwapStatus,
} from '@prisma/client';

export const EnumController = {
  /** GET /enums */
  getEnums(req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      message: 'Enums retrieved successfully',
      data: {
        Role: Object.values(Role),
        DockState: Object.values(DockState),
        AssignmentStatus: Object.values(AssignmentStatus),
        AlarmStatus: Object.values(AlarmStatus),
        BatteryHealthState: Object.values(BatteryHealthState),
        SwapStatus: Object.values(SwapStatus),
      },
    });
  },
};
