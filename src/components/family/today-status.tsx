import { Check, Circle, Clock, TriangleAlert } from 'lucide-react';
import { Badge, Card, StatusPill } from '@/components/ui';
import { formatTime, formatVital } from '@/lib/format';
import { visitStatus } from '@/lib/status';
import { VISIT_KIND_LABELS, label } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Visit = {
  id: string;
  kind: string;
  status: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  summary: string | null;
  caregiver: { user: { name: string } } | null;
  nurse: { user: { name: string } } | null;
  tasks: { id: string; label: string; status: string; note: string | null }[];
};

type Reminder = {
  id: string;
  dueAt: Date;
  status: string;
  medication: { name: string; dose: string };
};

type FlaggedVital = {
  id: string;
  type: string;
  valueNumber: number;
  valueSecondary: number | null;
  measuredAt: Date;
  note: string | null;
};

/**
 * "Care today" — the block a family checks first, and often the only thing they read.
 *
 * Shows what has actually happened rather than what is scheduled to happen, with completed
 * items ticked and pending items visibly pending. Nothing here is interpreted: a flagged
 * reading says a nurse will review it, never what it might mean.
 */
export function TodayStatus({
  visits,
  reminders,
  flaggedVitals,
  openIncidents,
}: {
  visits: Visit[];
  reminders: Reminder[];
  flaggedVitals: FlaggedVital[];
  openIncidents: number;
}) {
  const hasAnything = visits.length > 0 || reminders.length > 0;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
        <h2 className="text-base font-semibold text-ink-900">Care today</h2>
        {openIncidents > 0 ? (
          <Badge tone="warning" icon={<TriangleAlert className="h-3.5 w-3.5" />}>
            {openIncidents} item{openIncidents === 1 ? '' : 's'} being handled
          </Badge>
        ) : null}
      </div>

      <div className="px-5 py-4">
        {!hasAnything ? (
          <p className="text-sm text-ink-600">
            Nothing is scheduled for today. Upcoming visits appear below, and the care team will
            contact you if anything changes.
          </p>
        ) : null}

        {visits.map((visit) => {
          const who = visit.caregiver?.user.name ?? visit.nurse?.user.name ?? 'Care team';
          const done = visit.tasks.filter((task) => task.status === 'DONE').length;
          return (
            <div key={visit.id} className="mb-5 last:mb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink-900">{who}</p>
                  <p className="text-sm text-ink-500">
                    {label(VISIT_KIND_LABELS, visit.kind)} · {formatTime(visit.scheduledStart)}–
                    {formatTime(visit.scheduledEnd)}
                  </p>
                </div>
                <StatusPill {...visitStatus(visit.status)} />
              </div>

              <ul className="mt-3 space-y-2">
                <StatusRow
                  done={Boolean(visit.checkInAt)}
                  label={
                    visit.checkInAt
                      ? `Arrived at ${formatTime(visit.checkInAt)}`
                      : visit.status === 'MISSED'
                        ? 'Did not arrive — our team is arranging cover'
                        : 'Not yet arrived'
                  }
                  tone={visit.status === 'MISSED' ? 'critical' : undefined}
                />
                {visit.tasks.map((task) => (
                  <StatusRow
                    key={task.id}
                    done={task.status === 'DONE'}
                    label={
                      task.status === 'REFUSED'
                        ? `${task.label} — declined${task.note ? `: ${task.note}` : ''}`
                        : task.status === 'NOT_APPLICABLE'
                          ? `${task.label} — not needed today${task.note ? `: ${task.note}` : ''}`
                          : task.label
                    }
                    tone={task.status === 'REFUSED' ? 'attention' : undefined}
                  />
                ))}
                {visit.checkOutAt ? (
                  <StatusRow
                    done
                    label={`Visit completed at ${formatTime(visit.checkOutAt)} · ${done} of ${visit.tasks.length} tasks done`}
                  />
                ) : null}
              </ul>

              {visit.summary ? (
                <p className="mt-3 rounded-card bg-sand-50 px-3 py-2 text-sm text-ink-700">
                  “{visit.summary}”
                </p>
              ) : null}
            </div>
          );
        })}

        {reminders.length ? (
          <div className="mt-5 border-t border-[color:var(--border)] pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Medication reminders today
            </h3>
            <ul className="mt-3 space-y-2">
              {reminders.map((reminder) => (
                <StatusRow
                  key={reminder.id}
                  done={reminder.status === 'CONFIRMED'}
                  tone={
                    reminder.status === 'MISSED'
                      ? 'critical'
                      : reminder.status === 'SKIPPED'
                        ? 'attention'
                        : undefined
                  }
                  label={`${formatTime(reminder.dueAt)} — ${reminder.medication.name} ${reminder.medication.dose}${
                    reminder.status === 'MISSED'
                      ? ' · missed, flagged to the care team'
                      : reminder.status === 'SKIPPED'
                        ? ' · recorded as not needed'
                        : reminder.status === 'PENDING'
                          ? ' · due later'
                          : ''
                  }`}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {flaggedVitals.length ? (
          <div className="mt-5 rounded-card border border-[#f0d5aa] bg-[#fdf8ef] p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#6b3d05]">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Waiting for a nurse to review
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm text-[#6b3d05]">
              {flaggedVitals.map((vital) => (
                <li key={vital.id}>
                  {formatVital(vital.type, vital.valueNumber, vital.valueSecondary)} recorded at{' '}
                  {formatTime(vital.measuredAt)}
                  {vital.note ? ` — ${vital.note}` : ''}
                </li>
              ))}
            </ul>
            {/* This wording is deliberate: the platform never interprets a reading. */}
            <p className="mt-2 text-xs leading-relaxed text-[#6b3d05]">
              A reading outside the range set for your parent is queued for a nurse to look at. It
              does not mean anything is wrong — we do not draw conclusions from a reading, and
              neither should this screen.
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function StatusRow({
  done,
  label: text,
  tone,
}: {
  done: boolean;
  label: string;
  tone?: 'attention' | 'critical';
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
          done
            ? 'bg-success text-white'
            : tone === 'critical'
              ? 'bg-danger text-white'
              : tone === 'attention'
                ? 'bg-warning text-white'
                : 'border border-ink-300',
        )}
        aria-hidden="true"
      >
        {done ? (
          <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
        ) : tone ? (
          <TriangleAlert className="h-2.5 w-2.5" />
        ) : (
          <Circle className="h-1 w-1 fill-current text-transparent" />
        )}
      </span>
      <span
        className={cn(
          tone === 'critical' ? 'text-danger' : done ? 'text-ink-800' : 'text-ink-600',
        )}
      >
        {text}
      </span>
    </li>
  );
}
