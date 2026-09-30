import { Router } from 'express';
import { getIntegrations, createIntegration, revokeIntegration } from './integrations.controller';
import { authenticate, requireRole } from '../../middleware/authHandler';

const router = Router();

// Only Admins should manage integrations
router.use(authenticate);
router.use(requireRole(['BROKERAGE_ADMIN', 'PLATFORM_ADMIN']));

router.get('/', getIntegrations);
router.post('/', createIntegration);
router.patch('/:id/revoke', revokeIntegration);

export default router;
