import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, SectionHeading, Table, Td } from '@/components/ui';
import { CtaBand } from '@/components/marketing/site-chrome';
import { PackageCard, PriceFrom, SectionShell } from '@/components/marketing/sections';
import { prisma } from '@/lib/db';
import { readList } from '@/lib/json-list';
import { FREQUENCY_LABELS, SERVICE_CLASS_LABELS, label } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Elder care plans in Mumbai — post-discharge, chronic care, NRI coordination',
  description:
    'Compare structured elder-care plans: 14-day post-discharge recovery, monthly chronic care support, NRI parent care coordination, fall prevention and companion support.',
  alternates: { canonical: '/care-packages' },
};

export const revalidate = 300;

export default async function CarePackagesPage() {
  const packages = await prisma.carePackage.findMany({
    where: { isPublished: true },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    include: {
      services: {
        orderBy: { sortOrder: 'asc' },
        include: { service: { select: { name: true, serviceClass: true } } },
      },
    },
  });

  return (
    <>
      <SectionShell>
        <SectionHeading
          eyebrow="Care plans"
          title="Structured plans, not an hourly caregiver listing"
          description="Each plan is a defined set of outcomes with a schedule, nurse supervision and family reporting built in. Prices shown are indicative starting points — your plan and price are confirmed after the free home assessment."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard key={pkg.slug} pkg={pkg} />
          ))}
        </div>
      </SectionShell>

      {/* Comparison table — what a family actually wants when choosing. */}
      <SectionShell tone="surface">
        <SectionHeading
          title="What is in each plan"
          description="Non-medical support, nursing services and coordination are shown separately, because the difference matters both practically and legally."
        />
        <Card className="mt-8 overflow-hidden">
          <Table
            caption="Services included in each care plan"
            head={['Plan', 'Duration', 'Included services', 'Starting from']}
          >
            {packages.map((pkg) => (
              <tr key={pkg.slug}>
                <Td>
                  <Link
                    href={`/care-packages/${pkg.slug}`}
                    className="font-semibold text-brand-800 hover:underline"
                  >
                    {pkg.name}
                  </Link>
                  {pkg.isComingSoon ? (
                    <span className="mt-1 block">
                      <Badge tone="warning">Coming soon</Badge>
                    </span>
                  ) : null}
                </Td>
                <Td className="whitespace-nowrap">{pkg.durationLabel}</Td>
                <Td>
                  <ul className="space-y-1.5">
                    {pkg.services.map((row) => (
                      <li key={row.id} className="flex flex-wrap items-center gap-2">
                        <span>{row.service.name}</span>
                        <span className="text-xs text-ink-500">
                          {label(FREQUENCY_LABELS, row.frequency)}
                        </span>
                        <Badge
                          tone={
                            row.service.serviceClass === 'NURSING'
                              ? 'info'
                              : row.service.serviceClass === 'COORDINATION'
                                ? 'brand'
                                : 'neutral'
                          }
                        >
                          {label(SERVICE_CLASS_LABELS, row.service.serviceClass)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </Td>
                <Td className="whitespace-nowrap">
                  <PriceFrom
                    priceFromPaise={pkg.priceFromPaise}
                    billingCycle={pkg.billingCycle}
                    isComingSoon={pkg.isComingSoon}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </SectionShell>

      <SectionShell>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink-900">Not sure which plan fits?</h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-600">
              You do not have to decide. The assessment exists to answer this question — a nurse or
              coordinator looks at the actual situation and recommends a plan, and you can say no.
              Most families start smaller than they expect to.
            </p>
            <p className="mt-4 text-sm">
              <Link href="/get-assessment" className="font-semibold text-brand-700 hover:underline">
                Start the free assessment →
              </Link>
            </p>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink-900">What no plan includes</h2>
            <ul className="mt-3 space-y-2 text-[0.9375rem] text-ink-600">
              {[
                'Medical treatment, procedures or prescriptions',
                'Emergency medical response — call emergency services first',
                'Diagnosis or clinical interpretation of readings outside a nurse review',
                'Doctor consultations (we coordinate, we do not provide them)',
                'General housekeeping unrelated to care',
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
      </SectionShell>

      <CtaBand
        title="Start with the assessment, choose the plan afterwards"
        description="Three minutes of questions, then a call back from a care coordinator. Nothing is committed until you have the written plan in front of you."
      />
    </>
  );
}
