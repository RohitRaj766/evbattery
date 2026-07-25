/**
 * telemetry/telemetry.routes.ts
 * Routes: 2 telemetry endpoints
 */

import { Router } from 'express';
import { TelemetryController } from './telemetry.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { IngestTelemetrySchema, BatteryIdParamSchema, TelemetryHistoryQuerySchema } from './telemetry.schema';

const router = Router();

/**
 * @route   POST /api/v1/telemetry
 * @desc    Ingest a telemetry reading from a dock sensor
 * @access  Protected (OPERATOR/ADMIN)
 */
router.post(
  '/',
  authenticate,
  validate({ body: IngestTelemetrySchema }),
  TelemetryController.ingest
);

/**
 * @route   GET /api/v1/telemetry/:batteryId/history
 * @desc    Retrieve historical telemetry time-series for a battery
 * @access  Protected
 */
router.get(
  '/:batteryId/history',
  authenticate,
  validate({ params: BatteryIdParamSchema, query: TelemetryHistoryQuerySchema }),
  TelemetryController.getHistory
);

export default router;
