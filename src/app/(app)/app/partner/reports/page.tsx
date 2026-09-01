import type { Metadata } from 'next';
import { Alert, Card, CardHeader, EmptyState, PageHeader, Stat, Table, Td } from '@/components/ui';
import { BarSeries, DonutSplit } from '@/components/charts';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatMonthLabel } from '@/lib/format-extra';
import { REFERRAL_STATUS_LABELS, label, titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Referral reports',
  robots: { index: false, follow: false },
};

/**
 * Referral reporting for a partner.
 *
 * Deliberately excludes revenue. A partner learning how much money their referrals generated
 * turns a clinical judgement into a commercial one, which is exactly what we say we do not
 * do. Volume and outcomes are what a referrer actually needs: are these patients being
 * looked after, and is my referral worth making.
 */
export default async function PartnerReportsPage() {
  const user = await requirePageUser(['REFERRAL_PARTNER']);

  const referrals = await prisma.referral.findMany({
    where: { partnerId: user.partnerProfileId ?? '__none__' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      urgency: true,
      patientArea: true,
      createdAt: true,
      contactedAt: true,
      convertedAt: true,
    },
  });

  const total = referrals.length;
  const converted = referrals.filter((referral) => referral.status === 'CONVERTED').length;
  const declined = referrals.filter((referral) => referral.status === 'DECLINED').length;
  const contacted = referrals.filter((referral) => referral.contactedAt).length;

  // Median rather than mean: one slow outlier should not flatter or ruin the figure.
  const contactHours = referrals
    .filter((referral) => referral.contactedAt)
    .map(
      (referral) =>
        (referral.contactedAt!.getTime() - referral.createdAt.getTime()) / 3_600_000,
    )
    .sort((a, b) => a - b);
  const medianContactHours = contactHours.length
    ? contactHours[Math.floor(contactHours.length / 2)]
    : null;

  // Monthly volume.
  const byMonth = new Map<string, { label: string; sent: number; converted: number }>();
  for (const referral of referrals) {
    const key = referral.createdAt.toISOString().slice(0, 7);
    const entry = byMonth.get(key) ?? { label: formatMonthLabel(key), sent: 0, converted: 0 };
    entry.sent += 1;
    if (referral.status === 'CONVERTED') entry.converted += 1;
    byMonth.set(key, entry);
  }

  const statusSplit = Object.entries(
    referrals.reduce<Record<string, number>>((acc, referral) => {
      acc[referral.status] = (acc[referral.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([status, count]) => ({ label: label(REFERRAL_STATUS_LABELS, status), value: count }));

  const byArea = Object.entries(
    referrals.reduce<Record<string, { total: number; converted: number }>>((acc, referral) => {
      const entry = acc[referral.patientArea] ?? { total: 0, converted: 0 };
      entry.total += 1;
      if (referral.status === 'CONVERTED') entry.converted += 1;
      acc[referral.patientArea] = entry;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].total - a[1].total);

  return (
    <div>
      <PageHeader
        title="Referral reports"
        description="Volume and outcomes for referrals from your organisation."
        breadcrumb={[{ href: '/app/partner', label: 'Partner dashboard' }]}
      />

      {total === 0 ? (
        <Card>
          <EmptyState
            title="No referrals to report on yet"
            description="Once you have referred a few patients, this page will show volume, our response times and what happened to them."
          />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Referrals sent" value={total} />
            <Stat
              label="We contacted"
              value={`${contacted}/${total}`}
              tone={contacted === total ? 'success' : 'warning'}
            />
            <Stat
              label="Typical time to first contact"
              value={medianContactHours != null ? `${medianContactHours.toFixed(1)}h` : '—'}
              hint={medianContactHours != null ? 'Median, from your submission' : 'No contacts yet'}
              tone={
                medianContactHours != null && medianContactHours <= 4 ? 'success' : 'warning'
              }
            />
            <Stat
              label="Became active patients"
              value={total >= 3 ? `${Math.round((converted / total) * 100)}%` : '—'}
              hint={
                total >= 3
                  ? `${converted} of ${total}`
                  : 'Too few referrals to give a meaningful rate'
              }
              tone="brand"
            />
          </div>

          {declined > 0 ? (
            <Alert tone="info" title={`We declined ${declined} referral${declined === 1 ? '' : 's'}`} className="mb-6">
              <p>
                Usually because the patient is outside the areas we staff. We would rather decline
                the same day than accept a patient and let your family down — each declined
                referral on your list carries the reason.
              </p>
            </Alert>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Referrals over time" />
              <div className="px-5 py-4">
                <BarSeries
                  data={[...byMonth.values()]}
                  series={[
                    { key: 'sent', label: 'Sent' },
                    { key: 'converted', label: 'Became active', colour: '#127c4c' },
                  ]}
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Where your referrals stand" />
              <div className="px-5 py-4">
                <DonutSplit data={statusSplit} />
              </div>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader title="By area" description="Which localities your referrals come from." />
            <Table caption="Referrals by area" head={['Area', 'Sent', 'Became active']}>
              {byArea.map(([area, stats]) => (
                <tr key={area}>
                  <Td className="font-medium text-ink-900">{area}</Td>
                  <Td>{stats.total}</Td>
                  <Td>{stats.converted}</Td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card className="mt-6">
            <CardHeader title="Why there is no revenue figure here" />
            <div className="px-5 py-4 text-[0.9375rem] leading-relaxed text-ink-600">
              <p>
                We do not report revenue attributed to your referrals, and we do not pay
                per-referral commissions. Showing a clinician how much money their referrals
                generated turns a clinical judgement into a commercial one, and that is precisely
                what we have said we will not do.
              </p>
              <p className="mt-3">
                What we do report is whether the patients you sent us are actually being looked
                after, and how quickly we responded.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
