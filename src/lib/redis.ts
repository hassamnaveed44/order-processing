import Redis from 'ioredis';

/**
 * ioredis Connection Setup
 * Reads configuration from process.env to avoid hard-coded credentials.
 * Supports standard REDIS_HOST/REDIS_PORT or a full REDIS_URL string.
 */

const getRedisConnectionOptions = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
    enableReadyCheck: false,
  };
};

export const redisConnection = new Redis(getRedisConnectionOptions() as any);

redisConnection.on('connect', () => {
  console.log('⚡ Connected to Redis instance successfully.');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
});
