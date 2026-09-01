import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { ButtonLink, Card, SectionHeading } from '@/components/ui';
import { CtaBand, EmergencyNotice } from '@/components/marketing/site-chrome';
import {
  FaqAccordion,
  HowItWorks,
  PackageCard,
  SectionShell,
  TrustGrid,
} from '@/components/marketing/sections';
import { prisma } from '@/lib/db';
import { HOME_FAQ } from '@/content/faq';
import { faqSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Reliable care for elderly parents in Mumbai',
  description:
    'Home care for elderly parents in Mumbai when you work full time. Nurse-supervised care plans, verified caregivers, daily updates and replacement cover arranged by us.',
  alternates: { canonical: '/for-families' },
};

export const revalidate = 300;

/**
 * Journey A — a family living in Mumbai.
 *
 * Their objection is not distance, it is time and guilt: they can get there, but not every
 * day, and they are exhausted from managing attendants themselves. So this page leads on
 * "support that runs without you managing it" rather than on visibility.
 *
 * `?journey=FAMILY_LOCAL` is carried into the intake funnel so conversion can be tracked
 * separately per journey.
 */
export default async function ForFamiliesPage() {
  const packages = await prisma.carePackage.findMany({
    where: { isPublished: true, audience: { in: ['POST_DISCHARGE', 'CHRONIC', 'SAFETY'] } },
    orderBy: { sortOrder: 'asc' },
    select: {
      slug: true,
      name: true,
      tagline: true,
      durationLabel: true,
      billingCycle: true,
      priceFromPaise: true,
      isComingSoon: true,
      isFeatured: true,
      outcomes: true,
    },
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(HOME_FAQ.slice(0, 6))) }}
      />

      <section className="border-b border-[color:var(--border)] bg-gradient-to-b from-sand-100 to-[color:var(--page-bg)]">
        <div className="container-page px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
                For families in Mumbai
              </p>
              <h1 className="display-title mt-4 text-4xl leading-[1.12] text-ink-900 text-balance sm:text-5xl">
                Reliable care for elderly parents in Mumbai.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
                You can be there on a Sunday. You cannot be there at 8am on a Tuesday with a
                walker, three medicines and a physiotherapy appointment. That is the gap we fill —
                with a written plan, a named caregiver and a nurse who reviews the work.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/get-assessment?journey=FAMILY_LOCAL" size="xl">
                  Get a free care assessment
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/care-packages" size="xl" variant="outline">
                  Explore care plans
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-ink-500">
                No payment to book. If we cannot serve your area, we will tell you on the call.
              </p>
            </div>

            <Card className="p-6">
              <h2 className="font-semibold text-ink-900">What changes in the first week</h2>
              <ol className="mt-4 space-y-4 text-sm">
                {[
                  {
                    day: 'Day 0',
                    text: 'You answer a few questions. A coordinator calls you back — same day if the discharge is urgent.',
                  },
                  {
                    day: 'Day 1',
                    text: 'Home assessment. Discharge papers, medication list and the home itself are reviewed in person.',
                  },
                  {
                    day: 'Day 2',
                    text: 'You get a written care plan with goals, a schedule and a clear scope. You decide.',
                  },
                  {
                    day: 'Day 3',
                    text: 'A named caregiver starts. You know who they are before they arrive.',
                  },
                  {
                    day: 'Every day after',
                    text: 'The timeline tells you what happened, without you having to phone anyone.',
                  },
                ].map((row) => (
                  <li key={row.day} className="flex gap-3">
                    <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {row.day}
                    </span>
                    <span className="text-ink-700">{row.text}</span>
                  </li>
                ))}
              </ol>
              <EmergencyNotice className="mt-5" />
            </Card>
          </div>
        </div>
      </section>

      <SectionShell tone="surface">
        <SectionHeading
          eyebrow="The honest version"
          title="What managing this yourself actually costs"
          description="Families rarely fail at elder care because they do not care enough. They fail because the work is a full-time coordination job on top of a full-time job."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'The 6am phone call',
              body: 'The attendant is not coming. You now have four hours to solve it from your office, and no list of who else is free in your area.',
            },
            {
              title: 'The medication drawer',
              body: 'Six strips, two changed at discharge, and nobody sure whether the evening dose was taken. Nothing written down that a doctor could use.',
            },
            {
              title: 'The appointment nobody booked',
              body: 'The follow-up was mentioned at discharge. Three weeks later it still has not happened, and the recovery window has passed.',
            },
          ].map((item) => (
            <Card key={item.title} className="p-5">
              <h3 className="font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-8 max-w-3xl text-[1.0625rem] leading-relaxed text-ink-700">
          Each of these is a system problem, and each has an owner in our model: operations owns
          attendance and cover, a nurse owns the plan and the medication record, and a coordinator
          owns appointments. None of them is your job once the plan starts.
        </p>
      </SectionShell>

      <SectionShell>
        <HowItWorks />
      </SectionShell>

      <SectionShell tone="surface">
        <SectionHeading
          eyebrow="Plans most local families start with"
          title="Start smaller than you think you need to"
          description="A safety assessment or a two-week post-discharge plan answers more questions than a long commitment, and costs less to find out."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard key={pkg.slug} pkg={pkg} compact />
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeading
          eyebrow="Why families trust us"
          title="Everything here is checkable inside the product"
        />
        <TrustGrid limit={6} />
      </SectionShell>

      <SectionShell tone="surface">
        <SectionHeading title="Questions local families ask" />
        <FaqAccordion items={HOME_FAQ.slice(0, 7)} />
      </SectionShell>

      <CtaBand
        title="Book a free home assessment"
        description="A nurse or care coordinator visits, looks at the real situation, and writes a plan you can keep. Decide afterwards."
        primaryHref="/get-assessment?journey=FAMILY_LOCAL"
      />
    </>
  );
}
