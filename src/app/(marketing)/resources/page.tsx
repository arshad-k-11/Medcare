import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, SectionHeading } from '@/components/ui';
import { CtaBand } from '@/components/marketing/site-chrome';
import { SectionShell } from '@/components/marketing/sections';
import { RESOURCE_ARTICLES } from '@/content/resources';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Family guides to elder care in Mumbai',
  description:
    'Practical guides for families arranging elder care in Mumbai: post-hospital care, hiring a caregiver, chronic care, dementia companionship, fall prevention and NRI parent care.',
  alternates: { canonical: '/resources' },
};

export default function ResourcesPage() {
  return (
    <>
      <SectionShell>
        <SectionHeading
          eyebrow="Family guides"
          title="Practical guides, including the parts that do not involve hiring us"
          description="Written for a family reading at 11pm the night before a discharge. No clinical advice, no invented statistics, and no fear-based framing — where something needs a doctor, we say so."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {RESOURCE_ARTICLES.map((article) => (
            <Card as="article" key={article.slug} className="flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{article.readingMinutes} min read</Badge>
                <span className="text-xs text-ink-400">
                  Updated {formatDate(article.updatedAt)}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-ink-900">
                <Link href={`/resources/${article.slug}`} className="hover:text-brand-800">
                  {article.title}
                </Link>
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
                {article.intro[0]}
              </p>
              <p className="mt-4 text-sm font-semibold text-brand-700">
                <Link href={`/resources/${article.slug}`} className="hover:underline">
                  Read the guide →
                </Link>
              </p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <CtaBand
        title="Reading this at a difficult moment?"
        description="If a parent is being discharged or something has changed suddenly, start the free assessment and a care coordinator will call you back."
      />
    </>
  );
}
