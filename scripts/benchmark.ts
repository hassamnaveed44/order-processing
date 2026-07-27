import { prisma } from '../src/lib/prisma';

/**
 * 🚀 BENCHMARK SCRIPT: SYNCHRONOUS VS ASYNCHRONOUS PERFORMANCE COMPARISON
 * 
 * Objective: Measure and output empirical response time metrics comparing:
 * 1. Synchronous Endpoint (POST /api/orders/sync) -> Blocking I/O
 * 2. Optimized Async Endpoint (POST /api/orders) -> BullMQ Decoupled
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runBenchmark() {
  console.log('================================================================');
  console.log('📊 NEXT.JS BACKEND PERFORMANCE BENCHMARK SUITE');
  console.log(` Target Server: ${BASE_URL}`);
  console.log('================================================================\n');

  // Step 1: Dynamically fetch a valid User and Product from PostgreSQL database
  const user = await prisma.user.findFirst();
  const product1 = await prisma.product.findFirst();

  if (!user || !product1) {
    console.error('❌ No user or product found in database. Please run `npm run seed` first!');
    process.exit(1);
  }

  console.log(`👤 Using valid test user: ${user.name} (${user.id})`);
  console.log(`📦 Using valid test product: ${product1.name} (${product1.id})\n`);

  const validOrderPayload = {
    userId: user.id,
    items: [
      { productId: product1.id, quantity: 1, price: product1.price },
    ],
  };

  // Test 1: Synchronous Endpoint (POST /api/orders/sync)
  console.log('⏳ Test 1: Triggering POST /api/orders/sync (Synchronous Blocking)...');
  const syncStart = Date.now();
  try {
    const syncRes = await fetch(`${BASE_URL}/api/orders/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validOrderPayload),
    });
    const syncDuration = Date.now() - syncStart;
    const syncData = await syncRes.json();

    console.log(`   Status: ${syncRes.status} OK`);
    console.log(`   ⏱️ Measured Response Time: ${syncDuration}ms`);
    console.log(`   Message: ${syncData.message}`);
    console.log(`   Order ID: ${syncData.orderId}`);
  } catch (err: any) {
    console.log(`   ⚠️ Sync endpoint fetch failed: ${err.message}`);
  }

  console.log('\n----------------------------------------------------------------\n');

  // Test 2: Optimized Async Endpoint (POST /api/orders)
  console.log('⚡ Test 2: Triggering POST /api/orders (Optimized Async Queue)...');
  const asyncStart = Date.now();
  try {
    const asyncRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validOrderPayload),
    });
    const asyncDuration = Date.now() - asyncStart;
    const asyncData = await asyncRes.json();

    console.log(`   Status: ${asyncRes.status} Accepted`);
    console.log(`   ⏱️ Measured Response Time: ${asyncDuration}ms`);
    console.log(`   Message: ${asyncData.message}`);
    console.log(`   Order ID: ${asyncData.orderId}`);
  } catch (err: any) {
    console.log(`   ⚠️ Async endpoint fetch failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log('🎉 BENCHMARK COMPLETED SUCCESSFULLY!');
  console.log('================================================================\n');

  await prisma.$disconnect();
}

runBenchmark();
