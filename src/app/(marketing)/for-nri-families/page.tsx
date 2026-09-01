import type { Metadata } from 'next';
import { ArrowRight, Clock, FileText, Globe2, UserCheck } from 'lucide-react';
import { ButtonLink, Card, SectionHeading } from '@/components/ui';
import { CtaBand, EmergencyNotice } from '@/components/marketing/site-chrome';
import {
  DashboardPreview,
  FaqAccordion,
  PackageCard,
  SectionShell,
} from '@/components/marketing/sections';
import { prisma } from '@/lib/db';
import { NRI_FAQ } from '@/content/faq';
import { faqSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'NRI parent care in Mumbai — stay connected to your parents’ care',
  description:
    'Care coordination for NRI and out-of-city families with parents in Mumbai. A named coordinator, scheduled home visits, appointment management and updates readable in your timezone.',
  alternates: { canonical: '/for-nri-families' },
};

export const revalidate = 300;

/**
 * Journey B — NRI / out-of-city family.
 *
 * Their objection is not price, it is trust at a distance: they can afford care, they
 * cannot verify it. So this page leads on visibility, named accountability and time-zone
 * handling, and it deliberately does not promise anything that requires them to be
 * physically present.
 */
export default async function ForNriFamiliesPage() {
  const packages = await prisma.carePackage.findMany({
    where: { isPublished: true, audience: { in: ['NRI', 'CHRONIC', 'SAFETY'] } },
    orderBy: [{ audience: 'asc' }, { sortOrder: 'asc' }],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(NRI_FAQ)) }}
      />

      <section className="border-b border-[color:var(--border)] bg-gradient-to-b from-brand-950 to-brand-900 text-white">
        <div className="container-page px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-brand-100">
                <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                For families outside Mumbai
              </p>
              <h1 className="display-title mt-5 text-4xl leading-[1.12] text-balance sm:text-5xl">
                Stay connected to your parents’ care, even when you’re far away.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-100">
                One named care coordinator in Mumbai. Home visits on a published schedule.
                Appointments booked, attended and reported. Updates you can read at breakfast in
                your own timezone — not a weekly call where you have to ask the right question.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink
                  href="/get-assessment?journey=NRI"
                  size="xl"
                  className="bg-white text-brand-900 hover:bg-brand-50"
                >
                  Get a free care assessment
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink
                  href="/care-packages/nri-parent-care-coordination"
                  size="xl"
                  variant="ghost"
                  className="border border-white/30 text-white hover:bg-white/10"
                >
                  See the NRI plan
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-brand-200">
                The assessment happens in Mumbai. You do not need to be there, and you do not need
                to pay anything to book it.
              </p>
            </div>

            <Card className="border-white/15 bg-white/5 p-6 text-white shadow-none backdrop-blur">
              <h2 className="font-semibold">What you get that a local agency will not give you</h2>
              <ul className="mt-5 space-y-4 text-sm">
                {[
                  {
                    icon: UserCheck,
                    title: 'A named person, not a helpline',
                    body: 'The same coordinator who knows your parent’s situation, so you are not re-explaining it every time.',
                  },
                  {
                    icon: Clock,
                    title: 'Timezone-aware reporting',
                    body: 'Visit updates the same day, and written summaries timed to land at the start of your day.',
                  },
                  {
                    icon: FileText,
                    title: 'A monthly care report',
                    body: 'Visits, readings, appointments, notes and any incidents, in one document you can forward to a doctor or a sibling.',
                  },
                ].map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-200" aria-hidden="true" />
                    <span>
                      <span className="block font-semibold">{item.title}</span>
                      <span className="mt-0.5 block text-brand-100">{item.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <EmergencyNotice className="mt-10 border-white/20 bg-white/10 text-brand-50" />
        </div>
      </section>

      <SectionShell tone="surface">
        <SectionHeading
          eyebrow="The distance problem"
          title="You are not worried about money. You are worried about not knowing."
          description="Every NRI family we speak to describes the same three things."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: '“Everything is fine, beta.”',
              body: 'Your parents will not tell you when something is wrong, because they do not want to worry you or pull you back. So you find out late.',
            },
            {
              title: 'The 2am decision',
              body: 'When something does happen, you are eight or twelve hours out of sync, with no local person who has authority to act.',
            },
            {
              title: 'Paying without seeing',
              body: 'You can transfer money monthly and still have no idea whether anybody visited last Thursday.',
            },
          ].map((item) => (
            <Card key={item.title} className="p-5">
              <h3 className="font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeading
          eyebrow="How we answer it"
          title="A record, not a reassurance"
        />
        <DashboardPreview />
      </SectionShell>

      <SectionShell tone="surface">
        <SectionHeading
          eyebrow="What we do about the hard parts"
          title="The specific mechanics, so you can judge them"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            {
              title: 'Escalation across timezones',
              body: 'Your care plan records who we call first and in what order, including that we call you regardless of the hour for anything high severity. Non-urgent matters wait for Mumbai working hours and reach you in writing.',
            },
            {
              title: 'When the caregiver cannot come',
              body: 'We run a replacement match on proximity, availability, skills, language and shift, assign cover, and tell you who is coming and why. Your parent is told in advance rather than meeting a stranger at the door.',
            },
            {
              title: 'Appointments end to end',
              body: 'Booked, escorted, and written up with an outcome note. You get the outcome the same day rather than a description three days later.',
            },
            {
              title: 'Siblings and shared decisions',
              body: 'More than one family member can be linked to the same parent, each with their own login. You control who is primary contact, who pays, and who can see clinical detail.',
            },
            {
              title: 'Paying from abroad',
              body: 'Monthly plans are billed on a subscription with itemised invoices, so you are not arranging a transfer every month or reconciling cash payments.',
            },
            {
              title: 'Both parents, one household',
              body: 'Where both parents need support, each has their own care plan and record, and one coordinator covers the household so nothing falls between the two.',
            },
          ].map((item) => (
            <Card key={item.title} className="p-5">
              <h3 className="font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeading
          eyebrow="Plans for out-of-city families"
          title="Coordination first, hours second"
          description="For a family abroad, the valuable part is rarely more caregiver hours — it is one person owning the coordination and reporting."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard key={pkg.slug} pkg={pkg} compact />
          ))}
        </div>
      </SectionShell>

      <SectionShell tone="surface">
        <SectionHeading title="Questions NRI families ask" />
        <FaqAccordion items={NRI_FAQ} />
      </SectionShell>

      <CtaBand
        title="Book the assessment from wherever you are"
        description="Tell us about your parents and we will call you at a time that works in your timezone. The home visit happens in Mumbai; you do not need to be present."
        primaryHref="/get-assessment?journey=NRI"
      />
    </>
  );
}
