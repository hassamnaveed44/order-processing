import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrderSchema } from '@/lib/validations';

/**
 * ⚠️ DEMO / ANTI-PATTERN ENDPOINT: SYNCHRONOUS ORDER CREATION
 * 
 * Objective: Demonstrate why route handlers should NOT perform slow or 
 * non-essential operations synchronously before returning an HTTP response.
 * 
 * Flow:
 * 1. Validate request body
 * 2. Save order to PostgreSQL database via Prisma
 * 3. [BLOCKING] Simulate sending confirmation email (1000ms delay)
 * 4. [BLOCKING] Simulate generating invoice PDF (1200ms delay)
 * 5. [BLOCKING] Simulate recording analytics event (500ms delay)
 * 6. [BLOCKING] Simulate updating external inventory (500ms delay)
 * 7. Return HTTP 200 OK after ~3.2 - 3.5 seconds!
 */

// Helper function to simulate artificial I/O blocking delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Step 1: Validate input payload
    const validationResult = createOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { userId, items } = validationResult.data;

    // Calculate order total sum
    const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // Step 2: Save Order and OrderItems synchronously in PostgreSQL
    const order = await prisma.order.create({
      data: {
        userId,
        status: 'COMPLETED',
        total,
        orderItems: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });

    // ------------------------------------------------------------------------
    // 🛑 BLOCKING SYNCHRONOUS OPERATIONS (ANTI-PATTERN)
    // In production, keeping the HTTP socket open for external services 
    // causes high latency, poor UX, and connection pool exhaustion.
    // ------------------------------------------------------------------------

    console.log(`[SYNC ENDPOINT] Order ${order.id} saved in DB. Starting synchronous background tasks...`);

    // Step 3: Simulate sending confirmation email (1000ms)
    console.log(`[SYNC ENDPOINT] [1/4] Sending confirmation email...`);
    await delay(1000);

    // Step 4: Simulate generating invoice PDF (1200ms)
    console.log(`[SYNC ENDPOINT] [2/4] Generating PDF invoice...`);
    await delay(1200);

    // Step 5: Simulate recording analytics (500ms)
    console.log(`[SYNC ENDPOINT] [3/4] Recording analytics data...`);
    await delay(500);

    // Step 6: Simulate updating inventory system (500ms)
    console.log(`[SYNC ENDPOINT] [4/4] Syncing inventory counts...`);
    await delay(500);

    const totalDuration = Date.now() - startTime;
    console.log(`[SYNC ENDPOINT] All operations finished. Total latency: ${totalDuration}ms`);

    // Step 7: Return response only after ALL operations complete
    return NextResponse.json(
      {
        success: true,
        message: 'Order created synchronously after executing all blocking tasks',
        orderId: order.id,
        metrics: {
          executionType: 'SYNCHRONOUS_BLOCKING',
          totalResponseTimeMs: totalDuration,
        },
        order,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[SYNC ENDPOINT ERROR]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process order synchronously',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
