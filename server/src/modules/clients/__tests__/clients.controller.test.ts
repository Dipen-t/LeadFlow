import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { Client } from '../client.model';
import { Lead } from '../../leads/lead.model';
import { User } from '../../users/user.model';
import * as sockets from '../../../sockets';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

vi.mock('../client.model');
vi.mock('../../leads/lead.model');
vi.mock('../../users/user.model');
vi.mock('../../../sockets');

describe('Clients API - Conversion', () => {
  const brokerageId = '123456789012345678901234';
  let advisorToken: string;

  beforeEach(() => {
    vi.resetAllMocks();
    advisorToken = jwt.sign({ userId: '2', role: 'ADVISOR', brokerageId }, env.JWT_SECRET);
  });

  it('should return 404 if lead is not found', async () => {
    vi.mocked(Lead.findOne).mockResolvedValue(null as any);

    const res = await request(app)
      .post('/api/clients/convert/some-lead-id')
      .set('Authorization', `Bearer ${advisorToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Lead not found');
  });

  it('should handle idempotency and return existing client if lead already converted', async () => {
    vi.mocked(Lead.findOne).mockResolvedValue({
      _id: 'lead123',
      status: 'CONVERTED',
    } as any);

    vi.mocked(Client.findOne).mockResolvedValue({
      _id: 'client123',
      firstName: 'Existing',
    } as any);

    const res = await request(app)
      .post('/api/clients/convert/lead123')
      .set('Authorization', `Bearer ${advisorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.client._id).toBe('client123');
    expect(Client.create).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  it('should create user, create client, update lead status, and emit socket on successful conversion', async () => {
    const mockLead = {
      _id: 'lead123',
      status: 'ACTIVE',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      save: vi.fn(),
    };
    
    vi.mocked(Lead.findOne).mockResolvedValue(mockLead as any);
    vi.mocked(User.findOne).mockResolvedValue(null as any); // User doesn't exist yet
    vi.mocked(User.create).mockResolvedValue({ _id: 'user123' } as any);
    vi.mocked(Client.create).mockResolvedValue({ _id: 'client123', firstName: 'John' } as any);

    const res = await request(app)
      .post('/api/clients/convert/lead123')
      .set('Authorization', `Bearer ${advisorToken}`);

    expect(res.status).toBe(201);
    expect(res.body.data.temporaryPassword).toBeDefined(); // MVP returned password
    
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'john.doe@test.com',
      role: 'CLIENT',
    }));
    
    expect(Client.create).toHaveBeenCalledWith(expect.objectContaining({
      leadId: 'lead123',
      userId: 'user123',
    }));
    
    expect(mockLead.status).toBe('CONVERTED');
    expect(mockLead.save).toHaveBeenCalled();
    
    expect(sockets.broadcastToBrokerage).toHaveBeenCalledWith(brokerageId, 'lead.converted', expect.any(Object));
  });

  it('should return 409 if the lead email already belongs to a staff account', async () => {
    vi.mocked(Lead.findOne).mockResolvedValue({
      _id: 'lead123',
      email: 'staff@test.com',
      status: 'ACTIVE',
    } as any);

    vi.mocked(User.findOne).mockResolvedValue({
      _id: 'user123',
      role: 'ADVISOR', // Not a client
    } as any);

    const res = await request(app)
      .post('/api/clients/convert/lead123')
      .set('Authorization', `Bearer ${advisorToken}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('registered as a staff account');
  });

  it('should handle E11000 concurrency error gracefully during Client creation', async () => {
    vi.mocked(Lead.findOne).mockResolvedValue({
      _id: 'lead123',
      email: 'john@test.com',
      status: 'ACTIVE',
    } as any);
    
    vi.mocked(User.findOne).mockResolvedValue(null as any);
    vi.mocked(User.create).mockResolvedValue({ _id: 'user123' } as any);
    
    // Simulate E11000 Duplicate Key Error thrown by MongoDB
    const duplicateError = new Error('Duplicate key');
    (duplicateError as any).code = 11000;
    vi.mocked(Client.create).mockRejectedValue(duplicateError);
    
    // The catch block will try to fetch the existing client
    vi.mocked(Client.findOne).mockResolvedValue({
      _id: 'concurrent_client_123'
    } as any);

    const res = await request(app)
      .post('/api/clients/convert/lead123')
      .set('Authorization', `Bearer ${advisorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('concurrently');
    expect(res.body.data.client._id).toBe('concurrent_client_123');
  });
});
