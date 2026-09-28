import { Router } from 'express';
import { uploadDocument, getClientDocuments, deleteDocument, getAllDocuments, downloadDocument } from './documents.controller';
import { authenticate } from '../../middleware/authHandler';
import { requireBrokerage } from '../../middleware/tenantHandler';
import { uploadMiddleware } from '../../utils/cloudinary';

const router = Router();

// All interactions require authentication and tenant isolation
router.use(authenticate, requireBrokerage);

router.get('/', getAllDocuments);
router.get('/client/:clientId', getClientDocuments);
router.get('/:documentId/download', downloadDocument);

// Single file upload utilizing the configured Cloudinary template
router.post('/upload', uploadMiddleware.single('document'), uploadDocument);

router.delete('/:documentId', deleteDocument);

export default router;
