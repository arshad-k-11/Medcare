import { prisma } from '@/lib/db';
import {
  ApiError,
  created,
  enforceRateLimit,
  handler,
  parseBody,
  requireCapability,
} from '@/lib/api';
import { createPaymentSchema } from '@/lib/validation/business';
import { createOrder, isPaymentsConfigured } from '@/lib/integrations/payments';
import { audit } from '@/lib/audit';
import { formatMoney } from '@/lib/format';

/**
 * POST /api/payments/create
 *
 * Creates a gateway order for an invoice. A family may only pay their own invoices, which
 * is enforced by scoping the invoice lookup to their family profile rather than checking
 * ownership after fetching it.
 *
 * With no gateway keys configured the adapter returns an unconfigured order and this route
 * says so plainly. The alternative — a checkout that silently fails at the last step of a
 * demo — is worse than an honest "not live yet".
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('payment:create');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, createPaymentSchema);

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: input.invoiceId,
      // A family is scoped to their own invoices in the query itself.
      ...(user.role === 'FAMILY' ? { familyProfileId: user.familyProfileId ?? '__none__' } : {}),
    },
    select: {
      id: true,
      number: true,
      totalPaise: true,
      amountPaidPaise: true,
      status: true,
      currency: true,
    },
  });

  if (!invoice) throw new ApiError('NOT_FOUND', 'That invoice could not be found.');
  if (invoice.status === 'PAID') {
    throw new ApiError('CONFLICT', 'That invoice has already been paid.');
  }
  if (invoice.status === 'VOID') {
    throw new ApiError('CONFLICT', 'That invoice has been cancelled.');
  }

  const amountDue = invoice.totalPaise - invoice.amountPaidPaise;
  if (amountDue <= 0) throw new ApiError('CONFLICT', 'There is nothing outstanding on that invoice.');

  const order = await createOrder({
    amountPaise: amountDue,
    receipt: invoice.number,
    notes: { invoiceId: invoice.id },
  });

  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      gateway: 'RAZORPAY',
      gatewayOrderId: order.orderId,
      amountPaise: amountDue,
      currency: invoice.currency,
      status: 'CREATED',
    },
    select: { id: true },
  });

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'payment.order.created',
    entity: 'Payment',
    entityId: payment.id,
    metadata: { invoiceNumber: invoice.number, amountPaise: amountDue, live: order.live },
  });

  return created({
    paymentId: payment.id,
    orderId: order.orderId,
    amountPaise: amountDue,
    currency: invoice.currency,
    keyId: order.keyId,
    live: order.live,
    configured: isPaymentsConfigured(),
    message: order.live
      ? `Ready to pay ${formatMoney(amountDue)}.`
      : `Online payment is not switched on yet, so this is a placeholder order for ${formatMoney(amountDue)}. Please pay by the method your coordinator arranged, and we will record it against this invoice.`,
  });
});
