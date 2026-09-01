import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
  StatusPill,
} from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDate, formatDateTime, relativeTime } from '@/lib/format';
import { referralStatus } from '@/lib/status';
import { PARTNER_TYPE_LABELS, label, titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Partner dashboard',
  robots: { index: false, follow: false },
};

/**
 * The referral partner's overview.
 *
 * A partner sees the status and outcome of referrals they made — and never a patient's care
 * record. That boundary is enforced in the queries below, not just in the UI: the patient's
 * clinical information belongs to the patient and their family, not to the referral source.
 */
export default async function PartnerDashboardPage() {
  const user = await requirePageUser(['REFERRAL_PARTNER']);

  const partner = await prisma.partnerProfile.findUnique({
    where: { id: user.partnerProfileId ?? '' },
    include: {
      referrals: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reference: true,
          patientName: true,
          patientArea: true,
          status: true,
          urgency: true,
          contactedAt: true,
          convertedAt: true,
          statusNote: true,
          createdAt: true,
        },
      },
    },
  });

  if (!partner) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Partner dashboard" />
        <Card>
          <EmptyState
            title="Your partner account is not set up yet"
            description="Our operations team reviews every partner request before enabling an account. Please contact us if this seems wrong."
          />
        </Card>
      </div>
    );
  }

  const referrals = partner.referrals;
  const converted = referrals.filter((referral) => referral.status === 'CONVERTED');
  const awaitingContact = referrals.filter((referral) => referral.status === 'SUBMITTED');
  const inProgress = referrals.filter((referral) =>
    ['CONTACTED', 'ASSESSMENT'].includes(referral.status),
  );

  return (
    <div>
      <PageHeader
        title={partner.organisationName}
        description={`${label(PARTNER_TYPE_LABELS, partner.partnerType)} · attribution code ${partner.attributionCode}`}
        action={<ButtonLink href="/app/partner/refer">Refer a patient</ButtonLink>}
      />

      {partner.agreementStatus !== 'ACTIVE' ? (
        <Alert
          tone={partner.agreementStatus === 'PENDING' ? 'warning' : 'danger'}
          title={
            partner.agreementStatus === 'PENDING'
              ? 'Your account is awaiting review'
              : 'Your account is paused'
          }
          className="mb-6"
        >
          <p>
            {partner.agreementStatus === 'PENDING'
              ? 'You can look around, but referrals are not accepted until our team has reviewed the partnership. If you have a patient being discharged today, please call us.'
              : 'Please contact our operations team.'}
          </p>
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Referrals sent" value={referrals.length} />
        <Stat
          label="Awaiting our first call"
          value={awaitingContact.length}
          tone={awaitingContact.length > 0 ? 'warning' : 'success'}
        />
        <Stat label="In progress" value={inProgress.length} tone="brand" />
        <Stat label="Became active patients" value={converted.length} tone="success" />
      </div>

      <Card>
        <CardHeader
          title="Your referrals"
          action={
            <ButtonLink href="/app/partner/referrals" variant="ghost" size="sm">
              See all
            </ButtonLink>
          }
        />
        {referrals.length ? (
          <ul className="divide-y divide-[color:var(--border)]">
            {referrals.slice(0, 8).map((referral) => (
              <li key={referral.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-900">{referral.patientName}</p>
                    <p className="text-sm text-ink-600">
                      {referral.patientArea} · {referral.reference} · sent{' '}
                      {relativeTime(referral.createdAt)}
                    </p>
                    {referral.contactedAt ? (
                      <p className="mt-1 text-sm text-success">
                        We contacted the family {formatDateTime(referral.contactedAt)}
                      </p>
                    ) : referral.status === 'SUBMITTED' ? (
                      <p className="mt-1 text-sm text-warning">Not contacted yet</p>
                    ) : null}
                    {referral.statusNote ? (
                      <p className="mt-1 text-sm text-ink-600">{referral.statusNote}</p>
                    ) : null}
                  </div>
                  <StatusPill {...referralStatus(referral.status)} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No referrals yet"
            description="A referral takes under a minute. You will see when we contacted the family and what happened."
            action={<ButtonLink href="/app/partner/refer">Refer a patient</ButtonLink>}
          />
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="What you can and cannot see" />
        <div className="px-5 py-4 text-[0.9375rem] leading-relaxed text-ink-600">
          <p>
            You see the status of referrals you made, when we contacted the family, and whether the
            patient became active. You do not see their care record, visit notes, readings or
            medication — that belongs to the patient and their family, not to the referral source.
          </p>
          <p className="mt-3">
            We do not pay per-referral commissions. Attribution exists so we can report volumes and
            outcomes back to you, not to create a financial incentive to refer.
          </p>
        </div>
      </Card>
    </div>
  );
}
