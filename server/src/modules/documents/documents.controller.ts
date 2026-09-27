import { Request, Response, NextFunction } from 'express';
import { Document } from './document.model';
import { Client } from '../clients/client.model';
import { documentQueue } from '../../jobs/documentQueue';
import { NotFoundError, AppError } from '../../utils/errors';
import { z } from 'zod';
import { logger } from '../../utils/logger';

const uploadSchema = z.object({
  clientId: z.string().min(24),
});

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const { clientId } = uploadSchema.parse(req.body);
    const file = req.file;

    if (!file) {
      throw new AppError('File is required', 400);
    }

    // 1. Verify Client belongs to this exact brokerage
    const client = await Client.findOne({ _id: clientId, brokerageId });
    if (!client) {
      throw new NotFoundError('Client not found');
    }

    // 2. Create Document persistent record tracking Cloudinary URL
    const doc = await Document.create({
      brokerageId,
      clientId,
      uploadedBy: req.user?.userId,
      originalName: file.originalname,
      storageKey: file.path, // Populated via Cloudinary upload middleware template
      mimeType: file.mimetype,
      size: file.size,
      status: 'PENDING',
    });

    // 3. Enqueue verification into background worker queue
    await documentQueue.add('verify-document', {
      documentId: doc._id,
      brokerageId: brokerageId.toString(),
    }, {
      attempts: 3, // Retry behavior spec 14.3
      backoff: { type: 'exponential', delay: 1000 },
    });

    // 4. Return 202 Accepted allowing client UX to remain fluid
    logger.info({ event: 'document.uploaded', documentId: doc._id }, 'Document successfully uploaded and verification queued');
    res.status(202).json({
      status: 'success',
      data: { document: doc },
    });
  } catch (err) {
    next(err);
  }
};

export const getClientDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const { clientId } = req.params;

    const documents = await Document.find({ clientId, brokerageId }).sort({ uploadedAt: -1 });

    res.json({
      status: 'success',
      data: { documents },
    });
  } catch (err) {
    next(err);
  }
};
