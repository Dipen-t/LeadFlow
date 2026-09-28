import { Router } from 'express';
import { upsertEmailTemplate, createTaskTemplate, getAutomationsByStage, deleteTaskTemplate } from './automations.controller';
import { authenticate, requireRole } from '../../middleware/authHandler';
import { requireBrokerage } from '../../middleware/tenantHandler';

const router = Router();

router.use(authenticate, requireBrokerage);

router.get('/stage/:pipelineStageId', getAutomationsByStage);

// Only admins can configure automations
router.post('/email-template', requireRole(['SYSTEM_ADMIN', 'BROKERAGE_ADMIN']), upsertEmailTemplate);
router.post('/task-template', requireRole(['SYSTEM_ADMIN', 'BROKERAGE_ADMIN']), createTaskTemplate);
router.delete('/task-template/:id', requireRole(['SYSTEM_ADMIN', 'BROKERAGE_ADMIN']), deleteTaskTemplate);

export default router;
