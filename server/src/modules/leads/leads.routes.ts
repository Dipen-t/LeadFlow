import { Router } from 'express';
import { getLeads, moveLeadStage, createLead, assignLead } from './leads.controller';
import { authenticate, requireRole } from '../../middleware/authHandler';
import { requireBrokerage } from '../../middleware/tenantHandler';

const router = Router();

// All lead interactions require authentication and a tenant context
router.use(authenticate, requireBrokerage);

router.get('/', requireRole(['BROKERAGE_ADMIN', 'ADVISOR']), getLeads);
router.post('/', requireRole(['BROKERAGE_ADMIN']), createLead);
router.post('/:id/assign', requireRole(['BROKERAGE_ADMIN']), assignLead);
router.patch('/:id/stage', requireRole(['BROKERAGE_ADMIN', 'ADVISOR']), moveLeadStage);

export default router;
