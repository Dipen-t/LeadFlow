import { EmailTemplate, TaskTemplate } from './automation.model';
import { emailQueue } from '../../jobs/emailQueue';
import { Task } from '../tasks/task.model';
import { Lead } from '../leads/lead.model';
import mongoose from 'mongoose';
import { logger } from '../../utils/logger';

export const triggerStageAutomations = async (
  brokerageId: mongoose.Types.ObjectId,
  pipelineStageId: mongoose.Types.ObjectId,
  leadId: mongoose.Types.ObjectId,
  actingUserId?: mongoose.Types.ObjectId
) => {
  try {
    const lead = await Lead.findById(leadId);
    if (!lead) return;

    // 1. Process Email Automations
    const emailTemplate = await EmailTemplate.findOne({ brokerageId, pipelineStageId });
    if (emailTemplate && lead.email) {
      // 15.3 Trigger async email job so provider outage doesn't block stage change
      await emailQueue.add('send-email', {
        leadId,
        brokerageId,
        subjectTemplate: emailTemplate.subject,
        bodyTemplate: emailTemplate.body,
      }, {
        attempts: 3, // 15.4 Retry where appropriate if provider fails
        backoff: { type: 'exponential', delay: 2000 },
      });
      logger.info({ event: 'email.queued', leadId }, `Email automation queued for Lead ${leadId}`);
    }

    // 2. Process Task Automations
    // Use assigned advisor, fallback to the user who triggered the stage change
    const targetAdvisorId = lead.assignedAdvisorId || actingUserId;

    if (targetAdvisorId) {
      const taskTemplates = await TaskTemplate.find({ brokerageId, pipelineStageId });
      
      if (taskTemplates.length > 0) {
        // Prevent duplicate tasks if lead goes back and forth
        const existingTasks = await Task.find({ brokerageId, leadId, status: 'PENDING' });
        const existingTitles = new Set(existingTasks.map(t => t.title));

        const templatesToCreate = taskTemplates.filter(t => !existingTitles.has(t.title));

        if (templatesToCreate.length > 0) {
          const tasksToCreate = templatesToCreate.map(template => {
            const dueAt = new Date();
            dueAt.setHours(dueAt.getHours() + template.dueInHours); // 16.1 Due calculations

            return {
              brokerageId,
              leadId,
              assignedAdvisorId: targetAdvisorId,
              title: template.title,
              dueAt,
              status: 'PENDING',
            };
          });

          await Task.insertMany(tasksToCreate);
          logger.info({ event: 'task.created', leadId, taskCount: tasksToCreate.length }, `${tasksToCreate.length} task automations assigned to Advisor ${targetAdvisorId} for Lead ${leadId}`);
        }
      }
    } else {
      logger.warn({ event: 'automation.task_skipped', leadId }, 'Task automations skipped because lead has no assigned advisor and no acting user provided');
    }

  } catch (err: any) {
    logger.error({ err, message: err.message }, 'Critical error executing stage automations');
    console.error('CRITICAL AUTOMATION ERROR:', err);
    // We explicitly catch and swallow errors here so that automation failures 
    // never roll back or block the primary pipeline stage movement (Section 15.3).
  }
};
