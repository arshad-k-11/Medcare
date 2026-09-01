import type { Metadata } from 'next';
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
  StatusPill,
} from '@/components/ui';
import { LineTrend } from '@/components/charts';
import { TimelineFeed } from '@/components/family/timeline-feed';
import { SeniorSwitcher } from '@/components/family/senior-switcher';
import { requirePageUser } from '@/lib/auth-guard';
import { familyTimeline, resolveSelectedSenior, vitalsSeries } from '@/lib/queries/family';
import { prisma } from '@/lib/db';
import { formatName, formatVital, formatDate } from '@/lib/format';
import { VITAL_META, type VitalType } from '@/lib/constants';
import { vitalFlag } from '@/lib/status';
import { trend } from '@/lib/services/vitals';
import { audit } from '@/lib/audit';

export const metadata: Metadata = {
  title: 'Care updates',
  robots: { index: false, follow: false },
};

/**
 * The full care record for a family: timeline, readings with the configured review band
 * shaded on the chart, and a weekly summary.
 *
 * The charts show the review band rather than a red "abnormal" zone, and each series is
 * captioned with a plain observation of direction — the platform reports, a nurse interprets.
 */
export default async function FamilyUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser(['FAMILY']);
  const params = await searchParams;
  const requested = typeof params.senior === 'string' ? params.senior : undefined;
  const { seniors, selectedId } = await resolveSelectedSenior(user, requested);

  if (!selectedId) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Care updates" />
        <Card>
          <EmptyState
            title="Nobody linked yet"
            description="Add the person you are arranging care for, and their care record will appear here."
          />
        </Card>
      </div>
    );
  }

  const senior = seniors.find((row) => row.id === selectedId)!;
  const [timeline, vitals, weekStats] = await Promise.all([
    familyTimeline(senior.id, 60),
    vitalsSeries(senior.id, 60),
    weeklySummary(senior.id),
  ]);

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'patient.care-record.read',
    entity: 'Senior',
    entityId: senior.id,
    seniorId: senior.id,
  });

  const vitalTypes = [...vitals.byType.keys()];

  return (
    <div>
      <PageHeader
        title="Care updates"
        description={`Everything recorded for ${formatName(senior)} over the last two months.`}
        action={
          <SeniorSwitcher
            seniors={seniors.map((row) => ({
              id: row.id,
              firstName: row.firstName,
              lastName: row.lastName,
            }))}
            selectedId={senior.id}
          />
        }
      />

      {/* Weekly summary — the numbers behind "how has it been going". */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Visits completed this week"
          value={weekStats.completed}
          hint={`${weekStats.scheduled} scheduled in total`}
        />
        <Stat
          label="Visits missed"
          value={weekStats.missed}
          tone={weekStats.missed > 0 ? 'danger' : 'success'}
          hint={weekStats.missed > 0 ? 'Each one is followed up by operations' : 'None this week'}
        />
        <Stat
          label="Medication reminders confirmed"
          value={`${weekStats.remindersConfirmed}/${weekStats.remindersTotal}`}
          tone={
            weekStats.remindersTotal && weekStats.remindersConfirmed < weekStats.remindersTotal
              ? 'warning'
              : 'success'
          }
        />
        <Stat
          label="Readings awaiting nurse review"
          value={weekStats.flaggedVitals}
          tone={weekStats.flaggedVitals > 0 ? 'warning' : 'neutral'}
          hint="Flagged, not interpreted"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader
            title="Care timeline"
            description="Most recent first. Notes are written by the caregiver or the nurse who was there."
          />
          <div className="px-5 py-4">
            <TimelineFeed entries={timeline} />
          </div>
        </Card>

        <div className="space-y-6">
          {vitalTypes.length === 0 ? (
            <Card>
              <CardHeader title="Readings" />
              <EmptyState
                title="No readings recorded yet"
                description="Where the care plan includes vitals tracking, readings appear here with the range set for your parent."
              />
            </Card>
          ) : (
            vitalTypes.map((type) => {
              const readings = vitals.byType.get(type) ?? [];
              const meta = VITAL_META[type as VitalType];
              const threshold =
                vitals.thresholds.find((row) => row.type === type && row.seniorId === senior.id) ??
                vitals.thresholds.find((row) => row.type === type && row.seniorId === null);

              const data = readings.map((reading) => ({
                label: formatDate(reading.measuredAt).replace(/ \d{4}$/, ''),
                value: reading.valueNumber,
                ...(reading.valueSecondary != null ? { secondary: reading.valueSecondary } : {}),
              }));

              const direction = trend(
                readings.map((reading) => ({
                  at: reading.measuredAt.toISOString(),
                  value: reading.valueNumber,
                })),
              );
              const latest = readings[readings.length - 1];

              return (
                <Card key={type}>
                  <CardHeader
                    title={meta?.label ?? type}
                    description={
                      threshold
                        ? `Review range: ${threshold.lowValue ?? '—'} to ${threshold.highValue ?? '—'} ${meta?.unit ?? ''}`
                        : 'No review range configured'
                    }
                    action={
                      latest ? <StatusPill {...vitalFlag(latest.flag)} /> : undefined
                    }
                  />
                  <div className="px-5 py-4">
                    <p className="text-2xl font-semibold tabular-nums text-ink-900">
                      {latest
                        ? formatVital(type, latest.valueNumber, latest.valueSecondary)
                        : '—'}
                    </p>
                    <p className="text-xs text-ink-500">
                      Last recorded {latest ? formatDate(latest.measuredAt) : '—'}
                    </p>

                    <div className="mt-4">
                      <LineTrend
                        data={data}
                        series={
                          type === 'BLOOD_PRESSURE'
                            ? [
                                { key: 'value', label: 'Systolic' },
                                { key: 'secondary', label: 'Diastolic', colour: '#175cd3' },
                              ]
                            : [{ key: 'value', label: meta?.label ?? type }]
                        }
                        unit={meta?.unit}
                        height={180}
                        reviewBand={{ low: threshold?.lowValue, high: threshold?.highValue }}
                      />
                    </div>

                    {/* A plain observation, never an interpretation. */}
                    <p className="mt-3 text-sm text-ink-600">
                      {direction === 'INSUFFICIENT'
                        ? 'Not enough readings yet to describe a direction.'
                        : direction === 'UP'
                          ? 'Recent readings are higher than earlier in this period. Your nurse reviews this at the next visit.'
                          : direction === 'DOWN'
                            ? 'Recent readings are lower than earlier in this period. Your nurse reviews this at the next visit.'
                            : 'Readings have been broadly steady across this period.'}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-ink-500">
                      The shaded band is the range set for your parent. A reading outside it is
                      flagged for a nurse to review — it is not a diagnosis, and this page does not
                      tell you what a reading means.
                    </p>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

async function weeklySummary(seniorId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [visitGroups, reminderGroups, flaggedVitals] = await Promise.all([
    prisma.visit.groupBy({
      by: ['status'],
      where: { seniorId, scheduledStart: { gte: since } },
      _count: { _all: true },
    }),
    prisma.medicationReminder.groupBy({
      by: ['status'],
      where: { seniorId, dueAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.vital.count({
      where: { seniorId, flag: 'REQUIRES_REVIEW', reviewedAt: null },
    }),
  ]);

  const visitCount = (status: string) =>
    visitGroups.find((row) => row.status === status)?._count._all ?? 0;
  const reminderCount = (status: string) =>
    reminderGroups.find((row) => row.status === status)?._count._all ?? 0;

  return {
    completed: visitCount('COMPLETED'),
    missed: visitCount('MISSED'),
    scheduled: visitGroups.reduce((sum, row) => sum + row._count._all, 0),
    remindersConfirmed: reminderCount('CONFIRMED'),
    remindersTotal: reminderGroups.reduce((sum, row) => sum + row._count._all, 0),
    flaggedVitals,
  };
}
