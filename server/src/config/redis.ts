import Redis from 'ioredis';
import { env } from './env';

// For local testing, default to 127.0.0.1 if REDIS_URL is missing to avoid IPv6 resolution issues on Windows Docker
export const redisConnection = new Redis((env as any).REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});
