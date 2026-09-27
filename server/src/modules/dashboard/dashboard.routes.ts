import { Router } from 'express';
import { getDashboardMetrics } from './dashboard.controller';
import { authenticate } from '../../middleware/authHandler';
import { requireBrokerage } from '../../middleware/tenantHandler';

const router = Router();

router.use(authenticate, requireBrokerage);

router.get('/metrics', getDashboardMetrics);

export default router;
