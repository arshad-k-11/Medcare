import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Card, SectionHeading } from '@/components/ui';
import { CtaBand } from '@/components/marketing/site-chrome';
import { PriceFrom, SectionShell } from '@/components/marketing/sections';
import { PricingCalculator } from '@/components/marketing/pricing-calculator';
import { prisma } from '@/lib/db';
import { formatMoney } from '@/lib/format';
import { SERVICE_CLASS_LABELS, label } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Elder care pricing in Mumbai — estimate your monthly cost',
  description:
    'Indicative elder-care pricing for Mumbai. Estimate a monthly cost from visit frequency, caregiver hours, nurse visits and coordination, then confirm the real plan after a free assessment.',
  alternates: { canonical: '/pricing' },
};

export const revalidate = 300;

export default async function PricingPage() {
  const [packages, services] = await Promise.all([
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
      },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        unit: true,
        basePricePaise: true,
        serviceClass: true,
        description: true,
      },
    }),
  ]);

  // Only services with a rate on record can appear in an estimate.
  const pricedServices = services.filter((service) => service.basePricePaise > 0);
  const optionalServices = pricedServices.filter((service) =>
    ['appointment-escort', 'companion-visits', 'home-safety-review', 'vitals-monitoring'].some(
      (slugish) => service.name.toLowerCase().includes(slugish.split('-')[0]),
    ),
  );

  return (
    <>
      <SectionShell>
        <SectionHeading
          eyebrow="Pricing"
          title="Indicative prices, confirmed after the assessment"
          description="We do not publish a fixed price for elder care, because the honest price depends on what the assessment finds. What we can do is show you our current rates and let you build an estimate before you talk to anyone."
        />

        <Alert
          tone="info"
          title="How to read these numbers"
          className="mt-8 max-w-3xl"
        >
          <p>
            Every figure on this page is an indicative rate maintained by our operations team, shown
            as a starting point. An estimate you build here is a band, not a quote — the plan and
            price are agreed in writing after the free home assessment, and nothing is charged
            before that.
          </p>
        </Alert>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.slug} className="flex flex-col p-5">
              <h2 className="font-semibold text-ink-900">{pkg.name}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-600">{pkg.tagline}</p>
              <div className="mt-4 border-t border-[color:var(--border)] pt-4">
                <PriceFrom
                  priceFromPaise={pkg.priceFromPaise}
                  billingCycle={pkg.billingCycle}
                  isComingSoon={pkg.isComingSoon}
                />
                <p className="mt-2 text-xs text-ink-500">{pkg.durationLabel}</p>
                <Link
                  href={`/care-packages/${pkg.slug}`}
                  className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
                >
                  What is included →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell tone="surface" id="calculator">
        <SectionHeading
          eyebrow="Estimate"
          title="Build a rough monthly estimate"
          description="Adjust the inputs to match what you think is needed. The calculation uses our current rates, and it shows you the arithmetic rather than a single mysterious number."
        />
        <div className="mt-10">
          <PricingCalculator optionalServices={optionalServices} />
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeading
          eyebrow="Rate card"
          title="Our current indicative rates"
          description="Non-medical support, nursing services and coordination are priced and shown separately."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {pricedServices.map((service) => (
            <Card key={service.id} className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-ink-900">{service.name}</h3>
                <p className="text-sm font-semibold tabular-nums text-brand-800">
                  {formatMoney(service.basePricePaise)}
                  <span className="font-normal text-ink-500"> / {service.unit.toLowerCase()}</span>
                </p>
              </div>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-400">
                {label(SERVICE_CLASS_LABELS, service.serviceClass)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{service.description}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell tone="sand">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink-900">What affects your price</h2>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-ink-700">
              {[
                'How many hours of caregiver support per day, and how many days a week',
                'Whether a live-in or night shift is needed',
                'How often a nurse reviews the plan',
                'Whether coordination is shared or a dedicated coordinator',
                'Appointment escorts and any additional services',
                'The area, since travel affects who we can assign',
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
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink-900">What we will not do on price</h2>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-ink-700">
              {[
                'Quote a figure before we have seen the situation',
                'Add charges that were not in the written plan',
                'Charge for a replacement caregiver when the change was ours to manage',
                'Bill for a visit that did not happen',
                'Lock a family into a long contract to get a lower monthly rate',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-ink-400" aria-hidden="true">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-ink-600">
              Tax treatment is still being confirmed with our accountant, so estimates here exclude
              any applicable tax. Your written plan will state it explicitly.
            </p>
          </Card>
        </div>
      </SectionShell>

      <CtaBand
        title="Get an actual price, not an estimate"
        description="The free assessment produces a written plan with a firm price. If it turns out you need less than you thought, we will say so."
      />
    </>
  );
}
