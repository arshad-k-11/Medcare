import type { Metadata } from 'next';
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, Stat, StatusPill, Table, Td } from '@/components/ui';
import { PayInvoiceButton } from '@/components/family/pay-invoice-button';
import { requirePageUser } from '@/lib/auth-guard';
import { familyBilling } from '@/lib/queries/family';
import { formatDate, formatMoney, formatName } from '@/lib/format';
import { readJson } from '@/lib/json-list';
import { invoiceStatus } from '@/lib/status';
import { titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Billing',
  robots: { index: false, follow: false },
};

type InvoiceItem = { label: string; quantity: number; unitPricePaise: number; amountPaise: number };

export default async function FamilyBillingPage() {
  const user = await requirePageUser(['FAMILY']);
  const { invoices, subscriptions } = await familyBilling(user.familyProfileId ?? '');

  const outstanding = invoices.filter((invoice) =>
    ['SENT', 'PARTIAL', 'OVERDUE'].includes(invoice.status),
  );
  const outstandingTotal = outstanding.reduce(
    (sum, invoice) => sum + (invoice.totalPaise - invoice.amountPaidPaise),
    0,
  );
  const paidTotal = invoices
    .filter((invoice) => invoice.status === 'PAID')
    .reduce((sum, invoice) => sum + invoice.totalPaise, 0);

  const paymentsLive = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';

  return (
    <div>
      <PageHeader title="Billing" description="Invoices, plans and payments." />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Outstanding"
          value={formatMoney(outstandingTotal)}
          tone={outstandingTotal > 0 ? 'warning' : 'success'}
          hint={`${outstanding.length} unpaid invoice${outstanding.length === 1 ? '' : 's'}`}
        />
        <Stat label="Paid to date" value={formatMoney(paidTotal)} tone="success" />
        <Stat label="Active plans" value={subscriptions.filter((s) => s.status === 'ACTIVE').length} />
      </div>

      {!paymentsLive ? (
        <Alert tone="info" title="Online payment is not switched on yet" className="mb-6">
          <p>
            We are still completing the payment gateway setup. Your coordinator will tell you how to
            pay in the meantime, and every payment is recorded against the invoice here either way.
          </p>
        </Alert>
      ) : null}

      {subscriptions.length ? (
        <Card className="mb-6">
          <CardHeader title="Your care plans" />
          <Table caption="Subscriptions" head={['Plan', 'For', 'Amount', 'Next billing', 'Status']}>
            {subscriptions.map((subscription) => (
              <tr key={subscription.id}>
                <Td className="font-medium text-ink-900">{subscription.package.name}</Td>
                <Td>{formatName(subscription.senior)}</Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {formatMoney(subscription.amountPaise)} / month
                </Td>
                <Td className="whitespace-nowrap">
                  {subscription.nextBillingDate ? formatDate(subscription.nextBillingDate) : '—'}
                </Td>
                <Td>
                  <Badge tone={subscription.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {titleise(subscription.status)}
                  </Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Invoices" />
        {invoices.length ? (
          <ul className="divide-y divide-[color:var(--border)]">
            {invoices.map((invoice) => {
              const items = readJson<InvoiceItem[]>(invoice.items, []);
              const due = invoice.totalPaise - invoice.amountPaidPaise;
              const overdue = invoice.status === 'OVERDUE';
              return (
                <li key={invoice.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink-900">{invoice.number}</p>
                        <StatusPill {...invoiceStatus(invoice.status)} />
                      </div>
                      <p className="mt-1 text-sm text-ink-600">
                        {invoice.senior ? `For ${formatName(invoice.senior)} · ` : ''}
                        {invoice.issuedAt ? `Issued ${formatDate(invoice.issuedAt)}` : 'Draft'}
                        {invoice.dueDate ? ` · due ${formatDate(invoice.dueDate)}` : ''}
                      </p>

                      <ul className="mt-3 space-y-1 text-sm">
                        {items.map((item) => (
                          <li key={item.label} className="flex justify-between gap-4 text-ink-700">
                            <span>
                              {item.label}
                              {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                            </span>
                            <span className="tabular-nums">{formatMoney(item.amountPaise)}</span>
                          </li>
                        ))}
                      </ul>

                      {invoice.discountPaise > 0 ? (
                        <p className="mt-1 flex justify-between gap-4 text-sm text-success">
                          <span>Discount</span>
                          <span className="tabular-nums">
                            −{formatMoney(invoice.discountPaise)}
                          </span>
                        </p>
                      ) : null}

                      {invoice.notes ? (
                        <p className="mt-2 text-xs text-ink-500">{invoice.notes}</p>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xl font-semibold tabular-nums text-ink-900">
                        {formatMoney(invoice.totalPaise)}
                      </p>
                      {due > 0 && invoice.status !== 'DRAFT' && invoice.status !== 'VOID' ? (
                        <>
                          <p
                            className={`mt-0.5 text-sm ${overdue ? 'font-semibold text-danger' : 'text-ink-600'}`}
                          >
                            {formatMoney(due)} outstanding
                          </p>
                          <div className="mt-3">
                            <PayInvoiceButton invoiceId={invoice.id} amountPaise={due} />
                          </div>
                        </>
                      ) : invoice.status === 'PAID' ? (
                        <p className="mt-0.5 text-sm text-success">
                          Paid {invoice.paidAt ? formatDate(invoice.paidAt) : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="No invoices yet"
            description="Invoices appear here once a care plan starts. Nothing is charged before you accept a plan."
          />
        )}
      </Card>
    </div>
  );
}
