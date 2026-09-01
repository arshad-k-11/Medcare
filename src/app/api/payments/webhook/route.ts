import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/integrations/payments';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';

/**
 * POST /api/payments/webhook — the gateway's server-to-server confirmation.
 *
 * This is the authoritative record of payment, not the browser callback: a customer can
 * close the tab before the callback fires, and the money still moved.
 *
 * Notes on the implementation:
 *  * The raw body is read as text and verified before parsing. Verifying a re-serialised
 *    object is a classic way to break signature checks.
 *  * There is no session here — the signature *is* the authentication, so an unverified
 *    request is rejected outright rather than being handled "just in case".
 *  * Handling is idempotent: gateways retry, and a retry must not double-count a payment.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, signature)) {
    log.warn('payments.webhook.rejected', { reason: 'bad-signature' });
    // 400 rather than 401: this is a malformed/untrusted delivery, not a login problem.
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          method?: string;
          error_description?: string;
        };
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const entity = event.payload?.payment?.entity;
  if (!entity?.order_id) {
    // Acknowledge events we do not handle, so the gateway stops retrying them.
    return NextResponse.json({ received: true });
  }

  const payment = await prisma.payment.findFirst({
    where: { gatewayOrderId: entity.order_id },
    include: { invoice: { select: { id: true, number: true, totalPaise: true } } },
  });

  if (!payment) {
    log.warn('payments.webhook.unknown-order', { event: event.event });
    return NextResponse.json({ received: true });
  }

  // Idempotency: a retry of an already-captured payment is a no-op.
  if (payment.status === 'CAPTURED' && event.event === 'payment.captured') {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.event === 'payment.captured') {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CAPTURED',
          gatewayPaymentId: entity.id ?? payment.gatewayPaymentId,
          method: entity.method ?? payment.method,
        },
      });

      const paidTotal = await tx.payment.aggregate({
        where: { invoiceId: payment.invoiceId, status: 'CAPTURED' },
        _sum: { amountPaise: true },
      });
      const paid = paidTotal._sum.amountPaise ?? 0;

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          amountPaidPaise: paid,
          status: paid >= payment.invoice.totalPaise ? 'PAID' : 'PARTIAL',
          paidAt: paid >= payment.invoice.totalPaise ? new Date() : null,
        },
      });
    });

    await audit({
      action: 'payment.webhook.captured',
      entity: 'Payment',
      entityId: payment.id,
      metadata: { invoiceNumber: payment.invoice.number, source: 'webhook' },
    });
  } else if (event.event === 'payment.failed') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: entity.error_description ?? 'Payment failed.' },
    });
    await audit({
      action: 'payment.webhook.failed',
      entity: 'Payment',
      entityId: payment.id,
      outcome: 'FAILURE',
    });
  }

  return NextResponse.json({ received: true });
}
