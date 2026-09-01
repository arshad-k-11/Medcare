import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { EmergencyNotice } from '@/components/marketing/site-chrome';
import { IntakeWizard } from '@/components/intake/intake-wizard';
import { prisma } from '@/lib/db';
import { readList } from '@/lib/json-list';
import { JOURNEYS, type Journey } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Get a free care assessment',
  description:
    'Tell us what is happening and a care coordinator will call you back. A free home assessment produces a written care plan you keep, with no obligation to buy anything.',
  alternates: { canonical: '/get-assessment' },
};

export const revalidate = 300;

export default async function GetAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const journeyParam = typeof params.journey === 'string' ? params.journey : undefined;
  const journey: Journey = JOURNEYS.includes(journeyParam as Journey)
    ? (journeyParam as Journey)
    : 'FAMILY_LOCAL';
  const packageParam = typeof params.package === 'string' ? params.package : undefined;

  const [packages, areas] = await Promise.all([
    prisma.carePackage.findMany({
      where: { isPublished: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        summary: true,
        durationLabel: true,
        billingCycle: true,
        priceFromPaise: true,
        isComingSoon: true,
        outcomes: true,
      },
    }),
    prisma.serviceArea.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
      select: { id: true, name: true, isActive: true },
    }),
  ]);

  const packageOptions = packages.map((pkg) => ({
    ...pkg,
    outcomes: readList(pkg.outcomes),
  }));

  return (
    <div className="section">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
              Free care assessment
            </p>
            <h1 className="display-title mt-3 text-3xl text-ink-900 text-balance sm:text-4xl">
              Tell us what is happening
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">
              Seven short steps. No payment, no card details, and no account to create. At the end a
              care coordinator will contact you to arrange a free home assessment.
            </p>

            <div className="mt-8">
              <IntakeWizard
                packages={packageOptions}
                areas={areas}
                initialJourney={journey}
                initialPackageSlug={
                  packageOptions.some((pkg) => pkg.slug === packageParam) ? packageParam : undefined
                }
              />
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <EmergencyNotice />

            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink-900">What happens next</h2>
              <ol className="mt-3 space-y-3 text-sm text-ink-700">
                {[
                  'You submit this form and get a reference number.',
                  'A care coordinator calls you — within two hours if you told us it is needed today.',
                  'We arrange a free home assessment at a time that suits you.',
                  'You receive a written care plan, which you keep either way.',
                  'You decide. Nothing is charged before you accept a plan.',
                ].map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="font-semibold text-brand-700">{index + 1}.</span>
                    {item}
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink-900">What we do with your answers</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                We use them to prepare for the call and the assessment, and nothing else. We do not
                sell your information, and we do not use health information for marketing. You can
                ask us to delete an enquiry that does not go anywhere.
              </p>
              <Link
                href="/legal/privacy"
                className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
              >
                Read the privacy notice →
              </Link>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink-900">Would rather talk?</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Call us and we will take the details over the phone. Some situations are easier to
                explain than to type, especially in the middle of a discharge.
              </p>
              {process.env.NEXT_PUBLIC_SUPPORT_PHONE ? (
                <a
                  href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE.replace(/\s/g, '')}`}
                  className="mt-3 inline-block text-base font-semibold text-brand-700 hover:underline"
                >
                  {process.env.NEXT_PUBLIC_SUPPORT_PHONE}
                </a>
              ) : null}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
