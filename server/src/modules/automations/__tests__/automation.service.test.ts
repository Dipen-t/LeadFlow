import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerStageAutomations } from '../automation.service';
import { EmailTemplate, TaskTemplate } from '../automation.model';
import { Task } from '../../tasks/task.model';
import { Lead } from '../../leads/lead.model';
import { emailQueue } from '../../../jobs/emailQueue';
import mongoose from 'mongoose';

vi.mock('../automation.model');
vi.mock('../../tasks/task.model');
vi.mock('../../leads/lead.model');
vi.mock('../../../jobs/emailQueue', () => ({
  emailQueue: {
    add: vi.fn().mockResolvedValue(true),
  },
}));

describe('Automation Service (Phase 4)', () => {
  const brokerageId = new mongoose.Types.ObjectId();
  const pipelineStageId = new mongoose.Types.ObjectId();
  const leadId = new mongoose.Types.ObjectId();
  const advisorId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should explicitly enqueue an email job and NOT await its completion (async trigger)', async () => {
    vi.mocked(Lead.findById).mockResolvedValue({
      _id: leadId,
      email: 'client@test.com',
    } as any);

    vi.mocked(EmailTemplate.findOne).mockResolvedValue({
      subject: 'Welcome',
      body: 'Hello {{clientName}}',
    } as any);

    vi.mocked(TaskTemplate.find).mockResolvedValue([]);

    await triggerStageAutomations(brokerageId, pipelineStageId, leadId);

    // Verify 15.3 Pipeline Trigger logic
    expect(emailQueue.add).toHaveBeenCalledWith('send-email', {
      leadId,
      brokerageId,
      subjectTemplate: 'Welcome',
      bodyTemplate: 'Hello {{clientName}}',
    }, expect.objectContaining({ attempts: 3 }));
  });

  it('should generate Task models assigned to the Leads advisor for Task Automations', async () => {
    vi.mocked(Lead.findById).mockResolvedValue({
      _id: leadId,
      assignedAdvisorId: advisorId,
    } as any);

    vi.mocked(EmailTemplate.findOne).mockResolvedValue(null as any);

    vi.mocked(TaskTemplate.find).mockResolvedValue([
      { title: 'Call within 2 hours', dueInHours: 2 }
    ] as any);

    await triggerStageAutomations(brokerageId, pipelineStageId, leadId);

    // Verify 16.2 Trigger logic
    expect(Task.insertMany).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        brokerageId,
        leadId,
        assignedAdvisorId: advisorId,
        title: 'Call within 2 hours',
        status: 'PENDING',
      })
    ]));
  });
});
