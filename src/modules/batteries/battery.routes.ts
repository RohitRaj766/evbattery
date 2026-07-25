/**
 * batteries/battery.routes.ts
 * Routes: 3 battery endpoints + decommission
 */

import { Router } from 'express';
import { BatteryController } from './battery.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { CreateBatterySchema, BatteryIdParamSchema, BatteryListQuerySchema, DecommissionSchema } from './battery.schema';

const router = Router();

router.use(authenticate);

/** GET /api/v1/batteries */
router.get(
  '/',
  validate({ query: BatteryListQuerySchema }),
  BatteryController.list
);

/** POST /api/v1/batteries - ADMIN only */
router.post(
  '/',
  authorize('ADMIN'),
  validate({ body: CreateBatterySchema }),
  BatteryController.create
);

/** GET /api/v1/batteries/:id */
router.get(
  '/:id',
  validate({ params: BatteryIdParamSchema }),
  BatteryController.getById
);

/** PATCH /api/v1/batteries/:id/decommission - ADMIN only */
router.patch(
  '/:id/decommission',
  authorize('ADMIN'),
  validate({ params: BatteryIdParamSchema, body: DecommissionSchema }),
  BatteryController.decommission
);

export default router;
