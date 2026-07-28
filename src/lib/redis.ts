import Redis from 'ioredis';

/**
 * ioredis Connection Setup
 * Reads configuration from process.env to avoid hard-coded credentials.
 * Supports standard REDIS_HOST/REDIS_PORT or a full REDIS_URL string (e.g. Upstash Redis with TLS).
 */

let isRedisAvailable = false;

const createRedisInstance = () => {
  const isTls = process.env.REDIS_URL?.startsWith('rediss://');

  const options = {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
  };

  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, options);
  }

  return new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ...options,
  });
};

export const redisConnection = createRedisInstance();

redisConnection.on('connect', () => {
  isRedisAvailable = true;
  console.log('⚡ Connected to Redis instance successfully.');
});

redisConnection.on('error', (err) => {
  isRedisAvailable = false;
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`ℹ️ Redis notice: ${err.message}`);
  }
});

export function checkRedisStatus(): boolean {
  return isRedisAvailable;
}
