import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat, StatusPill, Table, Td } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { todayRange } from '@/lib/queries/family';
import { formatDateTime, formatName, formatTime } from '@/lib/format';
import { visitStatus } from '@/lib/status';
import { VISIT_KIND_LABELS, label } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Visits',
  robots: { index: false, follow: false },
};

/** Today's operational picture, plus anything missed or without cover. */
export default async function AdminVisitsPage() {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);
  const { start, end } = todayRange();

  const [today, atRisk, missed, counts] = await Promise.all([
    prisma.visit.findMany({
      where: { scheduledStart: { gte: start, lt: end } },
      orderBy: { scheduledStart: 'asc' },
      include: {
        senior: { select: { id: true, firstName: true, lastName: true, area: true } },
        caregiver: { select: { user: { select: { name: true } } } },
        nurse: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.visit.findMany({
      where: { atRisk: true, status: 'SCHEDULED' },
      orderBy: { scheduledStart: 'asc' },
      include: {
        senior: { select: { id: true, firstName: true, lastName: true, area: true } },
      },
    }),
    prisma.visit.findMany({
      where: { status: 'MISSED', scheduledStart: { gte: new Date(Date.now() - 14 * 86400000) } },
      orderBy: { scheduledStart: 'desc' },
      include: {
        senior: { select: { id: true, firstName: true, lastName: true } },
        caregiver: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.visit.groupBy({
      by: ['status'],
      where: { scheduledStart: { gte: start, lt: end } },
      _count: { _all: true },
    }),
  ]);

  const count = (status: string) =>
    counts.find((row) => row.status === status)?._count._all ?? 0;

  return (
    <div>
      <PageHeader
        title="Visits"
        description="Today across every patient, plus anything that needs attention."
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Scheduled today" value={count('SCHEDULED')} />
        <Stat label="In progress" value={count('IN_PROGRESS')} tone="brand" />
        <Stat label="Completed today" value={count('COMPLETED')} tone="success" />
        <Stat
          label="Missed today"
          value={count('MISSED')}
          tone={count('MISSED') > 0 ? 'danger' : 'success'}
        />
      </div>

      {atRisk.length > 0 ? (
        <Card className="mb-6">
          <CardHeader
            title="Scheduled without confirmed cover"
            description="Assign a caregiver before these fall due."
            action={<Badge tone="danger">{atRisk.length}</Badge>}
          />
          <Table caption="Visits at risk" head={['When', 'Patient', 'Area', 'Action']}>
            {atRisk.map((visit) => (
              <tr key={visit.id}>
                <Td className="whitespace-nowrap">{formatDateTime(visit.scheduledStart)}</Td>
                <Td>
                  <Link
                    href={`/app/admin/patients/${visit.senior.id}`}
                    className="font-medium text-brand-800 hover:underline"
                  >
                    {formatName(visit.senior)}
                  </Link>
                </Td>
                <Td>{visit.senior.area}</Td>
                <Td>
                  <Link
                    href={`/app/admin/assignments?senior=${visit.senior.id}`}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    Find cover →
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardHeader title="Today" />
        {today.length ? (
          <Table caption="Today's visits" head={['Time', 'Patient', 'Type', 'Who', 'Status']}>
            {today.map((visit) => (
              <tr key={visit.id}>
                <Td className="whitespace-nowrap tabular-nums">
                  {formatTime(visit.scheduledStart)}
                </Td>
                <Td>
                  <Link
                    href={`/app/admin/patients/${visit.senior.id}`}
                    className="font-medium text-brand-800 hover:underline"
                  >
                    {formatName(visit.senior)}
                  </Link>
                  <span className="mt-0.5 block text-xs text-ink-500">{visit.senior.area}</span>
                </Td>
                <Td>{label(VISIT_KIND_LABELS, visit.kind)}</Td>
                <Td>
                  {visit.caregiver?.user.name ?? visit.nurse?.user.name ?? (
                    <span className="text-danger">Not assigned</span>
                  )}
                </Td>
                <Td>
                  <StatusPill {...visitStatus(visit.status)} />
                  {visit.checkInAt ? (
                    <span className="mt-0.5 block text-xs text-ink-500">
                      In {formatTime(visit.checkInAt)}
                      {visit.checkOutAt ? ` · out ${formatTime(visit.checkOutAt)}` : ''}
                    </span>
                  ) : null}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No visits scheduled today" />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Missed in the last fortnight"
          description="Every missed visit should have a follow-up recorded against it."
        />
        {missed.length ? (
          <Table caption="Missed visits" head={['When', 'Patient', 'Caregiver', 'Reason']}>
            {missed.map((visit) => (
              <tr key={visit.id}>
                <Td className="whitespace-nowrap">{formatDateTime(visit.scheduledStart)}</Td>
                <Td>
                  <Link
                    href={`/app/admin/patients/${visit.senior.id}`}
                    className="font-medium text-brand-800 hover:underline"
                  >
                    {formatName(visit.senior)}
                  </Link>
                </Td>
                <Td>{visit.caregiver?.user.name ?? '—'}</Td>
                <Td className="text-ink-600">{visit.cancelReason ?? 'No reason recorded'}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No missed visits" description="Nothing missed in the last fortnight." />
        )}
      </Card>
    </div>
  );
}
