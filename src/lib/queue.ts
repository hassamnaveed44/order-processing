import { Queue } from 'bullmq';
import { redisConnection } from './redis';

// Name of the BullMQ Queue for order processing jobs
export const ORDER_QUEUE_NAME = 'order-processing';

export interface OrderJobPayload {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  createdAt: string;
}

/**
 * BullMQ Order Queue Singleton Instance
 * Producers (Route Handlers) push jobs into this queue.
 * BullMQ automatically serializes jobs and writes them to Redis streams.
 */
export const orderQueue = new Queue<OrderJobPayload>(ORDER_QUEUE_NAME, {
  connection: redisConnection as any,
  defaultJobOptions: {
    // Retry policy: Retry up to 3 times on failure
    attempts: 3,
    // Backoff policy: Exponential delay starting at 1000ms (1s, 2s, 4s...)
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    // Auto-clean completed jobs from Redis to maintain low memory overhead
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/**
 * Helper function to enqueue an order processing job cleanly
 */
export async function enqueueOrderProcessingJob(payload: OrderJobPayload) {
  const job = await orderQueue.add('process-order', payload, {
    jobId: `order-${payload.orderId}`, // Unique job ID prevents duplicate processing
  });

  console.log(`📥 [QUEUE PRODUCER] Enqueued Job ID: ${job.id} for Order: ${payload.orderId}`);
  return job;
}
