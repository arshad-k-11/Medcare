import type { Metadata } from 'next';
import { ArrowRight, Building2, ClipboardCheck, LineChart } from 'lucide-react';
import { ButtonLink, Card, SectionHeading } from '@/components/ui';
import { CtaBand } from '@/components/marketing/site-chrome';
import { FaqAccordion, SectionShell } from '@/components/marketing/sections';
import { prisma } from '@/lib/db';
import { PARTNER_FAQ } from '@/content/faq';
import { faqSchema } from '@/lib/seo';
import { PartnerRegistrationForm } from '@/components/marketing/partner-registration-form';

export const metadata: Metadata = {
  title: 'For hospitals, doctors and referral partners in Mumbai',
  description:
    'Reliable post-discharge support for elderly patients in Mumbai. Refer a patient in under a minute, track whether they were contacted, and see referral outcomes attributed back to you.',
  alternates: { canonical: '/for-partners' },
};

export const revalidate = 300;

/**
 * Journey C — hospitals, doctors, physiotherapists, societies.
 *
 * Their objection is professional risk: a referral that goes badly reflects on them. So
 * this page leads on accountability and response times, is explicit about clinical
 * boundaries, and states plainly that we do not pay per-referral commissions — because a
 * clinician reading this needs to know the referral is not a financial arrangement.
 */
export default async function ForPartnersPage() {
  const [areas, services] = await Promise.all([
    prisma.serviceArea.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, serviceClass: true, description: true },
    }),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(PARTNER_FAQ)) }}
      />

      <section className="border-b border-[color:var(--border)] bg-gradient-to-b from-sand-100 to-[color:var(--page-bg)]">
        <div className="container-page px-5 py-16 sm:px-8 sm:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 ring-1 ring-brand-200">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              For hospitals, doctors, physiotherapists and housing societies
            </p>
            <h1 className="display-title mt-5 text-4xl leading-[1.12] text-ink-900 text-balance sm:text-5xl">
              Reliable post-discharge support for your elderly patients.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-600">
              You discharge a 79-year-old with a walker, six medicines and two working children.
              What happens over the next fortnight decides whether they come back. We take that
              fortnight seriously: assessment within 24 hours, a written plan, a supervised
              caregiver, and a record you can read at the follow-up.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#register" size="xl">
                Become a referral partner
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/login" size="xl" variant="outline">
                Partner sign in
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <SectionShell tone="surface">
        <SectionHeading
          eyebrow="What we commit to"
          title="Response times you can check, not promises you have to take on trust"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ClipboardCheck,
              title: 'Contact within two hours',
              body: 'For a same-day discharge, during operating hours. Four hours for anything else marked urgent. The actual contacted timestamp appears on your referral, so the commitment is verifiable.',
            },
            {
              icon: ClipboardCheck,
              title: 'An honest decline',
              body: 'If the patient is outside the areas we staff, or the need is beyond what we do, we tell you the same day with a reason. We would rather decline than take your patient and under-deliver.',
            },
            {
              icon: LineChart,
              title: 'Outcome reporting',
              body: 'Volumes, conversion and active patients from your referrals, so you can see whether the relationship is working rather than guessing.',
            },
          ].map((item) => (
            <Card key={item.title} className="p-5">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-brand-50 text-brand-700"
                aria-hidden="true"
              >
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeading
          eyebrow="How a referral moves"
          title="Five states, visible to you throughout"
        />
        <ol className="mt-10 grid gap-3 md:grid-cols-5">
          {[
            { label: 'Submitted', body: 'You send name, area, contact and reason, with consent confirmed.' },
            { label: 'Contacted', body: 'We call the family and record the timestamp.' },
            { label: 'Assessment', body: 'A nurse or coordinator visits the home.' },
            { label: 'Converted', body: 'A care plan starts and the patient becomes active.' },
            { label: 'Or declined', body: 'With the reason stated, same day.' },
          ].map((step, index) => (
            <Card as="li" key={step.label} className="p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                {index + 1}
              </span>
              <h3 className="mt-1 font-semibold text-ink-900">{step.label}</h3>
              <p className="mt-1.5 text-sm text-ink-600">{step.body}</p>
            </Card>
          ))}
        </ol>
      </SectionShell>

      {/* Boundaries, stated where a clinician will read them before referring. */}
      <SectionShell tone="sand">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink-900">What we do</h2>
            <ul className="mt-4 space-y-3 text-[0.9375rem] text-ink-700">
              {services.slice(0, 7).map((service) => (
                <li key={service.id} className="flex gap-2">
                  <span className="mt-0.5 text-brand-700" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    <span className="font-medium text-ink-900">{service.name}</span>
                    <span className="mt-0.5 block text-sm text-ink-600">{service.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink-900">
              What we do not do, and will not claim to
            </h2>
            <ul className="mt-4 space-y-3 text-[0.9375rem] text-ink-700">
              {[
                'Medical treatment, procedures or prescriptions',
                'Diagnosis, or clinical interpretation presented as a conclusion',
                'Emergency medical response — families are told to call emergency services first',
                'Taking over clinical responsibility for your patient',
                'Changing anything you have prescribed. Our caregivers remind and record only',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-0.5 text-ink-400" aria-hidden="true">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-card border border-[color:var(--border)] bg-sand-50 p-4 text-sm leading-relaxed text-ink-700">
              <strong className="font-semibold text-ink-900">No referral commissions.</strong> We do
              not pay clinicians per referral. Attribution exists so we can report volumes and
              outcomes back to you and understand which relationships work — not to create a
              financial incentive to refer.
            </p>
          </Card>
        </div>
      </SectionShell>

      <SectionShell tone="surface">
        <SectionHeading
          eyebrow="Coverage"
          title="Where we can currently take a referral"
          description="Caregivers are assigned from the area they already work in. Outside these areas we will decline honestly and waitlist the patient."
        />
        <ul className="mt-8 flex flex-wrap gap-2">
          {areas.map((area) => (
            <li key={area.id}>
              <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800">
                {area.name}
              </span>
            </li>
          ))}
        </ul>
      </SectionShell>

      <SectionShell id="register">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <SectionHeading
              eyebrow="Register"
              title="Become a referral partner"
              description="Tell us who you are and we will set up a partner account. You get a dashboard to submit referrals, track their status, and see outcomes attributed to your organisation."
            />
            <ul className="mt-8 space-y-3 text-[0.9375rem] text-ink-700">
              {[
                'A referral takes under a minute to submit',
                'You see contacted, assessment and conversion status',
                'You never see a patient’s clinical record — that belongs to the family',
                'Monthly reporting on your referral volume and outcomes',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-brand-700" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <PartnerRegistrationForm areas={areas} />
        </div>
      </SectionShell>

      <SectionShell tone="surface">
        <SectionHeading title="Questions partners ask" />
        <FaqAccordion items={PARTNER_FAQ} />
      </SectionShell>

      <CtaBand
        title="Have a patient being discharged today?"
        description="Send us the referral and we will call the family within two hours during operating hours. If we cannot cover the area, you will know the same day."
        primaryHref="#register"
        primaryLabel="Submit a referral request"
        secondaryHref="/contact"
        secondaryLabel="Talk to our operations team"
      />
    </>
  );
}
