import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Lead } from './lead.model';
import { User } from '../users/user.model';
import { NotFoundError, AppError } from '../../utils/errors';
import { broadcastToBrokerage } from '../../sockets';
import { triggerStageAutomations } from '../automations/automation.service';
import { logger } from '../../utils/logger';

const updateStageSchema = z.object({
  pipelineStageId: z.string().min(24),
  version: z.number().int().min(0),
});

const createLeadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  source: z.string().default('Manual'),
  pipelineStageId: z.string().min(24),
});

export const getLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const query: any = { brokerageId, status: 'ACTIVE' };
    
    // Advisors now have access to all leads in the brokerage

    const leads = await Lead.find(query);

    res.json({
      status: 'success',
      data: { leads },
    });
  } catch (err) {
    next(err);
  }
};

export const createLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const data = createLeadSchema.parse(req.body);

    const leadData: any = {
      brokerageId,
      ...data,
      externalId: `manual_${Date.now()}` // Fake external ID since it's manual
    };



    const lead = await Lead.create(leadData);

    broadcastToBrokerage(brokerageId as string, 'lead.created', { lead });

    res.status(201).json({
      status: 'success',
      data: { lead },
    });
  } catch (err) {
    next(err);
  }
};

export const moveLeadStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    const { id } = req.params;
    const { pipelineStageId, version } = updateStageSchema.parse(req.body);

    const query: any = { _id: id, brokerageId };

    const lead = await Lead.findOne(query);
    if (!lead) {
      throw new NotFoundError('Lead not found or unauthorized');
    }

    if (lead.__v !== version) {
      throw new AppError('The lead was modified by another user. Please refresh to get the latest state.', 409);
    }

    const previousStageId = lead.pipelineStageId.toString();

    lead.pipelineStageId = pipelineStageId as any;
    
    // Mongoose handles __v incrementing automatically on save when optimisticConcurrency is true.
    await lead.save();

    // Trigger automations if the stage actually changed
    if (previousStageId !== pipelineStageId) {
      // 15.3 & 16.2 Pipeline Trigger: We explicitly do NOT await this. 
      triggerStageAutomations(brokerageId as any, lead.pipelineStageId as any, lead._id as any, req.user?.userId as any);
    }

    broadcastToBrokerage(brokerageId as string, 'lead.stageChanged', { lead });
    logger.info({ event: 'lead.stage_changed', leadId: lead._id, stageId: pipelineStageId }, 'Lead moved to a new stage');

    res.json({
      status: 'success',
      data: { lead },
    });
  } catch (err) {
    next(err);
  }
};


