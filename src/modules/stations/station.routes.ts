/**
 * stations/station.routes.ts
 * Routes: 4 station endpoints
 */

import { Router } from 'express';
import { StationController } from './station.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { CreateStationSchema, StationIdParamSchema, DockCutoffParamSchema } from './station.schema';

const router = Router();

router.use(authenticate);

/** GET /api/v1/stations */
router.get('/', StationController.list);

/** POST /api/v1/stations - ADMIN only */
router.post(
  '/',
  authorize('ADMIN'),
  validate({ body: CreateStationSchema }),
  StationController.create
);

/** GET /api/v1/stations/:id */
router.get(
  '/:id',
  validate({ params: StationIdParamSchema }),
  StationController.getById
);

/** GET /api/v1/stations/:id/recommend-swap - Core business endpoint */
router.get(
  '/:id/recommend-swap',
  validate({ params: StationIdParamSchema }),
  StationController.recommendSwap
);

/** PATCH /api/v1/stations/:stationId/docks/:dockId/cutoff - ADMIN only */
router.patch(
  '/:stationId/docks/:dockId/cutoff',
  authorize('ADMIN'),
  validate({ params: DockCutoffParamSchema }),
  StationController.triggerCutoff
);

export default router;
