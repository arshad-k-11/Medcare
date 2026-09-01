import type { Metadata } from 'next';
import { SectionHeading } from '@/components/ui';
import { CtaBand } from '@/components/marketing/site-chrome';
import { FaqAccordion, SectionShell } from '@/components/marketing/sections';
import { ALL_FAQ, HOME_FAQ } from '@/content/faq';
import { faqSchema } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Frequently asked questions about elder care in Mumbai',
  description:
    'Answers on verification, supervision, missed visits, medication, pricing, service areas, data protection and what our elder-care service does not do.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Only the primary set feeds structured data, to avoid an oversized FAQPage entity.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(HOME_FAQ)) }}
      />

      <SectionShell>
        <SectionHeading
          eyebrow="Questions"
          title="The things families actually ask us"
          description="Including the awkward ones. If your question is not here, ask it on the assessment call — you should get a specific answer, not a reassurance."
        />
        <div className="mt-10 space-y-12">
          {ALL_FAQ.map((group) => (
            <div key={group.section}>
              <h2 className="text-xl font-semibold text-ink-900">{group.section}</h2>
              <FaqAccordion items={group.items} className="mt-2" />
            </div>
          ))}
        </div>
      </SectionShell>

      <CtaBand
        title="Still have a question?"
        description="Start the free assessment and ask a care coordinator directly, or send us a message and we will reply during Mumbai working hours."
        secondaryHref="/contact"
        secondaryLabel="Send us a message"
      />
    </>
  );
}
