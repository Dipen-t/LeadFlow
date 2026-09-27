import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { PipelineStage } from '../pipelineStage.model';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

vi.mock('../pipelineStage.model');

describe('Pipeline API', () => {
  const brokerageId = '123456789012345678901234';
  let adminToken: string;
  let advisorToken: string;

  beforeEach(() => {
    vi.resetAllMocks();
    adminToken = jwt.sign({ userId: '1', role: 'BROKERAGE_ADMIN', brokerageId }, env.JWT_SECRET);
    advisorToken = jwt.sign({ userId: '2', role: 'ADVISOR', brokerageId }, env.JWT_SECRET);
  });

  describe('GET /api/pipeline/stages', () => {
    it('should return stages for the user brokerage', async () => {
      const mockQuery = { sort: vi.fn().mockResolvedValue([{ name: 'NEW', order: 0 }]) };
      vi.mocked(PipelineStage.find).mockReturnValue(mockQuery as any);

      const res = await request(app)
        .get('/api/pipeline/stages')
        .set('Authorization', `Bearer ${advisorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stages).toHaveLength(1);
      expect(PipelineStage.find).toHaveBeenCalledWith({ brokerageId });
    });
  });

  describe('POST /api/pipeline/stages', () => {
    it('should deny ADVISOR from creating stages', async () => {
      const res = await request(app)
        .post('/api/pipeline/stages')
        .set('Authorization', `Bearer ${advisorToken}`)
        .send({ name: 'QUALIFIED', order: 1 });

      expect(res.status).toBe(403);
    });

    it('should allow BROKERAGE_ADMIN to create stages', async () => {
      vi.mocked(PipelineStage.create).mockResolvedValue({ _id: 'stage1', name: 'QUALIFIED' } as any);

      const res = await request(app)
        .post('/api/pipeline/stages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'QUALIFIED', order: 1 });

      expect(res.status).toBe(201);
      expect(res.body.data.stage.name).toBe('QUALIFIED');
    });
  });
});
