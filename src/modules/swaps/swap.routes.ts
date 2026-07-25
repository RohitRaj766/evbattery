/**
 * swaps/swap.routes.ts
 * Routes: 2 swap endpoints
 */

import { Router } from 'express';
import { SwapController } from './swap.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { CreateSwapSchema, SwapListQuerySchema } from './swap.schema';

const router = Router();

router.use(authenticate);

/** GET /api/v1/swaps */
router.get('/', validate({ query: SwapListQuerySchema }), SwapController.list);

/** POST /api/v1/swaps */
router.post('/', validate({ body: CreateSwapSchema }), SwapController.create);

export default router;
