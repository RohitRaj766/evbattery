/**
 * batteries/battery.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import { BatteryService } from './battery.service';
import { AuthRequest } from '../../types';
import { BatteryHealthState } from '@prisma/client';

export const BatteryController = {
  /** GET /batteries */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { healthState, page = '1', limit = '20' } = req.query as {
        healthState?: string; page?: string; limit?: string;
      };
      const result = await BatteryService.listBatteries({
        healthState: healthState as BatteryHealthState | undefined,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
      res.status(200).json({
        success: true,
        message: 'Battery fleet',
        data: result.batteries,
        meta: result.meta,
      });
    } catch (err) { next(err); }
  },

  /** POST /batteries */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const battery = await BatteryService.createBattery(req.body);
      res.status(201).json({ success: true, message: 'Battery registered', data: battery });
    } catch (err) { next(err); }
  },

  /** GET /batteries/:id */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const battery = await BatteryService.getBatteryById(req.params['id']!);
      res.status(200).json({ success: true, message: 'Battery details', data: battery });
    } catch (err) { next(err); }
  },

  /** PATCH /batteries/:id/decommission */
  async decommission(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notes } = req.body as { notes?: string };
      const battery = await BatteryService.decommissionBattery(req.params['id']!, notes);
      res.status(200).json({ success: true, message: 'Battery decommissioned', data: battery });
    } catch (err) { next(err); }
  },
};
