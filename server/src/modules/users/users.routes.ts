import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authHandler';
import { createUser, getUsers, deleteUser } from './users.controller';

const router = Router();

router.use(authenticate);
// Restrict to platform admin only
router.use(requireRole(['PLATFORM_ADMIN', 'SYSTEM_ADMIN']));

router.get('/', getUsers);
router.post('/', createUser);
router.delete('/:userId', deleteUser);

export default router;
