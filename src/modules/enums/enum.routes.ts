/**
 * enums/enum.routes.ts
 */

import { Router } from 'express';
import { EnumController } from './enum.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

/** GET /api/v1/enums */
router.get('/', EnumController.getEnums);

export default router;
