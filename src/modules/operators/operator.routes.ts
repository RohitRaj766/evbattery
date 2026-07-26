/**
 * operators/operator.routes.ts
 */

import { Router } from 'express';
import { OperatorController } from './operator.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { CreateOperatorSchema } from './operator.schema';

const router = Router();

router.use(authenticate);

/** GET /api/v1/operators - ADMIN only */
router.get(
  '/',
  authorize('ADMIN'),
  OperatorController.list
);

/** POST /api/v1/operators - ADMIN only */
router.post(
  '/',
  authorize('ADMIN'),
  validate({ body: CreateOperatorSchema }),
  OperatorController.create
);

export default router;
