import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, ButtonLink, Card } from '@/components/ui';
import { CtaBand, EmergencyNotice } from '@/components/marketing/site-chrome';
import { SectionShell } from '@/components/marketing/sections';
import { RESOURCE_ARTICLES, findArticle } from '@/content/resources';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { articleSchema, breadcrumbSchema } from '@/lib/seo';

export const revalidate = 3600;

export function generateStaticParams() {
  return RESOURCE_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) return { title: 'Guide not found' };
  return {
    title: article.metaTitle,
    description: article.metaDescription,
    alternates: { canonical: `/resources/${slug}` },
    openGraph: {
      type: 'article',
      title: article.metaTitle,
      description: article.metaDescription,
    },
  };
}

export default async function ResourceArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();

  const relatedPackages = await prisma.carePackage.findMany({
    where: { slug: { in: article.relatedPackages }, isPublished: true },
    select: { slug: true, name: true, tagline: true, isComingSoon: true },
  });

  const others = RESOURCE_ARTICLES.filter((other) => other.slug !== slug).slice(0, 4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            articleSchema({
              title: article.title,
              description: article.metaDescription,
              slug: article.slug,
              updatedAt: article.updatedAt,
            }),
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Family guides', path: '/resources' },
              { name: article.title, path: `/resources/${article.slug}` },
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
              <Link href="/resources" className="hover:text-brand-700">
                Family guides
              </Link>
            </li>
          </ol>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <article>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{article.readingMinutes} min read</Badge>
              <span className="text-xs text-ink-500">Updated {formatDate(article.updatedAt)}</span>
            </div>

            <h1 className="display-title mt-4 text-4xl leading-[1.15] text-ink-900 text-balance">
              {article.title}
            </h1>

            <div className="prose-care mt-6">
              {article.intro.map((paragraph, index) => (
                <p key={index} className={index === 0 ? 'text-lg text-ink-800' : undefined}>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Table of contents — these guides are long enough to need one. */}
            <nav
              aria-label="On this page"
              className="mt-8 rounded-card border border-[color:var(--border)] bg-sand-50 p-5"
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                On this page
              </h2>
              <ol className="mt-3 space-y-1.5 text-sm">
                {article.sections.map((section, index) => (
                  <li key={section.heading}>
                    <a
                      href={`#section-${index}`}
                      className="text-brand-800 hover:underline"
                    >
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-10 space-y-10">
              {article.sections.map((section, index) => (
                <section key={section.heading} id={`section-${index}`}>
                  <h2 className="text-2xl font-semibold text-ink-900">{section.heading}</h2>
                  <div className="prose-care mt-3">
                    {section.paragraphs.map((paragraph, pIndex) => (
                      <p key={pIndex}>{paragraph}</p>
                    ))}
                  </div>
                  {section.list?.length ? (
                    <ul className="mt-4 space-y-2.5">
                      {section.list.map((item) => (
                        <li key={item} className="flex gap-3 text-[1.0625rem] text-ink-700">
                          <span className="mt-1 text-brand-700" aria-hidden="true">
                            •
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>

            <div className="mt-10 rounded-card border border-[color:var(--border)] bg-sand-50 p-5 text-sm leading-relaxed text-ink-700">
              <strong className="font-semibold text-ink-900">A note on what this is.</strong> This
              guide is practical information for families organising care. It is not medical advice
              and it does not replace a consultation. Decisions about diagnosis, medication and
              treatment belong to the treating doctor.
            </div>
          </article>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="p-5">
              <h2 className="font-semibold text-ink-900">Talk to a care coordinator</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                A free home assessment gives you a written care plan you can keep, whether or not you
                go ahead with us.
              </p>
              <ButtonLink href="/get-assessment" fullWidth className="mt-4">
                Get a free assessment
              </ButtonLink>
            </Card>

            {relatedPackages.length ? (
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-ink-900">Relevant care plans</h2>
                <ul className="mt-3 space-y-3 text-sm">
                  {relatedPackages.map((pkg) => (
                    <li key={pkg.slug}>
                      <Link
                        href={`/care-packages/${pkg.slug}`}
                        className="font-medium text-brand-800 hover:underline"
                      >
                        {pkg.name}
                      </Link>
                      {pkg.isComingSoon ? (
                        <span className="ml-2 text-xs text-ink-500">(coming soon)</span>
                      ) : null}
                      <p className="mt-0.5 text-ink-600">{pkg.tagline}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink-900">Other guides</h2>
              <ul className="mt-3 space-y-2.5 text-sm">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/resources/${other.slug}`}
                      className="text-brand-800 hover:underline"
                    >
                      {other.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <EmergencyNotice />
          </aside>
        </div>
      </SectionShell>

      <CtaBand
        title="Start with a free care assessment"
        description="A nurse or care coordinator visits, reviews the situation, and writes a plan. Three minutes to request, and no obligation afterwards."
      />
    </>
  );
}
