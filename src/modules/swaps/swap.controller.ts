/**
 * swaps/swap.controller.ts & swap.routes.ts
 */

import { Request, Response, NextFunction } from 'express';
import { SwapService } from './swap.service';
import { AuthRequest } from '../../types';

export const SwapController = {
  /** GET /swaps */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { stationId, driverPhone, page = '1', limit = '20' } = req.query as {
        stationId?: string; driverPhone?: string; page?: string; limit?: string;
      };
      const result = await SwapService.listSwaps({
        stationId,
        driverPhone,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
      res.status(200).json({
        success: true,
        message: 'Swap audit log',
        data: result.swaps,
        meta: result.meta,
      });
    } catch (err) { next(err); }
  },

  /** POST /swaps */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const swap = await SwapService.createSwap(req.body, req.user?.sub);
      res.status(201).json({ success: true, message: 'Swap recorded', data: swap });
    } catch (err) { next(err); }
  },
};
