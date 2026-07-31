/**
 * alarms/alarm.routes.ts
 * Routes: 4 alarm endpoints
 */

import { Router } from 'express';
import { AlarmController } from './alarm.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';

const router = Router();

// All alarm routes require authentication
router.use(authenticate);

/** GET /api/v1/alarms - List alarms */
router.get('/', AlarmController.list);

/** GET /api/v1/alarms/:id - Get alarm by ID */
router.get('/:id', AlarmController.getById);

/** PATCH /api/v1/alarms/:id/silence - Silence alarm (OPERATOR+) */
router.patch('/:id/silence', AlarmController.silence);

/** PATCH /api/v1/alarms/:id/resolve - Resolve alarm (ADMIN or OPERATOR) */
router.patch('/:id/resolve', authorize('ADMIN', 'OPERATOR'), AlarmController.resolve);

export default router;
