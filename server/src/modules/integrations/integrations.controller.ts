import { Request, Response, NextFunction } from 'express';
import { Integration } from './integration.model';
import crypto from 'crypto';
import { z } from 'zod';

const createIntegrationSchema = z.object({
  name: z.string().min(1),
  type: z.string().default('Webhook'),
});

export const getIntegrations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.brokerageId) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    const integrations = await Integration.find({ brokerageId: user.brokerageId }).sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', data: { integrations } });
  } catch (err) {
    next(err);
  }
};

export const createIntegration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.brokerageId) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    const payload = createIntegrationSchema.parse(req.body);

    const secretKey = `sec_${crypto.randomBytes(16).toString('hex')}`;

    const integration = await Integration.create({
      brokerageId: user.brokerageId,
      name: payload.name,
      type: payload.type,
      secretKey,
      active: true,
    });

    res.status(201).json({ status: 'success', data: { integration } });
  } catch (err) {
    next(err);
  }
};

export const revokeIntegration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    
    if (!user || !user.brokerageId) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }

    const integration = await Integration.findOne({ _id: id, brokerageId: user.brokerageId });

    if (!integration) {
      return res.status(404).json({ status: 'error', message: 'Integration not found' });
    }

    integration.active = false;
    await integration.save();

    res.status(200).json({ status: 'success', data: { integration } });
  } catch (err) {
    next(err);
  }
};
