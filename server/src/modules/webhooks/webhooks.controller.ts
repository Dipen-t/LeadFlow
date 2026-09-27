import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Integration } from '../integrations/integration.model';
import { Lead } from '../leads/lead.model';
import { PipelineStage } from '../pipeline/pipelineStage.model';
import { broadcastToBrokerage } from '../../sockets';
import { logger } from '../../utils/logger';

const leadIngestionSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  source: z.string().default('Webhook'),
  externalId: z.string().optional(),
});

export const ingestLead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { secretKey } = req.params;
    
    // 1. Resolve brokerage from the secret key securely
    const integration = await Integration.findOne({ secretKey, active: true });
    
    if (!integration) {
      return res.status(401).json({ status: 'error', message: 'Invalid or inactive integration key' });
    }

    // 2. Validate payload securely
    const payload = leadIngestionSchema.parse(req.body);

    // 3. Idempotency Check
    if (payload.externalId) {
       const existingLead = await Lead.findOne({ 
         brokerageId: integration.brokerageId, 
         source: payload.source, 
         externalId: payload.externalId 
       });

       if (existingLead) {
          logger.info({ event: 'lead.duplicate_detected', leadId: existingLead._id }, `Idempotent webhook hit for lead ${existingLead._id}`);
          return res.status(200).json({ status: 'success', data: { lead: existingLead } });
       }
    }

    // 4. Resolve default pipeline stage
    let stage = await PipelineStage.findOne({ brokerageId: integration.brokerageId, category: 'OPEN' }).sort({ order: 1 });
    
    if (!stage) {
      // Fallback stage generation if the admin hasn't created any yet
      stage = await PipelineStage.create({ brokerageId: integration.brokerageId, name: 'NEW', order: 0, category: 'OPEN' });
    }

    // 5. Save normalized lead
    const lead = await Lead.create({
      brokerageId: integration.brokerageId,
      ...payload,
      pipelineStageId: stage._id,
      version: 0,
    });

    // 6. Broadcast Real-Time socket event to the tenant's advisors
    broadcastToBrokerage(integration.brokerageId.toString(), 'lead.new', { lead });

    logger.info({ event: 'lead.created', leadId: lead._id }, 'Lead created via webhook');

    res.status(201).json({ status: 'success', data: { lead } });
  } catch (err) {
    next(err);
  }
};
