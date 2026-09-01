import type { Metadata } from 'next';
import { Card, SectionHeading } from '@/components/ui';
import { CtaBand } from '@/components/marketing/site-chrome';
import { SectionShell, SupervisionExplainer } from '@/components/marketing/sections';
import { MATCH_WEIGHTS } from '@/lib/services/matching';
import { titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'How caregiver supervision and replacement work',
  description:
    'How Medcare supervises caregivers, reviews their notes, and arranges replacement cover — including the exact factors used to rank a replacement caregiver.',
  alternates: { canonical: '/caregiver-supervision' },
};

const WEIGHT_EXPLANATIONS: Record<keyof typeof MATCH_WEIGHTS, string> = {
  proximity:
    'Whether the caregiver already works in your area. Weighted highest because travel time is the biggest cause of late and missed visits.',
  availability:
    'Whether they have no conflicting visit in the window your plan needs. A caregiver who is nominally suitable but already booked is not a candidate.',
  skills: 'How many of the specific skills your care plan requires are recorded against them.',
  language:
    'Whether they share a language the family asked for. In practice this is the strongest predictor of whether a senior accepts a new caregiver.',
  shift:
    'Whether the shift pattern your plan needs matches what they already work — a night-shift caregiver moved to mornings tends not to last.',
  experience: 'Years of experience. A tie-breaker, deliberately small.',
  performance:
    'Their internal performance score from visit completion, punctuality and family feedback. Also a tie-breaker.',
};

export default function CaregiverSupervisionPage() {
  const weights = Object.entries(MATCH_WEIGHTS) as [keyof typeof MATCH_WEIGHTS, number][];

  return (
    <>
      <SectionShell>
        <SupervisionExplainer />
      </SectionShell>

      <SectionShell tone="surface">
        <SectionHeading
          eyebrow="Replacement"
          title="How we choose a replacement caregiver"
          description="This is our biggest operational promise, so here is exactly how it works rather than a reassurance that it does."
        />

        <div className="prose-care mt-8">
          <p>
            When a caregiver becomes unavailable — leave, illness, a family emergency, a performance
            review, or a family request — the assignment is flagged and the affected visits are marked
            at risk. Our operations team then gets a ranked list of who can cover, scored on the
            factors below out of 100.
          </p>
          <p>
            Every candidate carries the reasons they scored well and the concerns against them. A
            caregiver whose verification is still in progress is not silently excluded and not
            silently included — the status is shown, and a person decides.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {weights.map(([factor, weight]) => (
            <Card key={factor} className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-ink-900">{titleise(factor)}</h3>
                <span className="text-sm font-semibold tabular-nums text-brand-800">
                  {weight} points
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${weight}%` }}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                {WEIGHT_EXPLANATIONS[factor]}
              </p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeading
          eyebrow="Hard limits"
          title="Who is never offered as a replacement"
          description="Some things exclude a caregiver outright rather than lowering their score."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'On approved leave',
              body: 'If we have approved their leave, we do not then ask them to cover. That is how a service burns out its own staff.',
            },
            {
              title: 'Under internal review or inactive',
              body: 'A caregiver whose conduct or performance is under review is not deployed to a new home until that is resolved.',
            },
            {
              title: 'Already at capacity',
              body: 'Each caregiver has a maximum concurrent caseload. Exceeding it is how visits start being cut short.',
            },
          ].map((item) => (
            <Card key={item.title} className="p-5">
              <h3 className="font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell tone="sand">
        <SectionHeading
          eyebrow="What you are told"
          title="A change of caregiver is never a surprise at the door"
        />
        <ol className="mt-8 space-y-3">
          {[
            'The reason for the change is recorded against the assignment — not left as "operational reasons".',
            'You are told who the new caregiver is, what languages they speak, and when they start.',
            'Your parent is told in advance, so somebody new does not simply arrive.',
            'The outgoing caregiver hands over through the care plan and notes, so the new person is not starting from nothing.',
            'The change appears in your care timeline, with the reason, so it is still visible in three months.',
          ].map((item, index) => (
            <Card as="li" key={item} className="flex gap-4 p-5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <p className="text-[0.9375rem] leading-relaxed text-ink-700">{item}</p>
            </Card>
          ))}
        </ol>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink-600">
          We describe this as a process we run, not as a guarantee of instant cover. Some
          combinations — an unusual language, a night shift in a thinly staffed area — take longer,
          and where that is the case we will tell you honestly instead of promising a same-day
          replacement we cannot deliver.
        </p>
      </SectionShell>

      <CtaBand
        title="Ask us about the Tuesday problem"
        description="On the assessment call, ask what happens if the caregiver does not turn up. You should get a specific answer with a time attached."
      />
    </>
  );
}
