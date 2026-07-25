/**
 * telemetry/telemetry.controller.ts & telemetry.routes.ts
 */

// ─── Controller ───────────────────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import { TelemetryService } from './telemetry.service';

export const TelemetryController = {
  /** POST /telemetry - Ingest telemetry reading */
  async ingest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const telemetry = await TelemetryService.ingest(req.body);
      res.status(202).json({
        success: true,
        message: 'Telemetry accepted',
        data: { id: telemetry.id, timestamp: telemetry.timestamp },
      });
    } catch (err) {
      next(err);
    }
  },

  /** GET /telemetry/:batteryId/history */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batteryId } = req.params;
      const { from, to, limit } = req.query as {
        from?: string; to?: string; limit?: string;
      };

      const result = await TelemetryService.getHistory(batteryId, {
        from,
        to,
        limit: limit ? parseInt(limit, 10) : 100,
      });

      res.status(200).json({
        success: true,
        message: 'Telemetry history',
        data: result.records,
        meta: { total: result.total },
      });
    } catch (err) {
      next(err);
    }
  },
};
