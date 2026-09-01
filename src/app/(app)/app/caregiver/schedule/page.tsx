import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, EmptyState, PageHeader, StatusPill } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDayLabel, formatName, formatTime } from '@/lib/format';
import { visitStatus } from '@/lib/status';
import { VISIT_KIND_LABELS, label } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'My schedule',
  robots: { index: false, follow: false },
};

/** Two weeks of visits, grouped by day. Enough to plan around, not so much it overwhelms. */
export default async function CaregiverSchedulePage() {
  const user = await requirePageUser(['CAREGIVER']);

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 14 * 86_400_000);

  const visits = await prisma.visit.findMany({
    where: {
      caregiverId: user.caregiverProfileId ?? '',
      scheduledStart: { gte: from, lt: to },
    },
    orderBy: { scheduledStart: 'asc' },
    include: {
      senior: { select: { id: true, firstName: true, lastName: true, area: true } },
      tasks: { select: { id: true, status: true } },
    },
  });

  const byDay = new Map<string, typeof visits>();
  for (const visit of visits) {
    const key = visit.scheduledStart.toISOString().slice(0, 10);
    const list = byDay.get(key);
    if (list) list.push(visit);
    else byDay.set(key, [visit]);
  }

  const totalHours = visits.reduce(
    (sum, visit) =>
      sum + (visit.scheduledEnd.getTime() - visit.scheduledStart.getTime()) / 3_600_000,
    0,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="My schedule"
        description={`${visits.length} visits over the next two weeks · about ${Math.round(totalHours)} hours`}
        breadcrumb={[{ href: '/app/caregiver', label: 'Today' }]}
      />

      {byDay.size === 0 ? (
        <Card>
          <EmptyState
            title="Nothing scheduled in the next two weeks"
            description="Operations will contact you when new visits are assigned. If you expected something here, please call them."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {[...byDay.entries()].map(([day, dayVisits]) => (
            <Card key={day}>
              <CardHeader
                title={formatDayLabel(new Date(`${day}T12:00:00Z`))}
                description={`${dayVisits.length} visit${dayVisits.length === 1 ? '' : 's'}`}
              />
              <ul className="divide-y divide-[color:var(--border)]">
                {dayVisits.map((visit) => (
                  <li key={visit.id}>
                    <Link
                      href={`/app/caregiver/visits/${visit.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-ink-50"
                    >
                      <div className="w-24 shrink-0">
                        <p className="text-sm font-semibold tabular-nums text-ink-900">
                          {formatTime(visit.scheduledStart)}
                        </p>
                        <p className="text-xs text-ink-500">
                          to {formatTime(visit.scheduledEnd)}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink-900">{formatName(visit.senior)}</p>
                        <p className="truncate text-sm text-ink-600">
                          {visit.senior.area} · {label(VISIT_KIND_LABELS, visit.kind)}
                        </p>
                      </div>
                      <StatusPill {...visitStatus(visit.status)} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-ink-500">
        Need time off?{' '}
        <Link href="/app/caregiver/leave" className="font-semibold text-brand-700 hover:underline">
          Request leave
        </Link>{' '}
        — cover is arranged by operations, not by you.
      </p>
    </div>
  );
}
