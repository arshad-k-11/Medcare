import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, ButtonLink, Card, DescriptionList } from '@/components/ui';
import { CtaBand, EmergencyNotice } from '@/components/marketing/site-chrome';
import { PriceFrom, SectionShell } from '@/components/marketing/sections';
import { prisma } from '@/lib/db';
import { readList } from '@/lib/json-list';
import { FREQUENCY_LABELS, SERVICE_CLASS_LABELS, label } from '@/lib/constants';
import { breadcrumbSchema, packageSchema } from '@/lib/seo';

export const revalidate = 300;

export async function generateStaticParams() {
  const packages = await prisma.carePackage.findMany({
    where: { isPublished: true },
    select: { slug: true },
  });
  return packages.map((pkg) => ({ slug: pkg.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await prisma.carePackage.findUnique({
    where: { slug },
    select: { name: true, summary: true, tagline: true },
  });
  if (!pkg) return { title: 'Care plan not found' };
  return {
    title: `${pkg.name} — elder care in Mumbai`,
    description: pkg.summary.slice(0, 300),
    alternates: { canonical: `/care-packages/${slug}` },
    openGraph: { title: pkg.name, description: pkg.tagline },
  };
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pkg = await prisma.carePackage.findFirst({
    where: { slug, isPublished: true },
    include: {
      services: {
        orderBy: { sortOrder: 'asc' },
        include: { service: true },
      },
    },
  });

  if (!pkg) notFound();

  const outcomes = readList(pkg.outcomes);
  const notIncluded = readList(pkg.notIncluded);
  const paragraphs = pkg.details.split('\n').filter(Boolean);

  const otherPackages = await prisma.carePackage.findMany({
    where: { isPublished: true, slug: { not: slug } },
    orderBy: { sortOrder: 'asc' },
    take: 3,
    select: { slug: true, name: true, tagline: true },
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            packageSchema(pkg),
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Care plans', path: '/care-packages' },
              { name: pkg.name, path: `/care-packages/${pkg.slug}` },
            ]),
          ]),
        }}
      />

      <SectionShell>
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-ink-500">
            <li>
              <Link href="/" className="hover:text-brand-700">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/care-packages" className="hover:text-brand-700">
                Care plans
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink-800">{pkg.name}</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="flex flex-wrap gap-2">
              {pkg.isComingSoon ? <Badge tone="warning">Coming soon</Badge> : null}
              <Badge tone="neutral">{pkg.durationLabel}</Badge>
              <Badge tone="brand">
                {pkg.billingCycle === 'MONTHLY' ? 'Monthly plan' : 'One-time plan'}
              </Badge>
            </div>

            <h1 className="display-title mt-4 text-4xl text-ink-900 text-balance">{pkg.name}</h1>
            <p className="mt-3 text-lg text-ink-600">{pkg.tagline}</p>

            <div className="prose-care mt-8">
              <p className="text-lg font-medium text-ink-800">{pkg.summary}</p>
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <h2 className="mt-10 text-xl font-semibold text-ink-900">What you get</h2>
            <ul className="mt-4 space-y-2.5">
              {outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-3 text-[0.9375rem] text-ink-700">
                  <span className="mt-0.5 font-semibold text-brand-700" aria-hidden="true">
                    ✓
                  </span>
                  {outcome}
                </li>
              ))}
            </ul>

            {/* Scope limits are given the same visual weight as the benefits. */}
            <h2 className="mt-10 text-xl font-semibold text-ink-900">
              What this plan does not include
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Stated plainly so there is no surprise later.
            </p>
            <ul className="mt-4 space-y-2.5">
              {notIncluded.map((item) => (
                <li key={item} className="flex gap-3 text-[0.9375rem] text-ink-700">
                  <span className="mt-0.5 text-ink-400" aria-hidden="true">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <h2 className="mt-10 text-xl font-semibold text-ink-900">Services in this plan</h2>
            <div className="mt-4 space-y-3">
              {pkg.services.map((row) => (
                <Card key={row.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink-900">{row.service.name}</p>
                    <div className="flex gap-2">
                      <Badge tone="neutral">{label(FREQUENCY_LABELS, row.frequency)}</Badge>
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
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {row.service.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="p-6 shadow-lift">
              <PriceFrom
                priceFromPaise={pkg.priceFromPaise}
                billingCycle={pkg.billingCycle}
                isComingSoon={pkg.isComingSoon}
                size="lg"
              />
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                The figure above is a starting point held by our operations team. Your actual plan and
                price are confirmed after the free home assessment, and nothing is charged before you
                agree to it.
              </p>

              {pkg.isComingSoon ? (
                <>
                  <ButtonLink href="/get-assessment" fullWidth size="lg" className="mt-6">
                    Tell us you need this
                  </ButtonLink>
                  <p className="mt-3 text-sm text-ink-500">
                    We will be honest about whether we can serve your area yet, and we will call when
                    we can.
                  </p>
                </>
              ) : (
                <>
                  <ButtonLink
                    href={`/get-assessment?package=${pkg.slug}`}
                    fullWidth
                    size="lg"
                    className="mt-6"
                  >
                    Get a free care assessment
                  </ButtonLink>
                  <ButtonLink href="/pricing" fullWidth variant="outline" className="mt-3">
                    Estimate your monthly cost
                  </ButtonLink>
                </>
              )}

              <DescriptionList
                className="mt-6 border-t border-[color:var(--border)] pt-5"
                columns={1}
                items={[
                  { label: 'Duration', value: pkg.durationLabel },
                  {
                    label: 'Billing',
                    value: pkg.billingCycle === 'MONTHLY' ? 'Monthly, cancellable' : 'One-time',
                  },
                  { label: 'Nurse supervision', value: 'Included in every plan' },
                  { label: 'Family reporting', value: 'Included in every plan' },
                ]}
              />
            </Card>

            <EmergencyNotice className="mt-4" />

            <Card className="mt-4 p-5">
              <h2 className="text-sm font-semibold text-ink-900">Other plans</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {otherPackages.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/care-packages/${other.slug}`}
                      className="font-medium text-brand-800 hover:underline"
                    >
                      {other.name}
                    </Link>
                    <p className="mt-0.5 text-ink-600">{other.tagline}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      </SectionShell>

      <CtaBand
        title="Book the assessment and see the real plan"
        description="A nurse or care coordinator visits, reviews the situation and writes a plan. You keep the plan whether or not you go ahead with us."
      />
    </>
  );
}
