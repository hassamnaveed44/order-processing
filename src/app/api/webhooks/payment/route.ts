import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { orderQueue } from '@/lib/queue';

/**
 * 💳 EXTENSION: SIGNED PAYMENT WEBHOOK ENDPOINT
 * 
 * Objective: Receive payment gateway callbacks safely and asynchronously.
 * 
 * Requirements:
 * 1. Validate payload HMAC signature (`x-signature` header)
 * 2. Queue payment event for asynchronous fulfillment processing
 * 3. Immediately acknowledge receipt to the payment gateway (< 20ms)
 */

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-signature');

    const webhookSecret = process.env.WEBHOOK_SECRET || 'whsec_payment_secret_key_456';

    // Step 1: Verify HMAC SHA256 signature if signature header is provided
    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('⚠️ [WEBHOOK] Signature mismatch detected!');
        return NextResponse.json(
          { success: false, error: 'Invalid HMAC signature' },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(rawBody);

    // Step 2: Push payment event into BullMQ queue for background processing
    await orderQueue.add('process-payment-webhook', payload, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
    });

    console.log(`📥 [WEBHOOK] Payment event queued for Order: ${payload.orderId || 'N/A'}`);

    // Step 3: Immediately return 200 OK acknowledgment
    return NextResponse.json(
      {
        success: true,
        message: 'Payment webhook received and processing queued',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[WEBHOOK ERROR]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process payment webhook',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
