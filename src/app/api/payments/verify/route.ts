import { prisma } from '@/lib/db';
import {
  ApiError,
  enforceRateLimit,
  handler,
  ok,
  parseBody,
  requireCapability,
} from '@/lib/api';
import { verifyPaymentSchema } from '@/lib/validation/business';
import { verifyCheckoutSignature } from '@/lib/integrations/payments';
import { notifyInternal } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { formatMoney } from '@/lib/format';

/**
 * POST /api/payments/verify
 *
 * Confirms a checkout callback. The signature is verified server-side before anything is
 * marked paid — a client claiming success is not evidence of payment, and this is the exact
 * point where a payment integration is usually got wrong.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('payment:create');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, verifyPaymentSchema);

  const payment = await prisma.payment.findFirst({
    where: { gatewayOrderId: input.orderId },
    include: { invoice: { select: { id: true, number: true, totalPaise: true, familyProfileId: true } } },
  });

  if (!payment) throw new ApiError('NOT_FOUND', 'That payment could not be found.');

  // A family may only confirm their own payment.
  if (user.role === 'FAMILY' && payment.invoice.familyProfileId !== user.familyProfileId) {
    throw new ApiError('NOT_FOUND', 'That payment could not be found.');
  }

  const valid = verifyCheckoutSignature({
    orderId: input.orderId,
    paymentId: input.paymentId,
    signature: input.signature,
  });

  if (!valid) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failureReason: 'Signature verification failed.' },
    });
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'payment.verify.failed',
      entity: 'Payment',
      entityId: payment.id,
      outcome: 'FAILURE',
      metadata: { reason: 'bad-signature' },
    });
    throw new ApiError(
      'FORBIDDEN',
      'We could not verify that payment. Nothing has been charged to your invoice — please contact us.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: input.paymentId,
        gatewaySignature: input.signature,
        status: 'CAPTURED',
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

  await notifyInternal({
    type: 'SYSTEM',
    title: 'Payment received',
    body: `${formatMoney(payment.amountPaise)} received against invoice ${payment.invoice.number}.`,
    href: '/app/admin/billing',
  }).catch((error) => log.warn('payment.notify.failed', { error: String(error) }));

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'payment.captured',
    entity: 'Payment',
    entityId: payment.id,
    metadata: { invoiceNumber: payment.invoice.number, amountPaise: payment.amountPaise },
  });

  return ok({ ok: true, message: 'Payment received. Thank you.' });
});
