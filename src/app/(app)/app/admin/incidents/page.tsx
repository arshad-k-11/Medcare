import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, EmptyState, PageHeader, StatusPill } from '@/components/ui';
import { IncidentActions } from '@/components/nurse/incident-actions';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatName, relativeTime } from '@/lib/format';
import { incidentStatus, severity as severityDisplay } from '@/lib/status';
import { INCIDENT_TYPE_LABELS, label, titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Incidents',
  robots: { index: false, follow: false },
};

export default async function AdminIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);
  const params = await searchParams;
  const showClosed = params.closed === 'true';

  const incidents = await prisma.incident.findMany({
    where: showClosed ? {} : { status: { not: 'CLOSED' } },
    orderBy: [{ status: 'asc' }, { severity: 'desc' }, { reportedAt: 'desc' }],
    take: 100,
    include: {
      senior: { select: { id: true, firstName: true, lastName: true, area: true } },
      reportedBy: { select: { name: true, role: true } },
      escalations: { select: { id: true, level: true, closedAt: true } },
    },
  });

  const unconfirmed = incidents.filter(
    (incident) => !incident.severityConfirmedBy && incident.status === 'OPEN',
  );

  return (
    <div>
      <PageHeader
        title="Incidents"
        description={`${incidents.length} shown`}
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
        action={
          <Link
            href={showClosed ? '/app/admin/incidents' : '/app/admin/incidents?closed=true'}
            className="rounded-[10px] border border-ink-300 px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
          >
            {showClosed ? 'Hide closed' : 'Show closed'}
          </Link>
        }
      />

      {unconfirmed.length > 0 ? (
        <Card className="mb-6 border-[#f0d5aa] bg-[#fdf8ef]">
          <div className="px-5 py-4 text-sm text-[#6b3d05]">
            <p className="font-semibold">
              {unconfirmed.length} incident{unconfirmed.length === 1 ? '' : 's'} still carry a
              severity reported by the person who raised it
            </p>
            <p className="mt-1">
              A caregiver&rsquo;s severity is a report, not a clinical determination. A nurse or
              operations manager needs to confirm it before it counts as one.
            </p>
          </div>
        </Card>
      ) : null}

      <Card>
        {incidents.length ? (
          <ul className="divide-y divide-[color:var(--border)]">
            {incidents.map((incident) => (
              <li key={incident.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill {...severityDisplay(incident.severity)} />
                  <StatusPill {...incidentStatus(incident.status)} />
                  <Badge tone="neutral">{label(INCIDENT_TYPE_LABELS, incident.type)}</Badge>
                  {!incident.severityConfirmedBy ? (
                    <Badge tone="warning">Severity not confirmed</Badge>
                  ) : null}
                  {!incident.familyNotifiedAt ? <Badge tone="neutral">Family not told</Badge> : null}
                  {incident.escalations.some((escalation) => !escalation.closedAt) ? (
                    <Badge tone="danger">Escalation open</Badge>
                  ) : null}
                </div>

                <p className="mt-2 font-semibold text-ink-900">{incident.title}</p>
                <p className="mt-1 max-w-3xl text-[0.9375rem] leading-relaxed text-ink-700">
                  {incident.description}
                </p>
                <p className="mt-1.5 text-sm text-ink-500">
                  {incident.reference} ·{' '}
                  <Link
                    href={`/app/admin/patients/${incident.senior.id}`}
                    className="font-medium text-brand-800 hover:underline"
                  >
                    {formatName(incident.senior)}
                  </Link>{' '}
                  ({incident.senior.area}) · {incident.reportedBy.name} (
                  {titleise(incident.reportedBy.role)}) · {relativeTime(incident.reportedAt)}
                </p>

                {incident.resolution ? (
                  <p className="mt-2 rounded-card bg-[#f1faf5] px-3 py-2 text-sm text-[#0d6340]">
                    <span className="font-semibold">Resolved: </span>
                    {incident.resolution}
                  </p>
                ) : null}

                {incident.status !== 'CLOSED' ? (
                  <IncidentActions
                    incidentId={incident.id}
                    severity={incident.severity}
                    status={incident.status}
                    familyNotified={Boolean(incident.familyNotifiedAt)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={showClosed ? 'No incidents on record' : 'No open incidents'}
            description="Everything reported has been closed."
          />
        )}
      </Card>
    </div>
  );
}
