import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrderSchema } from '@/lib/validations';

// Helper function to simulate artificial I/O blocking delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          details: 'Request body must be a valid JSON object containing userId and items.',
        },
        { status: 400 }
      );
    }

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
