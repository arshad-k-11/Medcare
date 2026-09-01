import type { Metadata } from 'next';
import { Card, SectionHeading } from '@/components/ui';
import { CtaBand, EmergencyNotice } from '@/components/marketing/site-chrome';
import { HowItWorks, SectionShell, SupervisionExplainer } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'How our elder care service works',
  description:
    'From first enquiry to daily care: assessment, written care plan, caregiver assignment, nurse supervision, family reporting and plan review.',
  alternates: { canonical: '/how-it-works' },
};

export default function HowItWorksPage() {
  return (
    <>
      <SectionShell>
        <SectionHeading
          eyebrow="How it works"
          title="From a worried phone call to care that runs on a schedule"
          description="This page describes the actual process, including the parts that are slower than a marketing page would like them to be."
        />
        <div className="mt-10">
          <HowItWorks heading={false} />
        </div>
        <EmergencyNotice className="mt-8 max-w-3xl" />
      </SectionShell>

      <SectionShell tone="surface">
        <SectionHeading
          eyebrow="The assessment"
          title="What happens in the home visit"
          description="It takes 45 to 60 minutes and it is genuinely free, including if you decide not to go ahead."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            {
              title: 'We read the papers',
              body: 'Discharge summary, medication list, recent reports. We record medication exactly as prescribed — we never change it — so there is one accurate list everyone works from.',
            },
            {
              title: 'We watch how they actually move',
              body: 'How your parent gets out of a chair, into the bathroom and along a corridor tells us more than how they describe it. Fall risk is assessed from behaviour, not self-report.',
            },
            {
              title: 'We look at the house',
              body: 'Bathroom, lighting, floor surfaces, the route used at night, furniture heights. Most preventable falls have a physical cause you can point at.',
            },
            {
              title: 'We ask what the family can realistically do',
              body: 'A plan that assumes you will be there every evening will fail. We would rather design around what actually happens.',
            },
            {
              title: 'We agree what "better" means',
              body: 'One to three goals, written down in plain language. "Walk to the lobby unaided by day 14" is a goal. "Improve mobility" is not.',
            },
            {
              title: 'We tell you if you need less than you asked for',
              body: 'Sometimes the answer is a safety assessment and two visits a week, not a full-time attendant. We will say so, and we will say if we cannot serve your area.',
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
        <SupervisionExplainer />
      </SectionShell>

      <SectionShell tone="sand">
        <SectionHeading
          eyebrow="Reviews and endings"
          title="Every plan has a review date, and stopping is a real option"
          description="A care plan that only ever grows is a commercial arrangement, not a care plan."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Fixed review dates',
              body: 'Every plan carries a review date. A nurse revisits the goals, the notes and the readings, and the plan changes, continues or ends.',
            },
            {
              title: 'Version history',
              body: 'Each revision is stored with a note explaining what changed and why, so you can see the reasoning months later.',
            },
            {
              title: 'Ending well',
              body: 'When support is no longer needed we say so and close the plan, with a written summary you can keep. Monthly plans are cancellable.',
            },
          ].map((item) => (
            <Card key={item.title} className="p-5">
              <h3 className="font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <CtaBand
        title="Start with the assessment"
        description="Three minutes of questions and a call back from a care coordinator. You keep the written plan either way."
      />
    </>
  );
}
