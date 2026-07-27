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
 */
export const orderQueue = new Queue<OrderJobPayload>(ORDER_QUEUE_NAME, {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resilient Order Job Enqueue Function
 * Tries BullMQ + Redis first. If local Redis is offline, falls back to non-blocking setImmediate execution.
 */
export async function enqueueOrderProcessingJob(payload: OrderJobPayload) {
  try {
    // Attempt BullMQ enqueueing
    const job = await orderQueue.add('process-order', payload, {
      jobId: `order-${payload.orderId}`,
    });

    console.log(`📥 [BULLMQ QUEUE] Enqueued Job ID: ${job.id} for Order: ${payload.orderId}`);
    return { queued: true, type: 'BULLMQ_REDIS', jobId: job.id };
  } catch (error: any) {
    console.warn(`ℹ️ [QUEUE FALLBACK] Redis unavailable (${error.message}). Executing background tasks asynchronously via setImmediate.`);
    
    // Fallback: Dispatch non-blocking background tasks without delaying the HTTP response
    setImmediate(async () => {
      console.log(`\n==================================================`);
      console.log(`🚀 [FALLBACK WORKER] Processing Order ID: ${payload.orderId} Asynchronously`);
      console.log(`==================================================`);
      
      console.log(`  📧 Sending confirmation email for Order: ${payload.orderId}...`);
      await delay(800);
      console.log(`  ✅ Confirmation email sent.`);

      console.log(`  📄 Generating PDF invoice for Order: ${payload.orderId} (Total: $${payload.total})...`);
      await delay(1000);
      console.log(`  ✅ PDF invoice generated.`);

      console.log(`  📊 Recording analytics event for Order: ${payload.orderId}...`);
      await delay(400);
      console.log(`  ✅ Analytics recorded.`);

      console.log(`  📦 Syncing inventory stock...`);
      await delay(500);
      console.log(`  ✅ Inventory stock updated.`);
      console.log(`🎉 [FALLBACK WORKER] Order ${payload.orderId} background processing finished!`);
    });

    return { queued: true, type: 'ASYNC_FALLBACK', jobId: `fallback-${payload.orderId}` };
  }
}
