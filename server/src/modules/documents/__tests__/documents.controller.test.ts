import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { Document } from '../document.model';
import { Client } from '../../clients/client.model';
import { documentQueue } from '../../../jobs/documentQueue';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

// Mock Cloudinary Middleware to bypass real file uploads during testing
vi.mock('../../../utils/cloudinary', () => ({
  uploadMiddleware: {
    single: () => (req: any, res: any, next: any) => {
      // Simulate Multer injecting the file into the request
      req.file = {
        path: 'https://res.cloudinary.com/test-url/test.pdf',
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 5000,
      };
      next();
    },
  },
  cloudinary: {},
}));

vi.mock('../document.model');
vi.mock('../../clients/client.model');
vi.mock('../../../jobs/documentQueue', () => ({
  documentQueue: {
    add: vi.fn().mockResolvedValue(true),
  },
}));

// Mock BullMQ Worker so it doesn't try to connect to Redis
vi.mock('../../../jobs/documentWorker', () => ({
  documentWorker: {},
}));

describe('Documents API', () => {
  const brokerageId = '123456789012345678901234';
  let token: string;

  beforeEach(() => {
    vi.resetAllMocks();
    token = jwt.sign({ userId: 'user1', role: 'CLIENT', brokerageId }, env.JWT_SECRET);
  });

  it('should return 404 if client does not belong to the authenticated brokerage', async () => {
    vi.mocked(Client.findOne).mockResolvedValue(null as any);

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: 'client_12345678901234567' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Client not found');
  });

  it('should upload document, save to DB, and queue background verification', async () => {
    vi.mocked(Client.findOne).mockResolvedValue({ _id: 'client_id' } as any);
    
    vi.mocked(Document.create).mockResolvedValue({
      _id: 'doc123',
      storageKey: 'https://res.cloudinary.com/test-url/test.pdf',
    } as any);

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ clientId: 'client_12345678901234567' });

    // Assert 202 Accepted allowing client to leave page without waiting
    expect(res.status).toBe(202); 
    expect(res.body.data.document._id).toBe('doc123');

    // Assert Cloudinary metadata was persisted
    expect(Document.create).toHaveBeenCalledWith(expect.objectContaining({
      originalName: 'test.pdf',
      storageKey: 'https://res.cloudinary.com/test-url/test.pdf',
      status: 'PENDING',
    }));

    // Assert background verification job was enqueued correctly
    expect(documentQueue.add).toHaveBeenCalledWith('verify-document', {
      documentId: 'doc123',
      brokerageId,
    }, expect.objectContaining({ attempts: 3 }));
  });
});
