import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authHandler';
import { getBrokerages, createBrokerage, deleteBrokerage } from './brokerages.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole(['PLATFORM_ADMIN']));

router.get('/', getBrokerages);
router.post('/', createBrokerage);
router.delete('/:id', deleteBrokerage);

export default router;
