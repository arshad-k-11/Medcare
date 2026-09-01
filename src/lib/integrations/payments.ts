import { createHmac, timingSafeEqual } from 'node:crypto';
import { log } from '../log';

/**
 * Payment gateway adapter (Razorpay-shaped).
 *
 * Razorpay is the target for India. Keys come from the environment only — there are no
 * credentials in this repository, and with keys absent the adapter reports itself
 * unconfigured so the UI can show an honest "payments not yet live" state instead of
 * failing at the last step of a demo.
 *
 * Flow: create order → client checkout → verify signature server-side → webhook
 * confirms. Signature verification is implemented for real, because that is the part
 * that must never be stubbed once keys arrive.
 */

export type GatewayOrder = {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string | null;
  /** True when a real gateway order was created; false when running unconfigured. */
  live: boolean;
  note?: string;
};

export function isPaymentsConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export async function createOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<GatewayOrder> {
  if (!isPaymentsConfigured()) {
    // A deterministic placeholder id lets the rest of the flow (invoice, audit,
    // reconciliation view) be exercised without a gateway account.
    return {
      orderId: `unconfigured_${input.receipt}`,
      amountPaise: input.amountPaise,
      currency: 'INR',
      keyId: null,
      live: false,
      note: 'Payment gateway keys are not configured, so no live order was created.',
    };
  }

  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
  ).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt,
      notes: input.notes ?? {},
    }),
  });

  if (!response.ok) {
    log.error('payments.order.failed', { status: response.status, receipt: input.receipt });
    throw new Error('Could not create the payment order. Please try again.');
  }

  const order = (await response.json()) as { id: string; amount: number; currency: string };
  return {
    orderId: order.id,
    amountPaise: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID ?? null,
    live: true,
  };
}

/** Verifies the checkout callback signature: HMAC-SHA256 of `order_id|payment_id`. */
export function verifyCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex');
  return safeEqual(expected, input.signature);
}

/** Verifies a webhook body against the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
