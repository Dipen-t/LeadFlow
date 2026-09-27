import mongoose from 'mongoose';
import { env } from '../config/env';
import { Document } from '../modules/documents/document.model';
import { documentQueue } from '../jobs/documentQueue';
import { QueueEvents } from 'bullmq';
import { redisConnection } from '../config/redis';
import '../jobs/documentWorker';
import { logger } from '../utils/logger';

async function testPhase3Requirements() {
  await mongoose.connect(env.MONGODB_URI as string);
  logger.info('Connected to MongoDB.');

  const queueEvents = new QueueEvents('document-verification', { connection: redisConnection });
  
  // Requirement 14.1 & 14.2: Independent jobs & HTTP 202 paradigm
  logger.info('--- TESTING 14.1 & 14.2: INDEPENDENT JOBS ---');
  const docs = await Promise.all([1, 2, 3, 4, 5].map(async (i) => {
    return Document.create({
      brokerageId: new mongoose.Types.ObjectId(),
      clientId: new mongoose.Types.ObjectId(),
      uploadedBy: new mongoose.Types.ObjectId(),
      originalName: `test_doc_${i}.pdf`,
      storageKey: `fake_url_${i}`,
      mimeType: 'application/pdf',
      size: 1024,
      status: 'PENDING',
    });
  }));

  // Enqueue all independently (this represents the instant HTTP 202 return)
  // We configured attempts: 3 to test Requirement 14.3 Retry behavior
  const jobs = await Promise.all(docs.map(doc => documentQueue.add('verify-document', {
    documentId: doc._id,
    brokerageId: doc.brokerageId,
  }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } })));

  logger.info(`5 jobs instantly queued! (Clients receive HTTP 202 Accepted without waiting)`);

  // Track events for Requirement 14.3 (Retry behavior)
  queueEvents.on('failed', async ({ jobId, failedReason }) => {
    logger.warn(`Job ${jobId} encountered failure: ${failedReason}. BullMQ will automatically trigger backoff retry!`);
  });

  queueEvents.on('completed', async ({ jobId }) => {
    logger.info(`Job ${jobId} successfully completed verification!`);
  });

  // Poll database state every 1.5 seconds to watch them process independently
  let allDone = false;
  let checks = 0;
  
  while (!allDone && checks < 15) {
    await new Promise(r => setTimeout(r, 1500));
    const currentDocs = await Document.find({ _id: { $in: docs.map(d => d._id) } });
    
    currentDocs.forEach(d => {
      // 14.4 Simulated Checker creates 20% random failures, so we might see attempt 1 -> fail -> attempt 2
      logger.info(`Doc ${d.originalName} | Status: ${d.status} | Processing Attempts: ${d.processingAttempts}`);
    });

    // Check if they are all in terminal states (either VERIFIED or hit max retries and FAILED)
    allDone = currentDocs.every(d => d.status === 'VERIFIED' || (d.status === 'FAILED' && d.processingAttempts >= 3));
    
    logger.info('-----------------------------------');
    checks++;
  }

  if (allDone) {
    logger.info('SUCCESS: All independent jobs verified or exhausted their retries flawlessly.');
  } else {
    logger.error('TIMEOUT: Jobs failed to reach terminal states within expected timeframe.');
  }

  // Cleanup
  await Document.deleteMany({ _id: { $in: docs.map(d => d._id) } });
  logger.info('Cleaned up testing artifacts from DB.');
  process.exit(0);
}

testPhase3Requirements();
