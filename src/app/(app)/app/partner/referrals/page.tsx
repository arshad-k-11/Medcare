import type { Metadata } from 'next';
import { Card, CardHeader, EmptyState, PageHeader, StatusPill, Table, Td } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/format';
import { referralStatus, urgency as urgencyDisplay } from '@/lib/status';
import { REFERRAL_STATUSES, titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'My referrals',
  robots: { index: false, follow: false },
};

/** Every referral this partner made, with the funnel state visible throughout. */
export default async function PartnerReferralsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser(['REFERRAL_PARTNER']);
  const params = await searchParams;
  const status = typeof params.status === 'string' ? params.status : undefined;

  const referrals = await prisma.referral.findMany({
    where: {
      // Scoped to the caller's own partner profile, not to a query parameter.
      partnerId: user.partnerProfileId ?? '__none__',
      ...(status && REFERRAL_STATUSES.includes(status as never) ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { requestedService: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="My referrals"
        description="Submitted, contacted, assessment, converted or declined."
        breadcrumb={[{ href: '/app/partner', label: 'Partner dashboard' }]}
      />

      <Card>
        <CardHeader title={`${referrals.length} referral${referrals.length === 1 ? '' : 's'}`} />
        {referrals.length ? (
          <Table
            caption="Referrals"
            head={['Patient', 'Area', 'Sent', 'We contacted', 'Urgency', 'Status']}
          >
            {referrals.map((referral) => (
              <tr key={referral.id}>
                <Td>
                  <span className="font-semibold text-ink-900">{referral.patientName}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    {referral.reference}
                    {referral.requestedService ? ` · ${referral.requestedService.name}` : ''}
                  </span>
                </Td>
                <Td className="whitespace-nowrap">{referral.patientArea}</Td>
                <Td className="whitespace-nowrap">{formatDate(referral.createdAt)}</Td>
                <Td className="whitespace-nowrap">
                  {referral.contactedAt ? (
                    <span className="text-success">{formatDateTime(referral.contactedAt)}</span>
                  ) : referral.status === 'SUBMITTED' ? (
                    <span className="text-warning">Not yet</span>
                  ) : (
                    <span className="text-ink-500">—</span>
                  )}
                </Td>
                <Td>
                  <StatusPill {...urgencyDisplay(referral.urgency)} />
                </Td>
                <Td>
                  <StatusPill {...referralStatus(referral.status)} />
                  {referral.statusNote ? (
                    <span className="mt-1 block max-w-xs text-xs text-ink-600">
                      {referral.statusNote}
                    </span>
                  ) : null}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState
            title="No referrals yet"
            description="Referrals you send appear here with their status and the timestamp of our first contact."
          />
        )}
      </Card>
    </div>
  );
}
