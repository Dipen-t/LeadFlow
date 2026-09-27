import { Router } from 'express';
import { getStages, createStage, updateStage } from './pipeline.controller';
import { authenticate, requireRole } from '../../middleware/authHandler';
import { requireBrokerage } from '../../middleware/tenantHandler';

const router = Router();

// All pipeline routes require authentication and tenant context
router.use(authenticate, requireBrokerage);

router.get('/stages', getStages);
router.post('/stages', requireRole(['BROKERAGE_ADMIN']), createStage);
router.patch('/stages/:id', requireRole(['BROKERAGE_ADMIN']), updateStage);

export default router;
