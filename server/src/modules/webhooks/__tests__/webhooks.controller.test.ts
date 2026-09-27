import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { Integration } from '../../integrations/integration.model';
import { Lead } from '../../leads/lead.model';
import { PipelineStage } from '../../pipeline/pipelineStage.model';
import * as sockets from '../../../sockets';

vi.mock('../../integrations/integration.model');
vi.mock('../../leads/lead.model');
vi.mock('../../pipeline/pipelineStage.model');
vi.mock('../../../sockets');

describe('Webhooks API', () => {
  const secretKey = 'test-secret-key';
  const brokerageId = '123456789012345678901234';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 for an invalid integration key', async () => {
    vi.mocked(Integration.findOne).mockResolvedValue(null as any);

    const res = await request(app).post('/api/webhooks/leads/invalid-key').send({
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid or inactive integration key');
  });

  it('should process idempotent duplicate lead correctly and return 200', async () => {
    vi.mocked(Integration.findOne).mockResolvedValue({ brokerageId, secretKey } as any);
    
    // Simulate finding an existing lead with the same externalId
    vi.mocked(Lead.findOne).mockResolvedValue({ _id: 'existing-lead', firstName: 'John' } as any);

    const res = await request(app).post(`/api/webhooks/leads/${secretKey}`).send({
      firstName: 'John',
      lastName: 'Doe',
      externalId: 'ext-123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.lead._id).toBe('existing-lead');
    expect(Lead.create).not.toHaveBeenCalled();
    expect(sockets.broadcastToBrokerage).not.toHaveBeenCalled();
  });

  it('should create a new lead and emit socket event on successful ingestion', async () => {
    vi.mocked(Integration.findOne).mockResolvedValue({ brokerageId, secretKey } as any);
    vi.mocked(Lead.findOne).mockResolvedValue(null as any); // No existing lead
    
    const mockStage = { _id: 'stage1' };
    vi.mocked(PipelineStage.findOne).mockReturnValue({ sort: vi.fn().mockResolvedValue(mockStage) } as any);
    
    vi.mocked(Lead.create).mockResolvedValue({ _id: 'new-lead', firstName: 'Jane' } as any);

    const res = await request(app).post(`/api/webhooks/leads/${secretKey}`).send({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      source: 'Facebook Lead Ads',
    });

    expect(res.status).toBe(201);
    expect(Lead.create).toHaveBeenCalledWith(expect.objectContaining({
      brokerageId,
      firstName: 'Jane',
      lastName: 'Smith',
      pipelineStageId: 'stage1',
      source: 'Facebook Lead Ads',
    }));
    
    expect(sockets.broadcastToBrokerage).toHaveBeenCalledWith(brokerageId, 'lead.new', expect.any(Object));
  });
});
