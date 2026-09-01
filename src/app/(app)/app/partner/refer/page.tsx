import type { Metadata } from 'next';
import { Card, CardHeader, PageHeader } from '@/components/ui';
import { ReferralForm } from '@/components/partner/referral-form';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Refer a patient',
  robots: { index: false, follow: false },
};

export default async function PartnerReferPage() {
  const user = await requirePageUser(['REFERRAL_PARTNER', 'ADMIN', 'OPS_MANAGER']);

  const [areas, services, partner] = await Promise.all([
    prisma.serviceArea.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
      select: { id: true, name: true, isActive: true },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    user.partnerProfileId
      ? prisma.partnerProfile.findUnique({
          where: { id: user.partnerProfileId },
          select: { agreementStatus: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Refer a patient"
        breadcrumb={[{ href: '/app/partner', label: 'Partner dashboard' }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <ReferralForm
          areas={areas}
          services={services}
          disabled={partner ? partner.agreementStatus !== 'ACTIVE' : false}
        />

        <div className="space-y-4">
          <Card>
            <CardHeader title="What we commit to" />
            <ul className="space-y-2.5 px-5 py-4 text-sm text-ink-700">
              {[
                'Contact within two hours for a same-day discharge, during operating hours',
                'Four hours for anything else marked urgent',
                'An honest decline the same day if we cannot cover the area',
                'You see the contacted timestamp, so the commitment is checkable',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-brand-700" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="What we do not do" />
            <ul className="space-y-2.5 px-5 py-4 text-sm text-ink-700">
              {[
                'Medical treatment, procedures or prescriptions',
                'Diagnosis, or clinical interpretation presented as a conclusion',
                'Emergency medical response',
                'Take over clinical responsibility for your patient',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-ink-400" aria-hidden="true">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
