import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

// BullMQ Queue instance to schedule document processing jobs
export const documentQueue = new Queue('document-verification', { connection: redisConnection });
