import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat, StatusPill } from '@/components/ui';
import { ReferralActions } from '@/components/admin/referral-actions';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDateTime, relativeTime } from '@/lib/format';
import { referralStatus, urgency as urgencyDisplay } from '@/lib/status';
import { titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Referrals',
  robots: { index: false, follow: false },
};

export default async function AdminReferralsPage() {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);

  const [referrals, areas] = await Promise.all([
    prisma.referral.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        partner: { select: { organisationName: true, partnerType: true } },
        lead: { select: { id: true, reference: true } },
        senior: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.serviceArea.findMany({ select: { name: true, isActive: true } }),
  ]);

  const servedAreas = new Set(areas.filter((area) => area.isActive).map((area) => area.name));
  const awaiting = referrals.filter((referral) => referral.status === 'SUBMITTED');
  const converted = referrals.filter((referral) => referral.status === 'CONVERTED');

  return (
    <div>
      <PageHeader
        title="Referrals"
        description="From hospitals, doctors, physiotherapists and societies."
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Awaiting first contact"
          value={awaiting.length}
          tone={awaiting.length > 0 ? 'warning' : 'success'}
        />
        <Stat label="Converted" value={converted.length} tone="success" />
        <Stat label="Total on record" value={referrals.length} />
      </div>

      <Card>
        <CardHeader title="All referrals" />
        {referrals.length ? (
          <ul className="divide-y divide-[color:var(--border)]">
            {referrals.map((referral) => {
              const areaServed = servedAreas.has(referral.patientArea);
              return (
                <li key={referral.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill {...referralStatus(referral.status)} />
                        <StatusPill {...urgencyDisplay(referral.urgency)} />
                        {!areaServed ? <Badge tone="danger">Area not served</Badge> : null}
                      </div>
                      <p className="mt-2 font-semibold text-ink-900">{referral.patientName}</p>
                      <p className="text-sm text-ink-600">
                        {referral.patientArea} · {referral.reference} · from{' '}
                        {referral.partner.organisationName} (
                        {titleise(referral.partner.partnerType)})
                      </p>
                      <p className="mt-2 max-w-3xl text-[0.9375rem] leading-relaxed text-ink-700">
                        {referral.reason}
                      </p>
                      <p className="mt-1.5 text-sm text-ink-500">
                        Sent {relativeTime(referral.createdAt)}
                        {referral.contactedAt
                          ? ` · contacted ${formatDateTime(referral.contactedAt)}`
                          : ' · not contacted yet'}
                      </p>
                      {referral.statusNote ? (
                        <p className="mt-1 text-sm text-ink-600">{referral.statusNote}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-3 text-sm">
                        {referral.lead ? (
                          <Link
                            href={`/app/admin/leads/${referral.lead.id}`}
                            className="font-semibold text-brand-700 hover:underline"
                          >
                            Open the enquiry ({referral.lead.reference}) →
                          </Link>
                        ) : null}
                        {referral.senior ? (
                          <Link
                            href={`/app/admin/patients/${referral.senior.id}`}
                            className="font-semibold text-brand-700 hover:underline"
                          >
                            Open the patient →
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {!['CONVERTED', 'DECLINED', 'LOST'].includes(referral.status) ? (
                    <ReferralActions
                      referralId={referral.id}
                      status={referral.status}
                      areaServed={areaServed}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="No referrals yet" />
        )}
      </Card>
    </div>
  );
}
