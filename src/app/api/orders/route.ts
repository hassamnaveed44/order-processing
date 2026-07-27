import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrderSchema } from '@/lib/validations';
import { enqueueOrderProcessingJob } from '@/lib/queue';

/**
 * ⚡ OPTIMIZED ENDPOINT: ASYNCHRONOUS ORDER CREATION
 * 
 * Objective: Demonstrate production-grade async request handling.
 * Route handlers must NOT execute slow background operations before responding.
 * 
 * Flow:
 * 1. Validate request body synchronously
 * 2. Save Order & OrderItems to PostgreSQL database synchronously
 * 3. Enqueue job payload to BullMQ (Redis stream) in ~5ms
 * 4. Return HTTP 202 Accepted IMMEDIATELY (< 50ms total response time!)
 */

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Step 1: Validate payload schema synchronously
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

    // Calculate total order cost
    const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // Step 2: Save Order and OrderItems synchronously in PostgreSQL
    // Only required synchronous data creation is executed inside the route handler
    const order = await prisma.order.create({
      data: {
        userId,
        status: 'PROCESSING',
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

    // Step 3: Offload non-essential work (emails, PDF invoice, analytics, inventory) to BullMQ
    await enqueueOrderProcessingJob({
      orderId: order.id,
      userId: order.userId,
      items: order.orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      total: order.total,
      createdAt: order.createdAt.toISOString(),
    });

    const executionTimeMs = Date.now() - startTime;
    console.log(`⚡ [ASYNC ENDPOINT] Order ${order.id} created and queued in ${executionTimeMs}ms`);

    // Step 4: Return HTTP 202 Accepted immediately!
    return NextResponse.json(
      {
        success: true,
        message: 'Order created and processing started',
        orderId: order.id,
        metrics: {
          executionType: 'ASYNCHRONOUS_DECOUPLED',
          totalResponseTimeMs: executionTimeMs,
        },
      },
      { status: 202 } // HTTP 202 Accepted: Request received & queued
    );
  } catch (error: any) {
    console.error('[ASYNC ENDPOINT ERROR]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create order',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
