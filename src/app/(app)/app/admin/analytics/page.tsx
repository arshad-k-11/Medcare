import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
  Table,
  Td,
} from '@/components/ui';
import { BarSeries, DonutSplit } from '@/components/charts';
import { requirePageUser } from '@/lib/auth-guard';
import {
  acquisitionTrend,
  adminKpis,
  journeyBreakdown,
  operationsMetrics,
  periodFromDays,
  referralPerformance,
  revenueMetrics,
  sourcePerformance,
} from '@/lib/queries/analytics';
import { formatCompactMoney, formatMoney } from '@/lib/format';
import { INCIDENT_TYPE_LABELS, JOURNEY_LABELS, label, titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false },
};

const PERIOD_OPTIONS = [30, 90, 180, 365];

/**
 * Business analytics.
 *
 * Two rules govern every number on this page:
 *  1. It is computed from records the business produced — check-ins, lead transitions, paid
 *     invoices — not from a self-reported field somebody can type in.
 *  2. Where the sample is too small to mean anything, it shows a dash and says why. A 0%
 *     conversion rate from two enquiries is worse than no number, because somebody will act
 *     on it.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);
  const params = await searchParams;
  const days = PERIOD_OPTIONS.includes(Number(params.days)) ? Number(params.days) : 90;
  const period = periodFromDays(days);

  const [kpis, trend, journeys, sources, operations, referrals, revenue] = await Promise.all([
    adminKpis(period),
    acquisitionTrend(10),
    journeyBreakdown(period),
    sourcePerformance(period),
    operationsMetrics(period),
    referralPerformance(period),
    revenueMetrics(),
  ]);

  const visitTotal = Object.values(operations.visitStatuses).reduce((sum, n) => sum + n, 0);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={period.label}
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
        action={
          <nav aria-label="Period" className="flex gap-1">
            {PERIOD_OPTIONS.map((option) => (
              <Link
                key={option}
                href={`/app/admin/analytics?days=${option}`}
                aria-current={days === option ? 'page' : undefined}
                className={`rounded-[10px] px-3 py-2 text-sm font-semibold ${
                  days === option ? 'bg-brand-700 text-white' : 'text-ink-600 hover:bg-ink-100'
                }`}
              >
                {option}d
              </Link>
            ))}
          </nav>
        }
      />

      <Alert tone="info" title="How to read these numbers" className="mb-6">
        <p>
          Everything here is computed from actual records — visit check-ins, lead stage changes,
          paid invoices — rather than from anything self-reported. Where a figure shows a dash,
          the sample is too small to be meaningful and we would rather say so than publish a
          number somebody might act on.
        </p>
      </Alert>

      {/* Acquisition */}
      <h2 className="mb-3 text-lg font-semibold text-ink-900">Acquisition</h2>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Enquiries" value={kpis.newLeads} hint={period.label.toLowerCase()} />
        <Stat label="Won" value={kpis.wonLeads} tone="success" />
        <Stat
          label="Conversion rate"
          value={kpis.conversionRate != null ? `${kpis.conversionRate}%` : '—'}
          hint={kpis.conversionRate == null ? 'Fewer than 5 closed enquiries' : 'Of closed enquiries'}
          tone="brand"
        />
        <Stat
          label="Partner-sourced"
          value={kpis.referralLeads}
          hint={
            kpis.newLeads
              ? `${Math.round((kpis.referralLeads / kpis.newLeads) * 100)}% of enquiries`
              : undefined
          }
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Enquiries and conversions by week" />
          <div className="px-5 py-4">
            <BarSeries
              data={trend}
              series={[
                { key: 'leads', label: 'Enquiries' },
                { key: 'won', label: 'Won', colour: '#127c4c' },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="By buying journey"
            description="The three journeys are tracked separately because they convert differently."
          />
          <Table caption="Conversion by journey" head={['Journey', 'Enquiries', 'Won', 'Rate']}>
            {journeys.map((row) => (
              <tr key={row.journey}>
                <Td className="font-medium text-ink-900">{label(JOURNEY_LABELS, row.journey)}</Td>
                <Td>{row.total}</Td>
                <Td>{row.won}</Td>
                <Td>
                  {row.total >= 3 ? (
                    `${Math.round((row.won / row.total) * 100)}%`
                  ) : (
                    <span className="text-ink-500">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader
          title="Where enquiries come from"
          description="Which relationships and channels actually produce customers."
        />
        {sources.length ? (
          <Table caption="Lead sources" head={['Source', 'Enquiries', 'Won', 'Conversion']}>
            {sources.map((row) => (
              <tr key={row.label}>
                <Td className="font-medium text-ink-900">{row.label}</Td>
                <Td>{row.total}</Td>
                <Td>{row.won}</Td>
                <Td>
                  {row.conversionRate != null ? (
                    `${row.conversionRate}%`
                  ) : (
                    <span className="text-ink-500">too few</span>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No enquiries in this period" />
        )}
      </Card>

      {/* Operations */}
      <h2 className="mb-3 text-lg font-semibold text-ink-900">Operations</h2>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Visit completion"
          value={kpis.visitCompletionRate != null ? `${kpis.visitCompletionRate}%` : '—'}
          hint={`${kpis.completedVisits} completed · ${kpis.missedVisits} missed`}
          tone={
            kpis.visitCompletionRate == null
              ? 'neutral'
              : kpis.visitCompletionRate >= 95
                ? 'success'
                : 'warning'
          }
        />
        <Stat
          label="Caregiver replacements"
          value={operations.replacements}
          hint={period.label.toLowerCase()}
          tone={operations.replacements > 0 ? 'warning' : 'success'}
        />
        <Stat
          label="Incidents reported"
          value={operations.incidentTypes.reduce((sum, row) => sum + row.count, 0)}
        />
        <Stat
          label="Average family rating"
          value={kpis.averageRating ? kpis.averageRating.toFixed(1) : '—'}
          hint={kpis.ratingCount ? `${kpis.ratingCount} responses` : 'No responses yet'}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Visit outcomes" description={`${visitTotal} visits in this period`} />
          <div className="px-5 py-4">
            <DonutSplit
              data={Object.entries(operations.visitStatuses).map(([status, count]) => ({
                label: titleise(status),
                value: count,
                colour:
                  status === 'COMPLETED'
                    ? '#127c4c'
                    : status === 'MISSED'
                      ? '#b42318'
                      : status === 'CANCELLED'
                        ? '#84909e'
                        : '#175cd3',
              }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Incidents by type" />
          <div className="px-5 py-4">
            <BarSeries
              data={operations.incidentTypes.map((row) => ({
                label: label(INCIDENT_TYPE_LABELS, row.type),
                count: row.count,
              }))}
              series={[{ key: 'count', label: 'Incidents', colour: '#a35b06' }]}
              emptyMessage="No incidents in this period."
            />
          </div>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader
          title="Caregiver utilisation"
          description="Caseload against capacity, and completion rate from actual check-ins."
        />
        {operations.utilisation.length ? (
          <Table
            caption="Caregiver utilisation"
            head={['Caregiver', 'Patients', 'Visits', 'Completion', 'Performance', 'Attendance']}
          >
            {operations.utilisation.map((row) => (
              <tr key={row.name}>
                <Td className="font-medium text-ink-900">{row.name}</Td>
                <Td>
                  {row.patients}/{row.capacity}
                  {row.patients >= row.capacity ? (
                    <span className="ml-2">
                      <Badge tone="warning">At capacity</Badge>
                    </span>
                  ) : null}
                </Td>
                <Td>{row.visits}</Td>
                <Td>
                  {row.completionRate != null ? (
                    <span
                      className={row.completionRate >= 95 ? 'text-success' : 'text-warning'}
                    >
                      {row.completionRate}%
                    </span>
                  ) : (
                    <span className="text-ink-500">too few</span>
                  )}
                </Td>
                <Td>{row.performanceScore}</Td>
                <Td>{row.attendanceRate}%</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No caregivers on record" />
        )}
      </Card>

      {/* Revenue */}
      <h2 className="mb-3 text-lg font-semibold text-ink-900">Revenue</h2>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Monthly recurring"
          value={formatCompactMoney(revenue.mrrPaise)}
          hint={`${revenue.activeSubscriptions} active plan${revenue.activeSubscriptions === 1 ? '' : 's'}`}
          tone="success"
        />
        <Stat label="Collected this month" value={formatCompactMoney(revenue.paidThisMonthPaise)} />
        <Stat
          label={`Collected (${period.label.toLowerCase()})`}
          value={formatCompactMoney(kpis.revenuePaise)}
        />
        <Stat
          label="Outstanding"
          value={formatCompactMoney(kpis.outstandingPaise)}
          hint={`${kpis.outstandingCount} unpaid`}
          tone={kpis.outstandingPaise > 0 ? 'warning' : 'neutral'}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Plan mix" description="Active subscriptions by plan." />
          <div className="px-5 py-4">
            <DonutSplit data={revenue.packageMix} emptyMessage="No active subscriptions yet." />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Average customer value"
            description="Derived from active subscriptions, not projected."
          />
          <div className="px-5 py-4">
            <p className="text-3xl font-semibold tabular-nums text-ink-900">
              {revenue.activeSubscriptions >= 3
                ? formatMoney(Math.round(revenue.mrrPaise / revenue.activeSubscriptions))
                : '—'}
            </p>
            <p className="mt-1 text-sm text-ink-600">
              {revenue.activeSubscriptions >= 3
                ? 'Per active plan, per month'
                : 'Fewer than three active plans — an average here would be misleading'}
            </p>
          </div>
        </Card>
      </div>

      {/* Referral partners */}
      <h2 className="mb-3 text-lg font-semibold text-ink-900">Referral partners</h2>
      <Card>
        <CardHeader
          title="Partner performance"
          description="Revenue is shown internally only. Partners never see it — that is deliberate."
        />
        {referrals.length ? (
          <Table
            caption="Referral partner performance"
            head={['Partner', 'Type', 'Referrals', 'Contacted', 'Converted', 'Rate', 'Revenue']}
          >
            {referrals.map((row) => (
              <tr key={row.id}>
                <Td className="font-medium text-ink-900">{row.organisationName}</Td>
                <Td>{titleise(row.partnerType)}</Td>
                <Td>{row.total}</Td>
                <Td>{row.contacted}</Td>
                <Td>{row.converted}</Td>
                <Td>
                  {row.conversionRate != null ? (
                    `${row.conversionRate}%`
                  ) : (
                    <span className="text-ink-500">too few</span>
                  )}
                </Td>
                <Td className="tabular-nums">{formatCompactMoney(row.revenuePaise)}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No partner referrals in this period" />
        )}
      </Card>
    </div>
  );
}
