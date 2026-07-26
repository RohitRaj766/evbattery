/**
 * assignments/assignment.routes.ts
 */

import { Router } from 'express';
import { AssignmentController } from './assignment.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  AssignOperatorSchema,
  UpdateAssignmentSchema,
  AssignmentParamsSchema,
  StationParamSchema,
  OperatorParamSchema,
} from './assignment.schema';

const router = Router();

router.use(authenticate);

// ── ROUTES MOUNTED AT /api/v1 ────────────────────────────────────────────────
// The server will mount these at the root of the api, so we map them manually.

/** POST /stations/:stationId/operators */
router.post(
  '/stations/:stationId/operators',
  authorize('ADMIN'),
  validate({ params: StationParamSchema, body: AssignOperatorSchema }),
  AssignmentController.assign
);

/** GET /stations/:stationId/operators */
router.get(
  '/stations/:stationId/operators',
  authorize('ADMIN'),
  validate({ params: StationParamSchema }),
  AssignmentController.getStationOperators
);

/** GET /operators/:operatorId/stations */
router.get(
  '/operators/:operatorId/stations',
  // Both ADMIN and OPERATOR can access, controller handles resource ownership check for OPERATOR
  validate({ params: OperatorParamSchema }),
  AssignmentController.getOperatorStations
);

/** PATCH /stations/:stationId/operators/:operatorId */
router.patch(
  '/stations/:stationId/operators/:operatorId',
  authorize('ADMIN'),
  validate({ params: AssignmentParamsSchema, body: UpdateAssignmentSchema }),
  AssignmentController.update
);

/** DELETE /stations/:stationId/operators/:operatorId */
router.delete(
  '/stations/:stationId/operators/:operatorId',
  authorize('ADMIN'),
  validate({ params: AssignmentParamsSchema }),
  AssignmentController.remove
);

export default router;
