import { Router } from 'express';
import { uploadDocument, getClientDocuments, deleteDocument } from './documents.controller';
import { authenticate } from '../../middleware/authHandler';
import { requireBrokerage } from '../../middleware/tenantHandler';
import { uploadMiddleware } from '../../utils/cloudinary';

const router = Router();

// All interactions require authentication and tenant isolation
router.use(authenticate, requireBrokerage);

router.get('/client/:clientId', getClientDocuments);

// Single file upload utilizing the configured Cloudinary template
router.post('/upload', uploadMiddleware.single('document'), uploadDocument);

router.delete('/:documentId', deleteDocument);

export default router;
