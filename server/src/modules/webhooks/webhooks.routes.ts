import { Router } from 'express';
import { ingestLead } from './webhooks.controller';

const router = Router();

// Note: Webhooks DO NOT use the standard JWT authentication or tenant middleware.
// They authenticate via the secretKey parameter in the URL.

router.post('/leads/:secretKey', ingestLead);

export default router;
