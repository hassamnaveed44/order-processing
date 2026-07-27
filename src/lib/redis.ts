import Redis from 'ioredis';

/**
 * ioredis Connection Setup
 * Reads configuration from process.env to avoid hard-coded credentials.
 * Supports standard REDIS_HOST/REDIS_PORT or a full REDIS_URL string (e.g., Upstash Redis).
 * Configured with lazyConnect and retryStrategy to prevent application crashes when Redis is offline.
 */

let isRedisAvailable = false;

const getRedisConnectionOptions = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times: number) {
      if (times > 3) {
        // Stop spamming reconnect attempts if Redis is offline
        return null;
      }
      return Math.min(times * 200, 1000);
    },
  };
};

export const redisConnection = new Redis(getRedisConnectionOptions() as any);

redisConnection.on('connect', () => {
  isRedisAvailable = true;
  console.log('⚡ Connected to Redis instance successfully.');
});

redisConnection.on('error', (err) => {
  isRedisAvailable = false;
  // Graceful log without crashing process
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`ℹ️ Redis not detected on ${process.env.REDIS_HOST || '127.0.0.1'}:6379 (${err.message}). Using resilient background execution.`);
  }
});

export function checkRedisStatus(): boolean {
  return isRedisAvailable;
}
