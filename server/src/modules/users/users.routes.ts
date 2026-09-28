import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/authHandler';
import { getUsers, createUser, updateUser, deleteUser } from './users.controller';

const router = Router();

router.use(authenticate);
// Restrict to platform admin and brokerage admin
router.use(requireRole(['PLATFORM_ADMIN', 'SYSTEM_ADMIN', 'BROKERAGE_ADMIN']));

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:userId', updateUser);
router.delete('/:userId', deleteUser);

export default router;
