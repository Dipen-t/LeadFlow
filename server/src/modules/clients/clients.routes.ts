import { Router } from 'express';
import { convertLeadToClient, getClients, getMyClient } from './clients.controller';
import { authenticate, requireRole } from '../../middleware/authHandler';
import { requireBrokerage } from '../../middleware/tenantHandler';

const router = Router();

router.use(authenticate, requireBrokerage);

router.get('/me', requireRole(['CLIENT']), getMyClient);
router.get('/', requireRole(['BROKERAGE_ADMIN', 'ADVISOR']), getClients);
router.post('/convert/:leadId', requireRole(['BROKERAGE_ADMIN', 'ADVISOR']), convertLeadToClient);

export default router;
