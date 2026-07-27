import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * ⏰ EXTENSION: SCHEDULED CRON TASK ENDPOINT
 * 
 * Objective: Automated cleanup of stale or expired orders older than 24 hours.
 * 
 * Security: Protected via Authorization header checking CRON_SECRET.
 * Execution: Finds all orders in 'PENDING' or 'PROCESSING' status created > 24 hours ago
 * and updates their status to 'CANCELLED' in a single efficient SQL query.
 */

export async function GET(request: Request) {
  try {
    // Step 1: Security Authorization Check
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET || 'super-secret-cron-key-123';

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid Cron Secret' },
        { status: 401 }
      );
    }

    // Step 2: Calculate threshold (24 hours ago)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Step 3: Perform bulk update in PostgreSQL in 1 single SQL operation
    const updateResult = await prisma.order.updateMany({
      where: {
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
        createdAt: {
          lt: twentyFourHoursAgo,
        },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    console.log(`🧹 [CRON CLEANUP] Cancelled ${updateResult.count} stale orders older than 24h.`);

    return NextResponse.json(
      {
        success: true,
        message: 'Order cleanup task completed successfully',
        cancelledCount: updateResult.count,
        cutoffTimestamp: twentyFourHoursAgo.toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[CRON CLEANUP ERROR]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run cron cleanup',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
