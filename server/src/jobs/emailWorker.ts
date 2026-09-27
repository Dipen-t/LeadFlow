import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { Lead } from '../modules/leads/lead.model';
import { User } from '../modules/users/user.model';
import { logger } from '../utils/logger';

// Simulated Email Provider Delay & Failure
async function sendEmailProvider(to: string, subject: string, body: string) {
  // Simulate 1s latency for external API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate random 10% provider failure for backoff testing
  if (Math.random() < 0.1) {
    throw new Error('Email Provider 503 Service Unavailable');
  }
  
  logger.info(`Email successfully dispatched to ${to} | Subject: ${subject}`);
}

export const emailWorker = new Worker('email-automation', async (job: Job) => {
  const { leadId, subjectTemplate, bodyTemplate, brokerageId } = job.data;

  // 1. Fetch Trusted Server-Side Data
  const lead = await Lead.findById(leadId);
  if (!lead || !lead.email) {
    logger.warn(`Skipping email job ${job.id}: Lead ${leadId} not found or missing email`);
    return; // Fast fail if no email
  }

  let advisorName = 'Our Team';
  if (lead.assignedAdvisorId) {
    const advisor = await User.findById(lead.assignedAdvisorId);
    if (advisor) {
      advisorName = advisor.name;
    }
  }

  const clientName = lead.firstName; // Or full name if preferred

  // 2. Render Template securely
  // Requirement 15.2: Backend should render placeholders from trusted server-side data, no arbitrary injection.
  const renderedSubject = subjectTemplate
    .replace(/\{\{clientName\}\}/g, clientName)
    .replace(/\{\{advisorName\}\}/g, advisorName);

  const renderedBody = bodyTemplate
    .replace(/\{\{clientName\}\}/g, clientName)
    .replace(/\{\{advisorName\}\}/g, advisorName);

  // 3. Dispatch to simulated provider
  await sendEmailProvider(lead.email, renderedSubject, renderedBody);
}, {
  connection: redisConnection,
  concurrency: 10,
});

emailWorker.on('failed', (job, err) => {
  logger.error(`Email Job ${job?.id} failed with error ${err.message}. Retrying via BullMQ backoff...`);
});
