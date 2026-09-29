import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { Document } from '../modules/documents/document.model';
import { broadcastToBrokerage } from '../sockets';
import { logger } from '../utils/logger';

// BullMQ Worker to process documents in the background autonomously
export const documentWorker = new Worker('document-verification', async (job: Job) => {
  const { documentId, brokerageId } = job.data;

  // 1. Mark as PROCESSING
  let doc = await Document.findById(documentId);
  if (!doc || doc.status === 'VERIFIED') return;

  doc.status = 'PROCESSING';
  doc.processingStartedAt = new Date();
  doc.processingAttempts += 1;
  await doc.save();

  // Notify clients
  broadcastToBrokerage(brokerageId, 'document.processing', { documentId: doc._id });
  logger.info({ event: 'document.processing_started', documentId: doc._id }, 'Document verification started');

  // 2. Simulate processing delay (8-12 seconds) as per assignment instructions
  const delay = Math.floor(Math.random() * 4000) + 8000;
  await new Promise(resolve => setTimeout(resolve, delay));

  // 3. Simulate occasional failures (e.g. 40% failure rate)
  const isFailure = Math.random() < 0.4;

  if (isFailure) {
     doc.status = 'FAILED';
     doc.failureReason = 'Simulated verification failure (could not read text)';
     doc.processedAt = new Date();
     await doc.save();
     
     broadcastToBrokerage(brokerageId, 'document.failed', { documentId: doc._id, reason: doc.failureReason });
     logger.warn({ event: 'document.processing_failed', documentId: doc._id, reason: doc.failureReason }, 'Document verification failed');
     return; // We return rather than throw so that it permanently fails and doesn't just eventually succeed via retries
  }

  // 4. Success state
  doc.status = 'VERIFIED';
  doc.processedAt = new Date();
  doc.failureReason = undefined;
  await doc.save();
  
  broadcastToBrokerage(brokerageId, 'document.verified', { documentId: doc._id });
  logger.info({ event: 'document.verified', documentId: doc._id }, `Document ${documentId} verified successfully`);

}, { 
  connection: redisConnection,
  concurrency: 5, 
});

documentWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed with error ${err.message}`);
});
