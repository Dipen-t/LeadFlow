import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PipelineStage } from './pipelineStage.model';
import { NotFoundError } from '../../utils/errors';

const createStageSchema = z.object({
  name: z.string().min(1),
  order: z.number().int().min(0),
  category: z.enum(['OPEN', 'WON', 'LOST']).default('OPEN'),
});

const updateStageSchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
  category: z.enum(['OPEN', 'WON', 'LOST']).optional(),
});

export const getStages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const stages = await PipelineStage.find({ brokerageId }).sort({ order: 1 });
    
    res.json({
      status: 'success',
      data: { stages },
    });
  } catch (err) {
    next(err);
  }
};

export const createStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const data = createStageSchema.parse(req.body);

    const stage = await PipelineStage.create({
      ...data,
      brokerageId: brokerageId as string,
    });

    res.status(201).json({
      status: 'success',
      data: { stage },
    });
  } catch (err) {
    next(err);
  }
};

export const updateStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const { id } = req.params;
    const data = updateStageSchema.parse(req.body);

    const stage = await PipelineStage.findOneAndUpdate(
      { _id: id, brokerageId },
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!stage) {
      throw new NotFoundError('Pipeline stage not found');
    }

    res.json({
      status: 'success',
      data: { stage },
    });
  } catch (err) {
    next(err);
  }
};
