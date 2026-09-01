import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Alert, Badge, ButtonLink, Card, StatusPill } from '@/components/ui';
import { prisma } from '@/lib/db';
import { formatDate, formatDateTime } from '@/lib/format';
import { assessmentStatus } from '@/lib/status';

export const metadata: Metadata = {
  title: 'Track your care assessment request',
  robots: { index: false, follow: false },
};

/**
 * Public status tracking, keyed by the lead reference.
 *
 * Deliberately minimal. The stages are shown as a plain progress view with no clinical
 * information, no caregiver identity, no phone numbers, and no notes — because this page
 * is reachable by anyone holding the reference, and a family will forward the link.
 *
 * Anything richer than this requires a login, which is exactly the right trade.
 */

const STAGES = [
  {
    key: 'RECEIVED',
    title: 'Request received',
    body: 'We have your enquiry and it is in our queue.',
  },
  {
    key: 'CONTACTED',
    title: 'Coordinator has called you',
    body: 'A care coordinator has spoken to you about the situation.',
  },
  {
    key: 'ASSESSMENT_BOOKED',
    title: 'Assessment booked',
    body: 'A time has been agreed for the free home assessment.',
  },
  {
    key: 'ASSESSMENT_DONE',
    title: 'Assessment completed',
    body: 'A nurse or coordinator has visited and written the care plan.',
  },
  {
    key: 'PROPOSAL',
    title: 'Plan shared with you',
    body: 'You have the written plan and the price. The decision is yours.',
  },
  {
    key: 'ACTIVE',
    title: 'Care started',
    body: 'A caregiver has been assigned and visits have begun.',
  },
];

/** Maps the internal lead pipeline onto the six stages a family actually cares about. */
function stageIndexFor(status: string): number {
  switch (status) {
    case 'NEW':
      return 0;
    case 'CONTACTED':
    case 'QUALIFIED':
      return 1;
    case 'ASSESSMENT_BOOKED':
      return 2;
    case 'ASSESSMENT_COMPLETED':
      return 3;
    case 'PROPOSAL_SENT':
      return 4;
    case 'WON':
      return 5;
    default:
      return 1;
  }
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  const lead = await prisma.lead.findUnique({
    where: { reference },
    select: {
      reference: true,
      status: true,
      contactName: true,
      area: true,
      createdAt: true,
      updatedAt: true,
      lostReason: true,
      recommendedPackage: { select: { name: true, slug: true } },
      assessments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, scheduledAt: true, completedAt: true },
      },
    },
  });

  if (!lead) notFound();

  const currentStage = stageIndexFor(lead.status);
  const isClosed = lead.status === 'LOST';
  const assessment = lead.assessments[0];

  return (
    <div className="section">
      <div className="container-page max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
          Request status
        </p>
        <h1 className="display-title mt-3 text-3xl text-ink-900 sm:text-4xl">
          Reference {lead.reference}
        </h1>
        <p className="mt-3 text-ink-600">
          Submitted {formatDate(lead.createdAt)} · Last updated {formatDate(lead.updatedAt)}
        </p>

        {isClosed ? (
          <Alert tone="neutral" title="This request is closed" className="mt-6">
            <p>{lead.lostReason ?? 'This enquiry has been closed.'}</p>
            <p className="mt-2">
              If circumstances have changed, please{' '}
              <Link href="/get-assessment" className="font-semibold underline">
                start a new request
              </Link>{' '}
              or call us — we keep a waitlist by locality.
            </p>
          </Alert>
        ) : null}

        <Card className="mt-8 p-6">
          <ol className="space-y-1">
            {STAGES.map((stage, index) => {
              const state =
                isClosed && index > currentStage
                  ? 'skipped'
                  : index < currentStage
                    ? 'done'
                    : index === currentStage
                      ? 'current'
                      : 'todo';
              return (
                <li key={stage.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        state === 'done'
                          ? 'bg-success text-white'
                          : state === 'current'
                            ? 'bg-brand-100 text-brand-800 ring-2 ring-brand-600'
                            : 'bg-ink-100 text-ink-400'
                      }`}
                      aria-hidden="true"
                    >
                      {state === 'done' ? '✓' : index + 1}
                    </span>
                    {index < STAGES.length - 1 ? (
                      <span
                        className={`my-1 w-px flex-1 ${state === 'done' ? 'bg-success/40' : 'bg-ink-200'}`}
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <div className="pb-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`font-semibold ${
                          state === 'todo' || state === 'skipped' ? 'text-ink-400' : 'text-ink-900'
                        }`}
                      >
                        {stage.title}
                      </p>
                      {state === 'current' ? <Badge tone="brand">In progress</Badge> : null}
                    </div>
                    <p
                      className={`mt-1 text-sm ${
                        state === 'todo' || state === 'skipped' ? 'text-ink-400' : 'text-ink-600'
                      }`}
                    >
                      {stage.body}
                    </p>
                    {/* Only the assessment appointment time is surfaced, because the family
                        needs it. Nothing clinical appears on this unauthenticated page. */}
                    {stage.key === 'ASSESSMENT_BOOKED' && assessment?.scheduledAt ? (
                      <p className="mt-2 text-sm font-medium text-brand-800">
                        Scheduled for {formatDateTime(assessment.scheduledAt)}
                      </p>
                    ) : null}
                    {stage.key === 'ASSESSMENT_DONE' && assessment?.completedAt ? (
                      <p className="mt-2 text-sm font-medium text-brand-800">
                        Completed {formatDateTime(assessment.completedAt)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        {assessment ? (
          <Card className="mt-6 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Assessment
                </p>
                <p className="mt-1 font-semibold text-ink-900">
                  {lead.recommendedPackage?.name ?? 'Care plan to be confirmed'}
                </p>
              </div>
              <StatusPill {...assessmentStatus(assessment.status)} />
            </div>
          </Card>
        ) : null}

        <Alert tone="info" title="Why this page shows so little" className="mt-6">
          <p>
            Anyone with this reference can open this page, so it deliberately shows only the stage
            your request has reached. Care records, visit notes, readings and caregiver details are
            only ever available in your account after signing in.
          </p>
        </Alert>

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/login" variant="outline">
            Sign in to your account
          </ButtonLink>
          <ButtonLink href="/contact" variant="ghost">
            Ask us about this request
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
