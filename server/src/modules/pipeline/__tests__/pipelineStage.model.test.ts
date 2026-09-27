import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { PipelineStage } from '../pipelineStage.model';

describe('PipelineStage Model', () => {
  it('should validate correctly with required fields', async () => {
    const stage = new PipelineStage({
      brokerageId: new mongoose.Types.ObjectId(),
      name: 'NEW',
    });
    
    const err = await stage.validate().catch(e => e);
    expect(err).toBeUndefined();
    expect(stage.category).toBe('OPEN');
    expect(stage.order).toBe(0);
  });

  it('should throw validation error if brokerageId or name is missing', async () => {
    const stage = new PipelineStage({});
    const err: any = await stage.validate().catch(e => e);
    
    expect(err).toBeDefined();
    expect(err?.errors?.brokerageId).toBeDefined();
    expect(err?.errors?.name).toBeDefined();
  });

  it('should reject invalid categories', async () => {
    const stage = new PipelineStage({
      brokerageId: new mongoose.Types.ObjectId(),
      name: 'WON',
      category: 'INVALID_CAT',
    });
    
    const err: any = await stage.validate().catch(e => e);
    expect(err?.errors?.category).toBeDefined();
  });
});
