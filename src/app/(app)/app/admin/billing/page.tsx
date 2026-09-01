import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, Stat, StatusPill, Table, Td } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { revenueMetrics } from '@/lib/queries/analytics';
import { formatCompactMoney, formatDate, formatMoney, formatName } from '@/lib/format';
import { invoiceStatus } from '@/lib/status';
import { isPaymentsConfigured } from '@/lib/integrations/payments';
import { titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Billing',
  robots: { index: false, follow: false },
};

export default async function AdminBillingPage() {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);

  const [invoices, subscriptions, revenue, payments] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      take: 100,
      include: {
        familyProfile: { include: { user: { select: { name: true } } } },
        senior: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.subscription.findMany({
      where: { status: { in: ['ACTIVE', 'PAST_DUE'] } },
      include: {
        package: { select: { name: true } },
        senior: { select: { firstName: true, lastName: true } },
        familyProfile: { include: { user: { select: { name: true } } } },
      },
    }),
    revenueMetrics(),
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { invoice: { select: { number: true } } },
    }),
  ]);

  const overdue = invoices.filter((invoice) => invoice.status === 'OVERDUE');
  const outstanding = invoices
    .filter((invoice) => ['SENT', 'PARTIAL', 'OVERDUE'].includes(invoice.status))
    .reduce((sum, invoice) => sum + (invoice.totalPaise - invoice.amountPaidPaise), 0);

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Invoices, subscriptions and payments."
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
      />

      {!isPaymentsConfigured() ? (
        <Alert tone="warning" title="No payment gateway is configured" className="mb-6">
          <p>
            Razorpay keys are not set, so online payment is not live. Invoices, records and
            reconciliation all work; the checkout step does not. Set RAZORPAY_KEY_ID,
            RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET to switch it on.
          </p>
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Monthly recurring"
          value={formatCompactMoney(revenue.mrrPaise)}
          hint={`${revenue.activeSubscriptions} active plans`}
          tone="success"
        />
        <Stat label="Collected this month" value={formatCompactMoney(revenue.paidThisMonthPaise)} />
        <Stat
          label="Outstanding"
          value={formatCompactMoney(outstanding)}
          tone={outstanding > 0 ? 'warning' : 'neutral'}
        />
        <Stat
          label="Overdue invoices"
          value={overdue.length}
          tone={overdue.length > 0 ? 'danger' : 'success'}
        />
      </div>

      <Card className="mb-6">
        <CardHeader title="Invoices" />
        {invoices.length ? (
          <Table
            caption="Invoices"
            head={['Invoice', 'Family', 'Patient', 'Amount', 'Due', 'Status']}
          >
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <Td className="font-medium text-ink-900">{invoice.number}</Td>
                <Td>{invoice.familyProfile.user.name}</Td>
                <Td>
                  {invoice.senior ? (
                    <Link
                      href={`/app/admin/patients/${invoice.senior.id}`}
                      className="text-brand-800 hover:underline"
                    >
                      {formatName(invoice.senior)}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {formatMoney(invoice.totalPaise)}
                  {invoice.amountPaidPaise > 0 && invoice.amountPaidPaise < invoice.totalPaise ? (
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {formatMoney(invoice.amountPaidPaise)} paid
                    </span>
                  ) : null}
                </Td>
                <Td className="whitespace-nowrap">
                  {invoice.dueDate ? (
                    <span
                      className={
                        invoice.status === 'OVERDUE' ? 'font-semibold text-danger' : 'text-ink-700'
                      }
                    >
                      {formatDate(invoice.dueDate)}
                    </span>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td>
                  <StatusPill {...invoiceStatus(invoice.status)} />
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No invoices yet" />
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Active subscriptions" />
          {subscriptions.length ? (
            <Table caption="Subscriptions" head={['Family', 'Plan', 'Amount', 'Next billing']}>
              {subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <Td>
                    {subscription.familyProfile.user.name}
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {formatName(subscription.senior)}
                    </span>
                  </Td>
                  <Td>{subscription.package.name}</Td>
                  <Td className="whitespace-nowrap tabular-nums">
                    {formatMoney(subscription.amountPaise)}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {subscription.nextBillingDate ? formatDate(subscription.nextBillingDate) : '—'}
                    {subscription.status === 'PAST_DUE' ? (
                      <span className="mt-1 block">
                        <Badge tone="danger">Past due</Badge>
                      </span>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState title="No active subscriptions" />
          )}
        </Card>

        <Card>
          <CardHeader title="Recent payments" />
          {payments.length ? (
            <Table caption="Payments" head={['Invoice', 'Amount', 'Method', 'Status']}>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <Td className="font-medium text-ink-900">{payment.invoice.number}</Td>
                  <Td className="whitespace-nowrap tabular-nums">
                    {formatMoney(payment.amountPaise)}
                  </Td>
                  <Td>{payment.method ? titleise(payment.method) : '—'}</Td>
                  <Td>
                    <Badge
                      tone={
                        payment.status === 'CAPTURED'
                          ? 'success'
                          : payment.status === 'FAILED'
                            ? 'danger'
                            : 'neutral'
                      }
                    >
                      {titleise(payment.status)}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState title="No payments recorded" />
          )}
        </Card>
      </div>
    </div>
  );
}
