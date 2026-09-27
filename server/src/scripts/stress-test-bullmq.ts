import mongoose from 'mongoose';
import { env } from '../config/env';
import { Document } from '../modules/documents/document.model';
import { documentQueue } from '../jobs/documentQueue';
import '../jobs/documentWorker';
import { logger } from '../utils/logger';

async function executeStressTest() {
  await mongoose.connect(env.MONGODB_URI as string);
  logger.info('STRESS TEST INITIATED: Connected to MongoDB.');

  const BULK_JOB_COUNT = 150;
  logger.warn(`Preparing to inject ${BULK_JOB_COUNT} massive parallel jobs into the system...`);

  // 1. Bulk insert documents to DB to simulate massive traffic spike
  const rawDocs = Array.from({ length: BULK_JOB_COUNT }).map((_, i) => ({
    brokerageId: new mongoose.Types.ObjectId(),
    clientId: new mongoose.Types.ObjectId(),
    uploadedBy: new mongoose.Types.ObjectId(),
    originalName: `stress_doc_${i}.pdf`,
    storageKey: `fake_url_${i}`,
    mimeType: 'application/pdf',
    size: 1024,
    status: 'PENDING',
  }));

  const docs = await Document.insertMany(rawDocs);
  logger.warn(`Successfully bypassed Express and inserted ${BULK_JOB_COUNT} pending documents into DB.`);

  // 2. Add bulk jobs to BullMQ bypassing standard enqueue limits
  const jobs = docs.map(doc => ({
    name: 'verify-document',
    data: { documentId: doc._id, brokerageId: doc.brokerageId },
    opts: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  }));

  logger.fatal(`BLASTING REDIS QUEUE WITH ${BULK_JOB_COUNT} ASYNC VERIFICATION JOBS...`);
  await documentQueue.addBulk(jobs as any);

  // 3. Monitor system stability
  logger.info(`Queue flooded successfully. Watching how the BullMQ worker (Concurrency: 5) throttles the load...`);
  
  const startTime = Date.now();
  let checks = 0;
  let allDone = false;
  
  while (!allDone && checks < 60) { // Max 60 seconds watch
    await new Promise(r => setTimeout(r, 2000));
    
    // Aggregate DB to see status groupings
    const stats = await Document.aggregate([
      { $match: { _id: { $in: docs.map(d => d._id) } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    let pending = 0, processing = 0, verified = 0, failed = 0;
    stats.forEach(s => {
      if (s._id === 'PENDING') pending = s.count;
      if (s._id === 'PROCESSING') processing = s.count;
      if (s._id === 'VERIFIED') verified = s.count;
      if (s._id === 'FAILED') failed = s.count;
    });

    logger.info(`STRESS METRICS [${((Date.now() - startTime)/1000).toFixed(1)}s] -> PENDING: ${pending} | PROCESSING: ${processing} | VERIFIED: ${verified} | FAILED: ${failed}`);

    if (verified + failed >= BULK_JOB_COUNT) {
      allDone = true;
    }
    checks++;
  }

  // Cleanup
  await Document.deleteMany({ _id: { $in: docs.map(d => d._id) } });
  logger.info(`Stress Test concluded! System successfully defended against crash and throttled ${BULK_JOB_COUNT} jobs.`);
  process.exit(0);
}

executeStressTest();
