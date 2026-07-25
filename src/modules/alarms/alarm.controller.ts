/**
 * alarms/alarm.controller.ts
 */

import { Response, NextFunction } from 'express';
import { AlarmService } from './alarm.service';
import { AuthRequest } from '../../types';
import { AlarmStatus } from '@prisma/client';

export const AlarmController = {
  /** GET /alarms */
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, page = '1', limit = '20' } = req.query as {
        status?: string; page?: string; limit?: string;
      };

      const result = await AlarmService.listAlarms({
        status: status as AlarmStatus | undefined,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });

      res.status(200).json({
        success: true,
        message: 'Alarms retrieved',
        data: result.alarms,
        meta: result.meta,
      });
    } catch (err) {
      next(err);
    }
  },

  /** GET /alarms/:id */
  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const alarm = await AlarmService.getAlarmById(req.params['id']!);
      res.status(200).json({ success: true, message: 'Alarm details', data: alarm });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /alarms/:id/silence */
  async silence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const alarm = await AlarmService.silenceAlarm(req.params['id']!, req.user!.sub);
      res.status(200).json({ success: true, message: 'Alarm silenced', data: alarm });
    } catch (err) {
      next(err);
    }
  },

  /** PATCH /alarms/:id/resolve */
  async resolve(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { notes } = req.body as { notes?: string };
      const alarm = await AlarmService.resolveAlarm(req.params['id']!, req.user!.sub, notes);
      res.status(200).json({ success: true, message: 'Alarm resolved, dock restored', data: alarm });
    } catch (err) {
      next(err);
    }
  },
};
