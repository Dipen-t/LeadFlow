import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Brokerage } from './brokerage.model';
import { PipelineStage } from '../pipeline/pipelineStage.model';
import { AppError } from '../../utils/errors';

const createBrokerageSchema = z.object({
  name: z.string().min(2),
});

const generateSlug = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
};

export const getBrokerages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerages = await Brokerage.find().sort({ createdAt: -1 });
    res.json({
      status: 'success',
      data: {
        brokerages
      }
    });
  } catch (err) {
    next(err);
  }
};

export const createBrokerage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = createBrokerageSchema.parse(req.body);
    
    let slug = generateSlug(name);
    
    // Check if slug exists
    const existing = await Brokerage.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
    }

    const brokerage = await Brokerage.create({
      name,
      slug,
    });

    // Create default pipeline stages for the new brokerage
    try {
      await PipelineStage.insertMany([
        { brokerageId: brokerage._id, name: 'NEW', order: 0, category: 'OPEN' },
        { brokerageId: brokerage._id, name: 'CONTACTED', order: 1, category: 'OPEN' },
        { brokerageId: brokerage._id, name: 'QUALIFIED', order: 2, category: 'OPEN' },
        { brokerageId: brokerage._id, name: 'WON', order: 3, category: 'WON' },
        { brokerageId: brokerage._id, name: 'LOST', order: 4, category: 'LOST' }
      ]);
    } catch (insertErr: any) {
      console.error('Failed to create default pipeline stages:', insertErr);
      // We log it, but we can still throw it so the request fails
      throw insertErr;
    }

    res.status(201).json({
      status: 'success',
      data: {
        brokerage
      }
    });
  } catch (err) {
    next(err);
  }
};

export const deleteBrokerage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await Brokerage.findByIdAndDelete(id);
    res.json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
};
