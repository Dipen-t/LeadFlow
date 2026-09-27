import mongoose from 'mongoose';
import { env } from '../config/env';
import { Document } from '../modules/documents/document.model';
import { documentQueue } from '../jobs/documentQueue';
import '../jobs/documentWorker'; // Import to start the worker
import { logger } from '../utils/logger';

async function testBullMQ() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI as string);
    logger.info('MongoDB connected!');

    // 1. Create a dummy document record
    const doc = await Document.create({
      brokerageId: new mongoose.Types.ObjectId(), // Dummy
      clientId: new mongoose.Types.ObjectId(), // Dummy
      uploadedBy: new mongoose.Types.ObjectId(), // Dummy
      originalName: 'test_document.pdf',
      storageKey: 'fake_url',
      mimeType: 'application/pdf',
      size: 1024,
      status: 'PENDING',
    });

    logger.info(`Created dummy document with ID: ${doc._id} (Status: PENDING)`);

    // 2. Add job to BullMQ
    logger.info('Adding verification job to BullMQ...');
    await documentQueue.add('verify-document', {
      documentId: doc._id,
      brokerageId: doc.brokerageId,
    });

    logger.info('Job successfully queued. Waiting for worker to process (takes 2-4 seconds)...');

    // 3. Poll the document status
    let attempts = 0;
    while (attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedDoc = await Document.findById(doc._id);
      logger.info(`Current Document Status: ${updatedDoc?.status}`);
      
      if (updatedDoc?.status === 'VERIFIED' || updatedDoc?.status === 'FAILED') {
        logger.info(`Processing complete! Final Status: ${updatedDoc.status}`);
        
        // Clean up
        await Document.findByIdAndDelete(doc._id);
        logger.info('Cleaned up dummy document.');
        process.exit(0);
      }
      attempts++;
    }
    
    logger.error('Worker did not process the document in time!');
    process.exit(1);

  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

testBullMQ();
