import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { Lead } from '../lead.model';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

vi.mock('../lead.model');

describe('Leads API', () => {
  const brokerageId = '123456789012345678901234';
  let advisorToken: string;

  beforeEach(() => {
    vi.resetAllMocks();
    advisorToken = jwt.sign({ userId: '2', role: 'ADVISOR', brokerageId }, env.JWT_SECRET);
  });

  describe('GET /api/leads', () => {
    it('should return active leads for the brokerage', async () => {
      vi.mocked(Lead.find).mockResolvedValue([{ firstName: 'Test' }] as any);

      const res = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${advisorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.leads).toHaveLength(1);
      expect(Lead.find).toHaveBeenCalledWith({ brokerageId, status: 'ACTIVE' });
    });
  });

  describe('PATCH /api/leads/:id/stage', () => {
    it('should return 409 Conflict if optimistic concurrency version fails', async () => {
      const mockLead = {
        _id: 'lead1',
        version: 2,
        pipelineStageId: 'oldStage',
        save: vi.fn(),
      };
      
      vi.mocked(Lead.findOne).mockResolvedValue(mockLead as any);

      const res = await request(app)
        .patch('/api/leads/lead1/stage')
        .set('Authorization', `Bearer ${advisorToken}`)
        .send({ pipelineStageId: '123456789012345678901234', version: 1 }); // Stale version

      expect(res.status).toBe(409);
      expect(mockLead.save).not.toHaveBeenCalled();
    });

    it('should update stage and increment version on successful concurrency match', async () => {
      const mockLead = {
        _id: 'lead1',
        version: 1,
        pipelineStageId: 'oldStage',
        save: vi.fn().mockResolvedValue(true),
      };
      
      vi.mocked(Lead.findOne).mockResolvedValue(mockLead as any);

      const res = await request(app)
        .patch('/api/leads/lead1/stage')
        .set('Authorization', `Bearer ${advisorToken}`)
        .send({ pipelineStageId: '123456789012345678901234', version: 1 });

      expect(res.status).toBe(200);
      expect(mockLead.pipelineStageId).toBe('123456789012345678901234');
      expect(mockLead.version).toBe(2);
      expect(mockLead.save).toHaveBeenCalled();
    });
  });
});
