import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { Lead } from '../lead.model';

describe('Lead Model', () => {
  it('should validate properly formed lead', async () => {
    const lead = new Lead({
      brokerageId: new mongoose.Types.ObjectId(),
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      source: 'Website',
      pipelineStageId: new mongoose.Types.ObjectId(),
    });

    const err = await lead.validate().catch(e => e);
    expect(err).toBeUndefined();
    expect(lead.status).toBe('ACTIVE');
  });

  it('should enforce required fields', async () => {
    const lead = new Lead({});
    const err: any = await lead.validate().catch(e => e);

    expect(err).toBeDefined();
    expect(err?.errors?.brokerageId).toBeDefined();
    expect(err?.errors?.firstName).toBeDefined();
    expect(err?.errors?.lastName).toBeDefined();
    expect(err?.errors?.source).toBeDefined();
    expect(err?.errors?.pipelineStageId).toBeDefined();
  });

  it('should enforce valid status enumeration', async () => {
    const lead = new Lead({
      brokerageId: new mongoose.Types.ObjectId(),
      firstName: 'Jane',
      lastName: 'Smith',
      source: 'Facebook',
      pipelineStageId: new mongoose.Types.ObjectId(),
      status: 'INVALID_STATUS',
    });

    const err: any = await lead.validate().catch(e => e);
    expect(err?.errors?.status).toBeDefined();
  });
});
