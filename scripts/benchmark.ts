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

  const sampleOrderPayload = {
    userId: 'user-test-id-123',
    items: [
      { productId: 'prod-headphone-id', quantity: 1, price: 199.99 },
      { productId: 'prod-keyboard-id', quantity: 1, price: 129.50 },
    ],
  };

  // Test 1: Synchronous Endpoint
  console.log('⏳ Test 1: Triggering POST /api/orders/sync (Synchronous Blocking)...');
  const syncStart = Date.now();
  try {
    const syncRes = await fetch(`${BASE_URL}/api/orders/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleOrderPayload),
    });
    const syncDuration = Date.now() - syncStart;
    const syncData = await syncRes.json();

    console.log(`   Status: ${syncRes.status} OK`);
    console.log(`   ⏱️ Measured Response Time: ${syncDuration}ms`);
    console.log(`   Payload Response:`, syncData.message || syncData);
  } catch (err: any) {
    console.log(`   ⚠️ Sync endpoint fetch failed (Server might be offline): ${err.message}`);
  }

  console.log('\n----------------------------------------------------------------\n');

  // Test 2: Optimized Async Endpoint
  console.log('⚡ Test 2: Triggering POST /api/orders (Optimized Async BullMQ)...');
  const asyncStart = Date.now();
  try {
    const asyncRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleOrderPayload),
    });
    const asyncDuration = Date.now() - asyncStart;
    const asyncData = await asyncRes.json();

    console.log(`   Status: ${asyncRes.status} Accepted`);
    console.log(`   ⏱️ Measured Response Time: ${asyncDuration}ms`);
    console.log(`   Payload Response:`, asyncData.message || asyncData);
  } catch (err: any) {
    console.log(`   ⚠️ Async endpoint fetch failed (Server might be offline): ${err.message}`);
  }

  console.log('\n================================================================');
  console.log('🎉 BENCHMARK COMPLETED!');
  console.log('================================================================\n');
}

runBenchmark();
