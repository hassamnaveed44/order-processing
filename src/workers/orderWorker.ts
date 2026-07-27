import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/redis';
import { ORDER_QUEUE_NAME, OrderJobPayload } from '../lib/queue';

/**
 * 🏭 STANDALONE BULLMQ WORKER PROCESS
 * 
 * Objective: Process background tasks independently from the Next.js HTTP server.
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

console.log(`⏳ Connecting BullMQ Worker to Redis stream: '${ORDER_QUEUE_NAME}'...`);

export const orderWorker = new Worker<OrderJobPayload>(
  ORDER_QUEUE_NAME,
  async (job: Job<OrderJobPayload>) => {
    const { orderId, userId, items, total } = job.data;
    const attemptNumber = job.attemptsMade + 1;

    console.log(`\n==================================================`);
    console.log(`🚀 [BULLMQ WORKER] Processing Job ID: ${job.id} (Attempt ${attemptNumber}/${job.opts.attempts})`);
    console.log(`   Order ID: ${orderId} | Items: ${items.length} | Total: $${total}`);
    console.log(`==================================================`);

    // Step 1: Confirmation Email
    await processConfirmationEmail(orderId, userId);

    // Step 2: Invoice Generation
    await processInvoiceGeneration(orderId, total);

    // Step 3: Analytics Recording
    await processAnalyticsRecording(orderId, items.length);

    // Step 4: Inventory Update
    await processInventoryUpdate(orderId, items);

    return { status: 'PROCESSED_SUCCESSFULLY', processedAt: new Date().toISOString() };
  },
  {
    connection: redisConnection as any,
    concurrency: 5,
  }
);

orderWorker.on('completed', (job: Job) => {
  console.log(`🎉 [WORKER EVENT] Job ${job.id} (Order ${job.data.orderId}) completed successfully!`);
});

orderWorker.on('failed', (job: Job | undefined, err: Error) => {
  if (job) {
    console.error(
      `❌ [WORKER EVENT] Job ${job.id} (Order ${job.data.orderId}) failed! Attempt ${job.attemptsMade}/${job.opts.attempts}. Error: ${err.message}`
    );
  }
});

orderWorker.on('ready', () => {
  console.log(`🟢 BullMQ Worker is ready and listening for jobs on queue: '${ORDER_QUEUE_NAME}'`);
});

orderWorker.on('error', (err) => {
  console.warn(`ℹ️ [WORKER NOTICE] Redis unavailable: ${err.message}. If Redis is offline, background execution is handled by Next.js fallback queue.`);
});
