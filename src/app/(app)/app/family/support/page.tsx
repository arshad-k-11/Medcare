import type { Metadata } from 'next';
import { Card, CardHeader, PageHeader } from '@/components/ui';
import { Phone, Mail } from 'lucide-react';
import { SupportRequestForm } from '@/components/family/support-request-form';
import { requirePageUser } from '@/lib/auth-guard';
import { resolveSelectedSenior } from '@/lib/queries/family';
import { formatName, formatPhone } from '@/lib/format';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Get help',
  robots: { index: false, follow: false },
};

export default async function FamilySupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser(['FAMILY']);
  const params = await searchParams;
  const requested = typeof params.senior === 'string' ? params.senior : undefined;
  const { seniors, selectedId } = await resolveSelectedSenior(user, requested);

  const coordinator = selectedId
    ? await prisma.senior.findUnique({
        where: { id: selectedId },
        select: {
          supervisingNurse: {
            select: { isCareCoordinator: true, user: { select: { name: true, phone: true } } },
          },
        },
      })
    : null;

  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Get help"
        description="Ask a question, raise a concern, or make a complaint."
      />

      <Card className="mb-6 border-[#f0d5aa] bg-[#fdf8ef]">
        <div className="px-5 py-5 text-[0.9375rem] leading-relaxed text-[#6b3d05]">
          <p className="font-semibold">If this is a medical emergency</p>
          <p className="mt-1">
            Call emergency services or go to the nearest hospital first. We arrange planned care at
            home and are not an emergency service — please do not wait for us.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          {coordinator?.supervisingNurse ? (
            <Card>
              <CardHeader
                title={
                  coordinator.supervisingNurse.isCareCoordinator
                    ? 'Your care coordinator'
                    : 'Your nurse supervisor'
                }
              />
              <div className="px-5 py-4">
                <p className="font-semibold text-ink-900">
                  {coordinator.supervisingNurse.user.name}
                </p>
                {coordinator.supervisingNurse.user.phone ? (
                  <a
                    href={`tel:${coordinator.supervisingNurse.user.phone}`}
                    className="tap-target mt-3 flex items-center justify-center gap-2 rounded-[10px] bg-brand-700 px-4 text-[0.9375rem] font-semibold text-white hover:bg-brand-800"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    Call {coordinator.supervisingNurse.user.name.split(' ')[0]}
                  </a>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Our operations team" />
            <div className="space-y-3 px-5 py-4 text-sm">
              {supportPhone ? (
                <a
                  href={`tel:${supportPhone.replace(/\s/g, '')}`}
                  className="flex items-center gap-2 font-medium text-brand-800 hover:underline"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {supportPhone}
                </a>
              ) : null}
              {supportEmail ? (
                <a
                  href={`mailto:${supportEmail}`}
                  className="flex items-center gap-2 font-medium text-brand-800 hover:underline"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {supportEmail}
                </a>
              ) : null}
              <p className="text-ink-600">Operating hours 9am–8pm IST, seven days a week.</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="How complaints are handled" />
            <div className="px-5 py-4 text-sm leading-relaxed text-ink-600">
              <p>
                A complaint is recorded with a reference and tracked to resolution — it is not
                absorbed into a phone call. Operations is notified immediately, and we measure
                ourselves on how long resolution takes.
              </p>
              <p className="mt-3">
                Complaints about the conduct or safety of a staff member are escalated at once and
                may result in that person being withdrawn pending review.
              </p>
            </div>
          </Card>
        </div>

        <div id="request">
          <SupportRequestForm
            seniors={seniors.map((senior) => ({ id: senior.id, name: formatName(senior) }))}
            defaultSeniorId={selectedId ?? ''}
          />
        </div>
      </div>
    </div>
  );
}
