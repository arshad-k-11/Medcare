import type { Metadata } from 'next';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Table, Td } from '@/components/ui';
import { PartnerApproval } from '@/components/admin/partner-approval';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatPhone } from '@/lib/format';
import { PARTNER_TYPE_LABELS, label, titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Referral partners',
  robots: { index: false, follow: false },
};

export default async function AdminPartnersPage() {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);

  const partners = await prisma.partnerProfile.findMany({
    orderBy: [{ agreementStatus: 'asc' }, { organisationName: 'asc' }],
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      _count: { select: { referrals: true } },
    },
  });

  const pending = partners.filter((partner) => partner.agreementStatus === 'PENDING');

  return (
    <div>
      <PageHeader
        title="Referral partners"
        description={`${partners.length} on record`}
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
      />

      {pending.length > 0 ? (
        <Card className="mb-6">
          <CardHeader
            title="Awaiting review"
            description="A partner account receives patient-adjacent information, so a person approves it."
          />
          <ul className="divide-y divide-[color:var(--border)]">
            {pending.map((partner) => (
              <li key={partner.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{partner.organisationName}</p>
                    <p className="text-sm text-ink-600">
                      {label(PARTNER_TYPE_LABELS, partner.partnerType)}
                      {partner.area ? ` · ${partner.area}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-ink-600">
                      {partner.contactPerson}
                      {partner.designation ? `, ${partner.designation}` : ''} ·{' '}
                      {partner.user.email} · {formatPhone(partner.user.phone)}
                    </p>
                    {partner.notes ? (
                      <p className="mt-2 text-sm text-ink-600">{partner.notes}</p>
                    ) : null}
                  </div>
                  <PartnerApproval partnerId={partner.id} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="All partners" />
        {partners.length ? (
          <Table
            caption="Referral partners"
            head={['Organisation', 'Type', 'Contact', 'Code', 'Referrals', 'Status']}
          >
            {partners.map((partner) => (
              <tr key={partner.id}>
                <Td className="font-medium text-ink-900">{partner.organisationName}</Td>
                <Td>{label(PARTNER_TYPE_LABELS, partner.partnerType)}</Td>
                <Td>
                  {partner.contactPerson ?? partner.user.name}
                  <span className="mt-0.5 block text-xs text-ink-500">{partner.user.email}</span>
                </Td>
                <Td className="font-mono text-xs">{partner.attributionCode}</Td>
                <Td>{partner._count.referrals}</Td>
                <Td>
                  <Badge
                    tone={
                      partner.agreementStatus === 'ACTIVE'
                        ? 'success'
                        : partner.agreementStatus === 'PENDING'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {titleise(partner.agreementStatus)}
                  </Badge>
                  {partner.user.status !== 'ACTIVE' ? (
                    <span className="mt-1 block text-xs text-ink-500">
                      Login {partner.user.status.toLowerCase()}
                    </span>
                  ) : null}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No referral partners yet" />
        )}
      </Card>
    </div>
  );
}
