import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, ClipboardCheck, TriangleAlert } from 'lucide-react';
import {
  Alert,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
} from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { nurseOverview } from '@/lib/queries/nurse';
import { formatDate, formatDateTime, formatName } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Nurse dashboard',
  robots: { index: false, follow: false },
};

/**
 * The nurse supervisor's overview.
 *
 * Ordered as a work queue rather than a summary: what is waiting for a professional, then
 * what is scheduled. The review counts are the primary number on the page because an
 * unreviewed flagged reading is the single thing this role exists to prevent.
 */
export default async function NurseDashboardPage() {
  const user = await requirePageUser(['NURSE', 'ADMIN', 'OPS_MANAGER']);
  const overview = await nurseOverview(user);

  const waiting = overview.notesToReview + overview.vitalsToReview;

  return (
    <div>
      <PageHeader
        title={`Good day, ${user.name.split(' ')[0]}`}
        description="Your caseload, ordered by what is waiting for you."
        action={
          <ButtonLink href="/app/nurse/reviews">
            Review queue{waiting > 0 ? ` (${waiting})` : ''}
          </ButtonLink>
        }
      />

      {overview.openEscalations > 0 ? (
        <Alert
          tone="danger"
          title={`${overview.openEscalations} open escalation${overview.openEscalations === 1 ? '' : 's'}`}
          icon={<TriangleAlert className="h-4 w-4" />}
          className="mb-6"
        >
          <p>
            Something has been escalated to you and is not yet closed.{' '}
            <Link href="/app/nurse/escalations" className="font-semibold underline">
              Open the escalation list
            </Link>
            .
          </p>
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Readings awaiting review"
          value={overview.vitalsToReview}
          tone={overview.vitalsToReview > 0 ? 'warning' : 'success'}
          href="/app/nurse/reviews"
          hint="Flagged, not interpreted"
        />
        <Stat
          label="Notes awaiting review"
          value={overview.notesToReview}
          tone={overview.notesToReview > 0 ? 'warning' : 'success'}
          href="/app/nurse/reviews"
        />
        <Stat
          label="Open incidents"
          value={overview.openIncidents}
          tone={overview.openIncidents > 0 ? 'danger' : 'success'}
          href="/app/nurse/escalations"
        />
        <Stat
          label="Missed visits this week"
          value={overview.missedVisits}
          tone={overview.missedVisits > 0 ? 'danger' : 'success'}
          hint="Operations follows up on each"
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Stat label="Active patients in your caseload" value={overview.activePatients} href="/app/nurse/patients" />
        <Stat label="Visits scheduled today" value={overview.todayVisits} href="/app/nurse/visits" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Your upcoming review visits"
            action={
              <ButtonLink href="/app/nurse/visits" variant="ghost" size="sm">
                All visits
              </ButtonLink>
            }
          />
          {overview.upcomingReviews.length ? (
            <ul className="divide-y divide-[color:var(--border)]">
              {overview.upcomingReviews.map((visit) => (
                <li key={visit.id} className="flex items-center gap-3 px-5 py-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/app/nurse/patients/${visit.senior.id}`}
                      className="font-medium text-ink-900 hover:text-brand-800 hover:underline"
                    >
                      {formatName(visit.senior)}
                    </Link>
                    <p className="text-sm text-ink-600">
                      {formatDateTime(visit.scheduledStart)} · {visit.senior.area}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No review visits scheduled"
              description="Care plans due for review are listed alongside. Book a visit from the patient's record."
            />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Care plans due for review"
            description="A plan without a review date is a plan nobody is checking."
          />
          {overview.plansDueReview.length ? (
            <ul className="divide-y divide-[color:var(--border)]">
              {overview.plansDueReview.map((plan) => {
                const overdue = plan.reviewDate ? plan.reviewDate < new Date() : false;
                return (
                  <li key={plan.id} className="flex items-center gap-3 px-5 py-3">
                    <ClipboardCheck
                      className={`h-4 w-4 shrink-0 ${overdue ? 'text-danger' : 'text-brand-700'}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/app/nurse/patients/${plan.senior.id}`}
                        className="font-medium text-ink-900 hover:text-brand-800 hover:underline"
                      >
                        {formatName(plan.senior)}
                      </Link>
                      <p className={`text-sm ${overdue ? 'font-medium text-danger' : 'text-ink-600'}`}>
                        {plan.reviewDate
                          ? `${overdue ? 'Overdue since' : 'Due'} ${formatDate(plan.reviewDate)}`
                          : 'No review date set'}
                        {' · '}v{plan.version}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="No plans due in the next week"
              description="Every active plan has a review date further out."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
