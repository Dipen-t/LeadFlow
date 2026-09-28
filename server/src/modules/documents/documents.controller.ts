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

    if (req.user?.role !== 'CLIENT') {
      throw new AppError('Only clients are permitted to upload documents', 403);
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

    // Verify advisor permission
    if (req.user?.role === 'ADVISOR') {
      const client = await Client.findOne({ _id: clientId, brokerageId });
      if (!client) throw new NotFoundError('Client not found');
      
      const lead = await Lead.findOne({ _id: client.leadId, assignedAdvisorId: req.user.userId });
      if (!lead) {
        throw new AppError('Not authorized to view documents for this client', 403);
      }
    }

    const documents = await Document.find({ clientId, brokerageId }).sort({ uploadedAt: -1 });

    res.json({
      status: 'success',
      data: { documents },
    });
  } catch (err) {
    next(err);
  }
};

export const getAllDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query: any = {};
    if (req.user?.role !== 'SYSTEM_ADMIN') {
      query.brokerageId = req.user?.brokerageId;
    }

    if (req.user?.role === 'ADVISOR') {
      const myLeads = await Lead.find({ brokerageId: req.user.brokerageId, assignedAdvisorId: req.user.userId });
      const myClients = await Client.find({ leadId: { $in: myLeads.map(l => l._id) } });
      query.clientId = { $in: myClients.map(c => c._id) };
    }

    const documents = await Document.find(query)
      .sort({ uploadedAt: -1 })
      .populate('clientId', 'firstName lastName email'); // Populate client info

    res.json({
      status: 'success',
      data: { documents },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentId } = req.params;
    const query = req.user?.role === 'SYSTEM_ADMIN' 
      ? { _id: documentId } 
      : { _id: documentId, brokerageId: req.user?.brokerageId };

    const doc = await Document.findOneAndDelete(query);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    res.json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

export const downloadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentId } = req.params;
    const query = req.user?.role === 'SYSTEM_ADMIN' 
      ? { _id: documentId } 
      : { _id: documentId, brokerageId: req.user?.brokerageId };

    const doc = await Document.findOne(query);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    const response = await fetch(doc.storageKey);
    if (!response.ok) {
      logger.error({ status: response.status, statusText: response.statusText, url: doc.storageKey }, 'Cloudinary fetch failed');
      throw new AppError(`Failed to retrieve file: ${response.status} ${response.statusText}`, 502);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-disposition', `attachment; filename="${doc.originalName}"`);
    res.setHeader('Content-type', doc.mimeType);
    res.setHeader('Content-length', buffer.length);
    res.send(buffer);
  } catch (err) {
    logger.error({ err, documentId: req.params.documentId }, 'Failed to proxy document download');
    next(err);
  }
};
