import {
  Activity,
  CalendarDays,
  ClipboardList,
  FileText,
  LogIn,
  LogOut,
  Pill,
  TriangleAlert,
  UserCheck,
} from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { formatDayLabel, formatTime } from '@/lib/format';
import { groupByDay, type TimelineEntry, type TimelineKind } from '@/lib/services/timeline';
import { cn } from '@/lib/utils';

const ICONS: Record<TimelineKind, typeof Activity> = {
  VISIT_START: LogIn,
  VISIT_END: LogOut,
  VISIT_MISSED: TriangleAlert,
  TASK: ClipboardList,
  NOTE: FileText,
  VITAL: Activity,
  MEDICATION: Pill,
  APPOINTMENT: CalendarDays,
  INCIDENT: TriangleAlert,
  CARE_PLAN: FileText,
  ASSIGNMENT: UserCheck,
};

const TONES = {
  neutral: 'bg-ink-100 text-ink-600',
  positive: 'bg-[#e8f5ee] text-[#0d6340]',
  attention: 'bg-[#fdf3e4] text-[#8a4c05]',
  critical: 'bg-[#fdecea] text-[#95190f]',
} as const;

/**
 * The care timeline.
 *
 * This is the product for a family who cannot be present: the answer to "what happened
 * today", grouped by day, most recent first. Entries carry a tone rather than a raw status
 * colour, and attention/critical entries are also marked by icon and wording — never by
 * colour alone.
 */
export function TimelineFeed({
  entries,
  emptyTitle = 'Nothing recorded yet',
  emptyDescription = 'Once care starts, every visit, task, reminder and reading will appear here the same day.',
  limit,
}: {
  entries: TimelineEntry[];
  emptyTitle?: string;
  emptyDescription?: string;
  limit?: number;
}) {
  const shown = limit ? entries.slice(0, limit) : entries;
  const days = groupByDay(shown);

  if (!shown.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-7">
      {days.map((day) => (
        <section key={day.day}>
          <h3 className="sticky top-[4.5rem] z-10 -mx-1 bg-[color:var(--page-bg)]/95 px-1 py-1 text-xs font-semibold uppercase tracking-wide text-ink-500 backdrop-blur lg:top-2">
            {formatDayLabel(new Date(`${day.day}T12:00:00Z`))}
          </h3>
          <ol className="mt-3 space-y-3">
            {day.entries.map((entry) => {
              const Icon = ICONS[entry.kind] ?? Activity;
              return (
                <li key={entry.id} className="flex gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      TONES[entry.tone],
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xs tabular-nums text-ink-500">
                        {formatTime(entry.at)}
                      </span>
                      <span
                        className={cn(
                          'text-[0.9375rem] font-medium',
                          entry.tone === 'critical' ? 'text-danger' : 'text-ink-900',
                        )}
                      >
                        {entry.title}
                      </span>
                    </div>
                    {entry.detail ? (
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{entry.detail}</p>
                    ) : null}
                    {entry.actor ? (
                      <p className="mt-0.5 text-xs text-ink-500">Recorded by {entry.actor}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
