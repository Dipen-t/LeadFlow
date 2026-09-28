import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Brokerage } from './brokerage.model';
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
      settings: {
        branding: {
          primaryColor: '#000000',
        },
        features: {
          enableClientPortal: true,
          enableAutomations: true
        }
      }
    });

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
