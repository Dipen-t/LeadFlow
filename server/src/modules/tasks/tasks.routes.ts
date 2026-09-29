import { Router } from 'express';
import { getMyTasks, completeTask } from './tasks.controller';
import { authenticate, requireRole } from '../../middleware/authHandler';
import { requireBrokerage } from '../../middleware/tenantHandler';

const router = Router();

router.use(authenticate, requireBrokerage, requireRole(['BROKERAGE_ADMIN', 'ADVISOR']));

router.get('/my-tasks', getMyTasks);
router.patch('/:id/complete', completeTask);

export default router;
