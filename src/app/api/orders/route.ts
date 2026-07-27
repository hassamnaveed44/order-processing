import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrderSchema } from '@/lib/validations';
import { enqueueOrderProcessingJob } from '@/lib/queue';

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

    // Step 3: Offload non-essential work to BullMQ / queue
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
      { status: 202 }
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

export async function GET() {
  const startTime = Date.now();

  try {
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    const formattedOrders = orders.map((order) => ({
      orderId: order.id,
      status: order.status,
      total: order.total,
      customerName: order.user.name,
      createdAt: order.createdAt,
    }));

    const executionTimeMs = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        count: formattedOrders.length,
        metrics: {
          executionTimeMs,
          queryOptimization: 'N+1_FREE_FIELD_PROJECTION',
        },
        orders: formattedOrders,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[GET ORDERS ERROR]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
