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

    // 4. Duplicate Person Recognition
    let duplicateOfId: any = undefined;
    let status: 'ACTIVE' | 'DUPLICATE' = 'ACTIVE';
    
    if (payload.email || payload.phone) {
      const orConditions = [];
      if (payload.email) orConditions.push({ email: payload.email });
      if (payload.phone) orConditions.push({ phone: payload.phone });
      
      const knownPerson = await Lead.findOne({ 
        brokerageId: integration.brokerageId, 
        $or: orConditions 
      });

      if (knownPerson) {
        logger.info({ event: 'lead.person_recognized', leadId: knownPerson._id }, 'Recognized an existing person based on email or phone');
        duplicateOfId = knownPerson._id;
        status = 'DUPLICATE';
      }
    }

    // 5. Resolve default pipeline stage
    let stage = await PipelineStage.findOne({ brokerageId: integration.brokerageId, category: 'OPEN' }).sort({ order: 1 });
    
    if (!stage) {
      // Fallback stage generation if the admin hasn't created any yet
      stage = await PipelineStage.create({ brokerageId: integration.brokerageId, name: 'NEW', order: 0, category: 'OPEN' });
    }

    // 6. Save normalized lead
    let lead;
    try {
      lead = await Lead.create({
        brokerageId: integration.brokerageId,
        ...payload,
        pipelineStageId: stage._id,
        status,
        duplicateOf: duplicateOfId,
        version: 0,
      });
    } catch (err: any) {
      if (err.code === 11000 && payload.externalId) {
        // Race condition handled: another request created it between step 3 and here
        const raceLead = await Lead.findOne({ 
          brokerageId: integration.brokerageId, 
          source: payload.source, 
          externalId: payload.externalId 
        });
        if (raceLead) {
          logger.info({ event: 'lead.race_condition_handled', leadId: raceLead._id }, 'Race condition handled for idempotent webhook');
          return res.status(200).json({ status: 'success', data: { lead: raceLead } });
        }
      }
      throw err;
    }

    // 7. Broadcast Real-Time socket event to the tenant's advisors
    broadcastToBrokerage(integration.brokerageId.toString(), 'lead.new', { lead });

    logger.info({ event: 'lead.created', leadId: lead._id }, 'Lead created via webhook');

    res.status(201).json({ status: 'success', data: { lead } });
  } catch (err) {
    next(err);
  }
};
