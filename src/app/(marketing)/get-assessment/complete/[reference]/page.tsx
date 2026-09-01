import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Alert, Badge, ButtonLink, Card, DescriptionList } from '@/components/ui';
import { prisma } from '@/lib/db';
import { URGENCY_LABELS, label } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { firstContactSlaHours } from '@/lib/services/recommendation';
import type { Urgency } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Assessment request received',
  // Never index a page keyed to a specific family's enquiry.
  robots: { index: false, follow: false },
};

/**
 * Confirmation page.
 *
 * Addressed by the lead's reference rather than its id, and it shows only what the family
 * already told us — no clinical detail, nothing they did not type. That is what makes it
 * safe to reach without a login, which matters because most people submit this form before
 * they have an account and will forward the link to a sibling.
 */
export default async function AssessmentCompletePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  const lead = await prisma.lead.findUnique({
    where: { reference },
    select: {
      reference: true,
      status: true,
      urgency: true,
      contactName: true,
      contactCountry: true,
      area: true,
      createdAt: true,
      recommendedPackage: {
        select: { name: true, slug: true, isComingSoon: true, durationLabel: true },
      },
      senior: { select: { firstName: true } },
      assessments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, requestedFor: true, scheduledAt: true },
      },
    },
  });

  if (!lead) notFound();

  const slaHours = firstContactSlaHours(lead.urgency as Urgency);
  const isNri = (lead.contactCountry ?? 'India').toLowerCase() !== 'india';

  return (
    <div className="section">
      <div className="container-page max-w-4xl">
        <div className="flex items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e8f5ee] text-success"
            aria-hidden="true"
          >
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="display-title text-3xl text-ink-900 sm:text-4xl">
              Thank you, {lead.contactName.split(' ')[0]}. We have your request.
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-ink-600">
              A care coordinator will contact you
              {slaHours <= 4
                ? ` within about ${slaHours} hours during operating hours`
                : ' within one working day'}
              . Nothing has been charged, and you have not committed to anything.
            </p>
          </div>
        </div>

        <Card className="mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Your reference
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-wide text-brand-800">
                {lead.reference}
              </p>
            </div>
            <Badge tone="info">Submitted {formatDate(lead.createdAt)}</Badge>
          </div>
          <p className="mt-3 text-sm text-ink-600">
            Keep this reference. You can check the status at any time, and you can share the link
            with a sibling or another family member.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href={`/track/${lead.reference}`}>Track this request</ButtonLink>
            <ButtonLink href="/care-packages" variant="outline">
              Read about the care plans
            </ButtonLink>
          </div>
        </Card>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-semibold text-ink-900">What you told us</h2>
            <DescriptionList
              className="mt-4"
              columns={1}
              items={[
                { label: 'Care for', value: lead.senior?.firstName ?? '—' },
                { label: 'Area', value: lead.area ?? '—' },
                { label: 'How soon', value: label(URGENCY_LABELS, lead.urgency) },
                {
                  label: 'Plan to discuss',
                  value: lead.recommendedPackage
                    ? `${lead.recommendedPackage.name} (${lead.recommendedPackage.durationLabel})`
                    : 'Coordinator will advise',
                },
              ]}
            />
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-ink-900">What happens next</h2>
            <ol className="mt-4 space-y-3 text-sm text-ink-700">
              {[
                'A coordinator calls you to understand the situation properly.',
                'We agree a time for a free home assessment.',
                'A nurse or coordinator visits, reviews the situation and the home.',
                'You receive a written care plan, which is yours to keep.',
                'If you want to go ahead, we assign a caregiver and start.',
              ].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="font-semibold text-brand-700">{index + 1}.</span>
                  {item}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {lead.recommendedPackage?.isComingSoon ? (
          <Alert tone="warning" title="A note about the plan you chose" className="mt-6">
            <p>
              The plan you selected is not open for enrolment yet. We will not pretend otherwise —
              the coordinator will tell you what we can offer now and add you to the list for when it
              opens in your area.
            </p>
          </Alert>
        ) : null}

        {isNri ? (
          <Alert tone="info" title="We have noted that you are outside India" className="mt-6">
            <p>
              We will call at a time that works where you are. The home assessment happens in Mumbai
              and you do not need to be present — you will receive the written plan and the visit
              record either way.
            </p>
          </Alert>
        ) : null}

        <Alert tone="warning" title="If the situation changes before we call" className="mt-6">
          <p>
            If something becomes urgent, please call us rather than waiting. And if you believe there
            is a medical emergency, contact emergency services or go to the nearest hospital first —
            we arrange planned care at home and are not an emergency service.
          </p>
          {process.env.NEXT_PUBLIC_SUPPORT_PHONE ? (
            <p className="mt-2 font-semibold">
              Call us:{' '}
              <a
                href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE.replace(/\s/g, '')}`}
                className="underline"
              >
                {process.env.NEXT_PUBLIC_SUPPORT_PHONE}
              </a>
            </p>
          ) : null}
        </Alert>

        <p className="mt-8 text-sm text-ink-600">
          Want to change something you told us?{' '}
          <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
            Send us a message
          </Link>{' '}
          quoting {lead.reference}, or mention it on the call.
        </p>
      </div>
    </div>
  );
}
