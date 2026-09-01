import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Card, SectionHeading, Table, Td } from '@/components/ui';
import { CtaBand } from '@/components/marketing/site-chrome';
import { SectionShell, TrustGrid } from '@/components/marketing/sections';
import { prisma } from '@/lib/db';
import { ESCALATION_LEVEL_LABELS, label, titleise } from '@/lib/constants';
import { formatDuration } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Trust, verification and safety',
  description:
    'How caregiver verification, nurse supervision, incident escalation and data protection actually work at Medcare — including what we do not claim.',
  alternates: { canonical: '/trust-and-safety' },
};

export const revalidate = 300;

export default async function TrustAndSafetyPage() {
  // The escalation matrix is published straight from the configured rules, so the page
  // cannot describe a policy the system does not actually run.
  const rules = await prisma.escalationRule.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <>
      <SectionShell>
        <SectionHeading
          eyebrow="Trust and safety"
          title="What we check, who supervises, and what we will not claim"
          description="A family handing us the keys to their parent's home deserves specifics rather than adjectives. This page is the specifics."
        />
        <TrustGrid />
      </SectionShell>

      <SectionShell tone="surface">
        <SectionHeading
          eyebrow="Verification"
          title="How a caregiver becomes deployable"
        />
        <ol className="mt-10 space-y-3">
          {[
            {
              title: 'Identity and address',
              body: 'Government photo identification and a current address are collected and checked against each other before anything else happens.',
            },
            {
              title: 'Police verification',
              body: 'Obtained and recorded with the date. A caregiver is not deployed to a home before this is on file.',
            },
            {
              title: 'Experience and reference checks',
              body: 'Previous placements are contacted where the caregiver can provide them. Where they cannot, we record that too rather than assuming.',
            },
            {
              title: 'Internal training',
              body: 'Elder-care fundamentals, dignity and privacy, what a caregiver must never do (including anything involving medication doses), and how to escalate. Completion dates and scores are recorded.',
            },
            {
              title: 'Supervised early placements',
              body: 'Early visits are reviewed more closely by a nurse, and a new caregiver is not the only person attending a high-risk patient.',
            },
          ].map((step, index) => (
            <Card as="li" key={step.title} className="flex gap-4 p-5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
              </div>
            </Card>
          ))}
        </ol>

        <Alert
          tone="warning"
          title="Where a check is incomplete, our own system says so"
          className="mt-8 max-w-3xl"
        >
          <p>
            Caregivers carry a verification status of unverified, in progress, verified or rejected.
            Our internal screens show that status wherever a caregiver appears, including in the
            replacement-matching list, and it is flagged as a concern rather than hidden. We do not
            describe a caregiver as verified until the check has actually been completed, and you can
            ask us the status of the person assigned to your parent at any time.
          </p>
        </Alert>
      </SectionShell>

      <SectionShell>
        <SectionHeading
          eyebrow="Escalation"
          title="What happens when something goes wrong"
          description="These are the escalation rules the platform actually runs, published from the same configuration our operations team uses."
        />
        <Card className="mt-8 overflow-hidden">
          <Table
            caption="Escalation rules by trigger"
            head={['Trigger', 'Goes to', 'Family informed', 'Target response', 'What happens']}
          >
            {rules.map((rule) => (
              <tr key={rule.id}>
                <Td className="font-medium text-ink-900">{titleise(rule.trigger)}</Td>
                <Td>{label(ESCALATION_LEVEL_LABELS, rule.notifyLevel)}</Td>
                <Td>{rule.notifyFamily ? 'Yes' : 'Not automatically'}</Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {formatDuration(rule.withinMinutes)}
                </Td>
                <Td className="max-w-md text-ink-600">{rule.instructions}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <div className="mt-6 rounded-card border border-[#f0d5aa] bg-[#fdf8ef] p-5 text-sm leading-relaxed text-[#6b3d05]">
          <strong className="font-semibold">Emergency services are never automated.</strong> No rule
          in this system contacts emergency services on its own, and no automated alert is presented
          as a medical emergency. If a situation is medically urgent, our caregivers are instructed to
          call emergency services first and record it afterwards — the escalation chain never delays
          that.
        </div>
      </SectionShell>

      <SectionShell tone="sand">
        <SectionHeading
          eyebrow="Clinical boundaries"
          title="What this platform does and does not decide"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-semibold text-ink-900">The platform does</h3>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-ink-700">
              {[
                'Record readings exactly as measured',
                'Compare a reading against a configured range set by a nurse',
                'Flag anything outside that range as "requires review"',
                'Route the flag to a qualified nurse',
                'Record medication entered by an authorised person and send reminders',
                'Keep an audit trail of who did what, and when',
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
            <h3 className="font-semibold text-ink-900">The platform does not</h3>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-ink-700">
              {[
                'Diagnose a condition, or suggest what a reading means',
                'Describe an automated flag as a medical emergency',
                'Prescribe, or change a dose a doctor has set',
                'Let a caregiver give anything not on the recorded list',
                'Replace a doctor, a hospital or an emergency service',
                'Make a clinical decision without a qualified professional reviewing it',
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

      <SectionShell tone="surface">
        <SectionHeading
          eyebrow="Data protection"
          title="How your parent's information is handled"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            {
              title: 'Access is limited twice over',
              body: 'A person’s role decides what kinds of action they can take at all, and a separate check decides which specific patients they can touch. A caregiver sees the patients they are assigned to and nothing else.',
            },
            {
              title: 'Documents are never public',
              body: 'Discharge summaries and reports are stored outside the web root or in a private bucket, and are only ever served through an authorised request that is logged. There is no shareable link to a private document.',
            },
            {
              title: 'Sensitive actions are audited',
              body: 'Reading a patient record, recording a reading, changing a care plan, opening a document, replacing a caregiver — each writes an audit entry recording who and when, without storing the sensitive value itself.',
            },
            {
              title: 'Logs do not carry health information',
              body: 'Our application logs redact names, phone numbers, addresses, conditions, notes and readings before anything is written out, so operational logging cannot become a second copy of the medical record.',
            },
            {
              title: 'Family visibility is controllable',
              body: 'More than one family member can be linked to a senior, and whether a particular family member can see clinical detail is a setting rather than an assumption.',
            },
            {
              title: 'Consent is recorded',
              body: 'We record who gave consent for care and when, including where an adult child consented on a parent’s behalf. A referral partner must confirm consent before sending us anything.',
            },
          ].map((item) => (
            <Card key={item.title} className="p-5">
              <h3 className="font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
            </Card>
          ))}
        </div>

        <Alert tone="info" title="What we have not done yet" className="mt-8 max-w-3xl">
          <p>
            We have not completed an external security audit, and our legal, consent and privacy
            wording is drafted but pending professional review before launch. We would rather state
            that here than display a compliance badge we have not earned. Our{' '}
            <Link href="/legal/privacy" className="font-semibold underline">
              privacy notice
            </Link>{' '}
            and{' '}
            <Link href="/legal/consent" className="font-semibold underline">
              consent terms
            </Link>{' '}
            set out the current position.
          </p>
        </Alert>
      </SectionShell>

      <CtaBand
        title="Ask us the awkward questions"
        description="On the assessment call, ask about verification status, who supervises, and what happens when a caregiver does not turn up. You should get a specific answer."
      />
    </>
  );
}
