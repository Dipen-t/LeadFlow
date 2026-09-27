import { Router } from 'express';
import { login, getMe, logout } from './auth.controller';
import { authenticate } from '../../middleware/authHandler';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
