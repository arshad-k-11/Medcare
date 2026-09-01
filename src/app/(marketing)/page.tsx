import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { ButtonLink, Card, SectionHeading } from '@/components/ui';
import { CtaBand, EmergencyNotice } from '@/components/marketing/site-chrome';
import {
  DashboardPreview,
  FaqAccordion,
  HowItWorks,
  JourneySelector,
  PackageCard,
  SectionShell,
  ServiceAreaList,
  SupervisionExplainer,
  TestimonialPlaceholder,
  TrustGrid,
  WhoWeHelp,
  WhyFamiliesNeedSupport,
} from '@/components/marketing/sections';
import { prisma } from '@/lib/db';
import { HOME_FAQ } from '@/content/faq';
import { organisationSchema, serviceSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Trusted elder care in Mumbai — home support & family updates',
  description:
    'Professional elder-care coordination, home support, monitoring and regular family updates across Mumbai. Structured care plans, nurse supervision and a free home assessment.',
  alternates: { canonical: '/' },
};

// Marketing content is driven by the database, so ops can change plans and areas without
// a deploy. Revalidated rather than rendered per request — it is the same for everyone.
export const revalidate = 300;

export default async function HomePage() {
  const [packages, areas, feedbackStats, visitStats] = await Promise.all([
    prisma.carePackage.findMany({
      where: { isPublished: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
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
    }),
    prisma.serviceArea.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
      select: { id: true, name: true, zone: true, isActive: true, notes: true },
    }),
    prisma.feedback.aggregate({
      where: { type: 'RATING', rating: { not: null } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    // Completion rate comes from actual visit records, never from a claim.
    prisma.visit.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const finishedVisits = visitStats
    .filter((row) => ['COMPLETED', 'MISSED'].includes(row.status))
    .reduce((sum, row) => sum + row._count._all, 0);
  const completedVisits =
    visitStats.find((row) => row.status === 'COMPLETED')?._count._all ?? 0;
  const completionRate = finishedVisits
    ? Math.round((completedVisits / finishedVisits) * 100)
    : null;

  const activeAreaNames = areas.filter((area) => area.isActive).map((area) => area.name);

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data helps a family searching "elder care Andheri" find a real
        // service rather than a directory listing.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organisationSchema(activeAreaNames), serviceSchema()]),
        }}
      />

      {/* 1 — Hero */}
      <section className="relative overflow-hidden border-b border-[color:var(--border)] bg-gradient-to-b from-sand-100 to-[color:var(--page-bg)]">
        <div className="container-page px-5 py-16 sm:px-8 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 ring-1 ring-brand-200">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Serving {activeAreaNames.length} areas across Mumbai and Thane
              </p>

              <h1 className="display-title mt-6 text-4xl leading-[1.1] text-ink-900 text-balance sm:text-5xl lg:text-[3.4rem]">
                Trusted care for your parents, even when you’re far away.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
                Professional elder-care coordination, home support, monitoring and regular family
                updates across Mumbai. A nurse writes the plan, a named caregiver delivers it, and
                you can see what happened today.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/get-assessment" size="xl">
                  Get a free care assessment
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/care-packages" size="xl" variant="outline">
                  Explore care plans
                </ButtonLink>
              </div>

              <p className="mt-4 text-sm text-ink-500">
                Takes about three minutes. No payment, and no obligation to buy anything afterwards.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  Nurse-supervised care plans
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  Verified caregivers, honestly labelled
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
                  Replacement cover arranged by us
                </span>
              </div>
            </div>

            <div className="lg:pl-4">
              <Card className="p-6 shadow-lift">
                <h2 className="text-base font-semibold text-ink-900">
                  Just home from hospital, or worried about a parent alone?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Start with the free assessment. A nurse or care coordinator visits, looks at the
                  actual situation, and gives you a written plan — whether or not you go ahead with
                  us.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-ink-700">
                  {[
                    'Same-day call back for urgent discharges',
                    'A written care plan you can keep',
                    'An honest answer about your area',
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-brand-700" aria-hidden="true">
                        ✓
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <ButtonLink href="/get-assessment" fullWidth size="lg" className="mt-6">
                  Start the assessment
                </ButtonLink>
                {process.env.NEXT_PUBLIC_SUPPORT_PHONE ? (
                  <a
                    href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE.replace(/\s/g, '')}`}
                    className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    Or call us: {process.env.NEXT_PUBLIC_SUPPORT_PHONE}
                  </a>
                ) : null}
              </Card>

              <EmergencyNotice className="mt-4" />
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Why families need support */}
      <SectionShell tone="surface">
        <WhyFamiliesNeedSupport />
      </SectionShell>

      {/* Journey split — three distinct buying journeys, tracked separately */}
      <SectionShell>
        <SectionHeading
          eyebrow="Where should you start?"
          title="Three different situations, three different conversations"
          description="What a local family needs to know is not what an NRI family needs to know, and neither is what a discharge coordinator needs to know."
        />
        <JourneySelector />
      </SectionShell>

      {/* 3 — How the service works */}
      <SectionShell tone="surface" id="how-it-works">
        <HowItWorks />
      </SectionShell>

      {/* 4 — Care packages */}
      <SectionShell id="care-plans">
        <SectionHeading
          eyebrow="Care plans"
          title="We sell care outcomes, not caregiver hours"
          description="Each plan states what you get and what it does not cover. Prices are indicative starting points — the plan and price are confirmed after the free assessment."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard key={pkg.slug} pkg={pkg} compact />
          ))}
        </div>
        <p className="mt-6 text-sm">
          <Link href="/care-packages" className="font-semibold text-brand-700 hover:underline">
            Compare all care plans side by side →
          </Link>
        </p>
      </SectionShell>

      {/* 5 — Who we help */}
      <SectionShell tone="surface">
        <WhoWeHelp />
      </SectionShell>

      {/* 6 — Why families trust us */}
      <SectionShell>
        <SectionHeading
          eyebrow="Why families trust us"
          title="Reliability is a system, not a promise"
          description="Everything below is something you can check inside the product, not a claim on a marketing page."
        />
        <TrustGrid />
        <p className="mt-6 text-sm">
          <Link href="/trust-and-safety" className="font-semibold text-brand-700 hover:underline">
            Read how verification, supervision and escalation actually work →
          </Link>
        </p>
      </SectionShell>

      {/* 7 — Family dashboard preview */}
      <SectionShell tone="surface">
        <SectionHeading
          eyebrow="Family dashboard"
          title="You should not have to ask what happened today"
        />
        <DashboardPreview />
      </SectionShell>

      {/* 8 — Caregiver supervision */}
      <SectionShell>
        <SupervisionExplainer />
      </SectionShell>

      {/* 9 — Testimonials (real data only) */}
      <SectionShell tone="surface">
        <TestimonialPlaceholder
          stats={{
            averageRating: feedbackStats._avg.rating ?? null,
            responses: feedbackStats._count._all,
            completionRate,
          }}
        />
      </SectionShell>

      {/* 10 — Referral partners */}
      <SectionShell tone="sand">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <SectionHeading
              eyebrow="For hospitals, doctors and societies"
              title="Reliable post-discharge support for your elderly patients"
              description="Refer a patient in under a minute, see whether we contacted them, and get told honestly when we cannot serve their area. Referral outcomes are tracked and attributed back to you."
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/for-partners" size="lg">
                How referrals work
              </ButtonLink>
              <ButtonLink href="/for-partners#register" size="lg" variant="outline">
                Become a referral partner
              </ButtonLink>
            </div>
          </div>
          <Card className="p-5">
            <h3 className="font-semibold text-ink-900">What a partner sees</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-700">
              {[
                'Submit a referral with consent recorded',
                'Track: submitted → contacted → assessment → converted',
                'See which of your referrals became active patients',
                'An honest decline when we cannot cover the area',
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
        </div>
      </SectionShell>

      {/* 11 — FAQ */}
      <SectionShell tone="surface" id="faq">
        <SectionHeading
          eyebrow="Questions families ask"
          title="The things you actually want to know"
        />
        <FaqAccordion items={HOME_FAQ} />
        <p className="mt-6 text-sm">
          <Link href="/faq" className="font-semibold text-brand-700 hover:underline">
            See all frequently asked questions →
          </Link>
        </p>
      </SectionShell>

      {/* 12 — Service areas */}
      <SectionShell id="areas">
        <SectionHeading
          eyebrow="Areas we serve"
          title="Deliberately narrow coverage, honestly stated"
          description="We assign caregivers from the area they already work in. That is why we do not claim to cover all of Mumbai."
        />
        <ServiceAreaList areas={areas} />
      </SectionShell>

      {/* 13 & 14 — Contact CTA and footer */}
      <CtaBand
        title="Start with a free assessment. Decide afterwards."
        description="Tell us what is happening and a care coordinator will call you back. If we cannot help — wrong area, wrong kind of need — we will say so."
      />
    </>
  );
}
