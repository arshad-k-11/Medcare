import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Alert, Card } from '@/components/ui';
import { SectionShell } from '@/components/marketing/sections';
import { LEGAL_DOCUMENTS, LEGAL_REVIEW_NOTE, findLegalDocument } from '@/content/legal';
import { formatDate } from '@/lib/format';

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = findLegalDocument(slug);
  if (!doc) return { title: 'Not found' };
  return {
    title: doc.title,
    description: doc.metaDescription,
    alternates: { canonical: `/legal/${slug}` },
    // Policy drafts should not be competing for search traffic.
    robots: { index: false, follow: true },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = findLegalDocument(slug);
  if (!doc) notFound();

  return (
    <SectionShell>
      <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
        <article>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Legal</p>
          <h1 className="display-title mt-3 text-3xl text-ink-900 sm:text-4xl">{doc.title}</h1>
          <p className="mt-2 text-sm text-ink-500">Last updated {formatDate(doc.updatedAt)}</p>
          <p className="mt-4 max-w-prose text-lg text-ink-700">{doc.summary}</p>

          {/* The review status is stated at the top of every policy, not buried. */}
          <Alert tone="warning" title="Draft pending professional review" className="mt-6">
            <p>{LEGAL_REVIEW_NOTE}</p>
            <p className="mt-2">
              Text in capitals is a placeholder for a detail only the business can supply — a
              registered entity name, a retention period, a notice period. Those are deliberately
              not invented here.
            </p>
          </Alert>

          <div className="mt-10 space-y-9">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold text-ink-900">{section.heading}</h2>
                <div className="prose-care mt-3">
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
                {section.list?.length ? (
                  <ul className="mt-3 space-y-2">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-3 text-[0.9375rem] text-ink-700">
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
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink-900">All policies</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {LEGAL_DOCUMENTS.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/legal/${other.slug}`}
                    className={
                      other.slug === slug
                        ? 'font-semibold text-ink-900'
                        : 'text-brand-800 hover:underline'
                    }
                    aria-current={other.slug === slug ? 'page' : undefined}
                  >
                    {other.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="mt-4 p-5">
            <h2 className="text-sm font-semibold text-ink-900">Questions about your data?</h2>
            <p className="mt-2 text-sm text-ink-600">
              Write to us and we will answer specifically. You can ask for a copy of what we hold,
              ask us to correct it, or withdraw consent.
            </p>
            <Link
              href="/contact"
              className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
            >
              Contact us →
            </Link>
          </Card>
        </aside>
      </div>
    </SectionShell>
  );
}
