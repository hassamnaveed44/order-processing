import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/redis';
import { ORDER_QUEUE_NAME, OrderJobPayload } from '../lib/queue';

/**
 * 🏭 STANDALONE BULLMQ WORKER PROCESS
 * 
 * Objective: Process background tasks independently from the Next.js HTTP server.
 * Running worker as a separate process ensures that heavy external API calls or 
 * CPU-bound operations never block HTTP request handling threads.
 */

// Helper function to simulate background task delays
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simulated Task Handlers
 * In a production app, these functions would call SendGrid, AWS S3/PDF kit, Segment, etc.
 */
async function processConfirmationEmail(orderId: string, userId: string) {
  console.log(`  📧 Sending confirmation email for Order: ${orderId} to User: ${userId}...`);
  await delay(800);
  console.log(`  ✅ Confirmation email sent.`);
}

async function processInvoiceGeneration(orderId: string, total: number) {
  console.log(`  📄 Generating PDF invoice for Order: ${orderId} (Total: $${total})...`);
  await delay(1000);
  console.log(`  ✅ PDF invoice generated & saved to storage.`);
}

async function processAnalyticsRecording(orderId: string, itemCount: number) {
  console.log(`  📊 Recording analytics event for Order: ${orderId} (${itemCount} items)...`);
  await delay(400);
  console.log(`  ✅ Analytics event dispatched.`);
}

async function processInventoryUpdate(orderId: string, items: OrderJobPayload['items']) {
  console.log(`  📦 Updating inventory for ${items.length} product(s) in Order: ${orderId}...`);
  await delay(500);
  console.log(`  ✅ Inventory stock updated.`);
}

/**
 * BullMQ Worker Instance
 * Listens to Redis stream 'order-processing' and consumes jobs concurrently.
 */
export const orderWorker = new Worker<OrderJobPayload>(
  ORDER_QUEUE_NAME,
  async (job: Job<OrderJobPayload>) => {
    const { orderId, userId, items, total } = job.data;
    const attemptNumber = job.attemptsMade + 1;

    console.log(`\n==================================================`);
    console.log(`🚀 [WORKER] Processing Job ID: ${job.id} (Attempt ${attemptNumber}/${job.opts.attempts})`);
    console.log(`   Order ID: ${orderId} | Items: ${items.length} | Total: $${total}`);
    console.log(`==================================================`);

    // Optional simulated error test for demonstrating BullMQ automatic retries
    if (process.env.SIMULATE_WORKER_FAILURE === 'true' && attemptNumber === 1) {
      console.log(`⚠️ [WORKER SIMULATION] Injecting transient error on Attempt 1...`);
      throw new Error(`Simulated transient network failure on Attempt 1`);
    }

    // Step 1: Process Confirmation Email
    await processConfirmationEmail(orderId, userId);

    // Step 2: Process Invoice PDF Generation
    await processInvoiceGeneration(orderId, total);

    // Step 3: Process Analytics Recording
    await processAnalyticsRecording(orderId, items.length);

    // Step 4: Process Inventory Sync
    await processInventoryUpdate(orderId, items);

    return {
      status: 'PROCESSED_SUCCESSFULLY',
      processedAt: new Date().toISOString(),
    };
  },
  {
    connection: redisConnection as any,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

// Worker Event Listeners for telemetry, logging, and monitoring
orderWorker.on('completed', (job: Job) => {
  console.log(`🎉 [WORKER EVENT] Job ${job.id} (Order ${job.data.orderId}) completed successfully!`);
});

orderWorker.on('failed', (job: Job | undefined, err: Error) => {
  if (job) {
    console.error(
      `❌ [WORKER EVENT] Job ${job.id} (Order ${job.data.orderId}) failed! Attempt ${job.attemptsMade}/${job.opts.attempts}. Error: ${err.message}`
    );
  } else {
    console.error(`❌ [WORKER EVENT] Worker encountered an unknown failure: ${err.message}`);
  }
});

orderWorker.on('ready', () => {
  console.log(`🟢 BullMQ Worker is ready and listening for jobs on queue: '${ORDER_QUEUE_NAME}'`);
});

// Clean shutdown signal handling for graceful worker termination
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received. Closing BullMQ Worker gracefully...');
  await orderWorker.close();
  process.exit(0);
});
