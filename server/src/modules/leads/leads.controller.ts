import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Lead } from './lead.model';
import { NotFoundError, AppError } from '../../utils/errors';
import { broadcastToBrokerage } from '../../sockets';
import { triggerStageAutomations } from '../automations/automation.service';

const updateStageSchema = z.object({
  pipelineStageId: z.string().min(24),
  version: z.number().int().min(0),
});

export const getLeads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brokerageId = req.user?.brokerageId;
    
    // An advisor could optionally be restricted to only leads assigned to them.
    // For now, we fetch all active leads for the brokerage as per MVP.
    const leads = await Lead.find({ brokerageId, status: 'ACTIVE' });

    res.json({
      status: 'success',
      data: { leads },
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

    const lead = await Lead.findOne({ _id: id, brokerageId });
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    if (lead.version !== version) {
      // 409 Conflict logic
      throw new AppError('The lead was modified by another user. Please refresh to get the latest state.', 409);
    }

    const previousStageId = lead.pipelineStageId.toString();

    lead.pipelineStageId = pipelineStageId as any;
    lead.version = version + 1; // Increment version for next optimistic concurrency check

    await lead.save();

    // Trigger automations if the stage actually changed
    if (previousStageId !== pipelineStageId) {
      // 15.3 & 16.2 Pipeline Trigger: We explicitly do NOT await this. 
      // It executes fully out-of-band so provider delays/outages never block the HTTP response!
      triggerStageAutomations(brokerageId, lead.pipelineStageId, lead._id);
    }

    broadcastToBrokerage(brokerageId, 'lead.stageChanged', { lead });

    res.json({
      status: 'success',
      data: { lead },
    });
  } catch (err) {
    next(err);
  }
};
