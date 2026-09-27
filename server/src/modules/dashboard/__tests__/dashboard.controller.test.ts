import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { Lead } from '../../leads/lead.model';
import { Document } from '../../documents/document.model';
import { Task } from '../../tasks/task.model';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

vi.mock('../../leads/lead.model');
vi.mock('../../documents/document.model');
vi.mock('../../tasks/task.model');
vi.mock('../../../jobs/documentWorker', () => ({ documentWorker: {} }));
vi.mock('../../../jobs/emailWorker', () => ({ emailWorker: {} }));

describe('Dashboard API', () => {
  const brokerageId = '123456789012345678901234';
  let adminToken: string;

  beforeEach(() => {
    vi.resetAllMocks();
    adminToken = jwt.sign({ userId: 'admin1', role: 'BROKERAGE_ADMIN', brokerageId }, env.JWT_SECRET);
  });

  it('should return aggregated metrics for the dashboard', async () => {
    vi.mocked(Lead.countDocuments)
      .mockResolvedValueOnce(50)  // ACTIVE
      .mockResolvedValueOnce(15)  // CONVERTED
      .mockResolvedValueOnce(5);  // LOST

    vi.mocked(Lead.aggregate).mockResolvedValue([
      { _id: 'stage1', count: 30 },
      { _id: 'stage2', count: 20 },
    ]);

    vi.mocked(Document.countDocuments)
      .mockResolvedValueOnce(10) // PENDING
      .mockResolvedValueOnce(2); // FAILED

    vi.mocked(Task.countDocuments).mockResolvedValue(4); // OVERDUE

    const res = await request(app)
      .get('/api/dashboard/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalLeads).toBe(50);
    expect(res.body.data.wonLeads).toBe(15);
    expect(res.body.data.lostLeads).toBe(5);
    expect(res.body.data.leadsByStage['stage1']).toBe(30);
    expect(res.body.data.pendingDocuments).toBe(10);
    expect(res.body.data.failedDocuments).toBe(2);
    expect(res.body.data.overdueTasks).toBe(4);
  });
});
