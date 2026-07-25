/**
 * stations/station.controller.ts
 */

import { Request, Response, NextFunction } from 'express';
import { StationService } from './station.service';
import { AuthRequest } from '../../types';

export const StationController = {
  /** GET /stations */
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stations = await StationService.listStations();
      res.status(200).json({ success: true, message: 'Stations list', data: stations });
    } catch (err) { next(err); }
  },

  /** POST /stations */
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const station = await StationService.createStation(req.body);
      res.status(201).json({ success: true, message: 'Station created', data: station });
    } catch (err) { next(err); }
  },

  /** GET /stations/:id */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const station = await StationService.getStationById(req.params['id']!);
      res.status(200).json({ success: true, message: 'Station details', data: station });
    } catch (err) { next(err); }
  },

  /** GET /stations/:id/recommend-swap */
  async recommendSwap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const recommendation = await StationService.recommendSwap(req.params['id']!);
      res.status(200).json({
        success: true,
        message: 'Optimal battery pack identified for swap',
        data: recommendation,
      });
    } catch (err) { next(err); }
  },

  /** PATCH /stations/:stationId/docks/:dockId/cutoff */
  async triggerCutoff(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { stationId, dockId } = req.params as { stationId: string; dockId: string };
      const result = await StationService.triggerDockCutoff(stationId, dockId, req.user!.sub);
      res.status(200).json({ success: true, message: 'Dock isolated successfully', data: result });
    } catch (err) { next(err); }
  },
};
