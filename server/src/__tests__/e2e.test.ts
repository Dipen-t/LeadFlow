import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { Brokerage } from '../modules/brokerages/brokerage.model';
import { User } from '../modules/users/user.model';
import { PipelineStage } from '../modules/pipeline/pipelineStage.model';
import { Lead } from '../modules/leads/lead.model';
import { Integration } from '../modules/integrations/integration.model';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import * as sockets from '../sockets';

vi.mock('../modules/brokerages/brokerage.model');
vi.mock('../modules/users/user.model');
vi.mock('../modules/pipeline/pipelineStage.model');
vi.mock('../modules/leads/lead.model');
vi.mock('../modules/integrations/integration.model');
vi.mock('../sockets');

describe('Critical E2E System Tests', () => {
  const brokerageAId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const brokerageBId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  let tokenA: string;
  let tokenB: string;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('1. Should successfully authenticate and issue JWTs', async () => {
    const mockUserA = {
      _id: 'userA',
      brokerageId: brokerageAId,
      role: 'BROKERAGE_ADMIN',
      status: 'ACTIVE',
      comparePassword: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(User.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue(mockUserA) } as any);

    const resA = await request(app).post('/api/auth/login').send({
      email: 'admin.a@test.com',
      password: 'password123',
    });
    
    expect(resA.status).toBe(200);
    tokenA = resA.body.data.token;
    expect(tokenA).toBeDefined();

    // Verify token payload
    const decoded = jwt.verify(tokenA, env.JWT_SECRET) as any;
    expect(decoded.brokerageId).toBe(brokerageAId);
  });

  it('2. Strict Tenant Isolation: Brokerage A cannot see Brokerage B data', async () => {
    tokenB = jwt.sign({ userId: 'userB', role: 'BROKERAGE_ADMIN', brokerageId: brokerageBId }, env.JWT_SECRET);
    
    // Admin B tries to fetch stages
    vi.mocked(PipelineStage.find).mockReturnValue({ sort: vi.fn().mockResolvedValue([]) } as any);

    const getStagesRes = await request(app)
      .get('/api/pipeline/stages')
      .set('Authorization', `Bearer ${tokenB}`);
      
    expect(getStagesRes.status).toBe(200);
    
    // Ensure the database query explicitly enforced Brokerage B's ID!
    expect(PipelineStage.find).toHaveBeenCalledWith({ brokerageId: brokerageBId });
  });

  it('3. Optimistic Concurrency: Should block simultaneous lead overwrites', async () => {
    tokenA = jwt.sign({ userId: 'userA', role: 'BROKERAGE_ADMIN', brokerageId: brokerageAId }, env.JWT_SECRET);

    const mockLead = {
      _id: 'leadA',
      version: 0,
      pipelineStageId: 'oldStage',
      save: vi.fn(),
    };
    
    vi.mocked(Lead.findOne).mockResolvedValue(mockLead as any);

    // Try to update with a stale version
    const moveRes = await request(app)
      .patch(`/api/leads/leadA/stage`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ pipelineStageId: '123456789012345678901234', version: 99 }); // Stale! Expected is 0

    expect(moveRes.status).toBe(409); // Conflict gracefully caught
    expect(moveRes.body.message).toContain('modified by another user');
    
    // Ensure it didn't save
    expect(mockLead.save).not.toHaveBeenCalled();
  });

  it('4. External Lead Webhook: Should securely ingest a lead and trigger socket event', async () => {
    const secretKey = 'zapier_secret_123';
    
    // Mock the integration lookup
    vi.mocked(Integration.findOne).mockResolvedValue({ 
      brokerageId: brokerageAId, 
      secretKey, 
      active: true 
    } as any);
    
    // Mock lead idempotency check (no existing lead)
    vi.mocked(Lead.findOne).mockResolvedValue(null as any);
    
    // Mock the pipeline stage fallback
    vi.mocked(PipelineStage.findOne).mockReturnValue({ 
      sort: vi.fn().mockResolvedValue({ _id: 'stage_id_123' }) 
    } as any);

    // Mock lead creation
    vi.mocked(Lead.create).mockResolvedValue({ _id: 'new_lead_id', firstName: 'Mark' } as any);

    const webhookRes = await request(app)
      .post(`/api/webhooks/leads/${secretKey}`)
      .send({
        firstName: 'Mark',
        lastName: 'Zuckerberg',
        email: 'mark@fb.com',
        source: 'Facebook Ads',
        externalId: 'fb_lead_001'
      });

    expect(webhookRes.status).toBe(201);
    expect(webhookRes.body.data.lead._id).toBe('new_lead_id');
    
    // Ensure the socket broadcast was triggered exactly once to Brokerage A's room
    expect(sockets.broadcastToBrokerage).toHaveBeenCalledWith(brokerageAId, 'lead.new', expect.any(Object));
  });
});
