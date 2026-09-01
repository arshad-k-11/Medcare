import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, StatusPill } from '@/components/ui';
import { IncidentActions } from '@/components/nurse/incident-actions';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { seniorIdWhere } from '@/lib/scope';
import { formatDateTime, formatName, relativeTime } from '@/lib/format';
import { incidentStatus, severity as severityDisplay } from '@/lib/status';
import { ESCALATION_LEVEL_LABELS, INCIDENT_TYPE_LABELS, label, titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Escalations and incidents',
  robots: { index: false, follow: false },
};

export default async function NurseEscalationsPage() {
  const user = await requirePageUser(['NURSE', 'ADMIN', 'OPS_MANAGER']);
  const where = await seniorIdWhere(user);

  const [openEscalations, incidents] = await Promise.all([
    prisma.escalation.findMany({
      where: { ...where, closedAt: null },
      orderBy: { raisedAt: 'asc' },
      include: {
        senior: { select: { id: true, firstName: true, lastName: true, area: true } },
        raisedBy: { select: { name: true, role: true } },
        incident: { select: { reference: true, title: true } },
      },
    }),
    prisma.incident.findMany({
      where: { ...where, status: { not: 'CLOSED' } },
      orderBy: [{ severity: 'desc' }, { reportedAt: 'asc' }],
      include: {
        senior: { select: { id: true, firstName: true, lastName: true, area: true } },
        reportedBy: { select: { name: true, role: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Escalations and incidents"
        description="Oldest first. An unclosed escalation is somebody still waiting."
        breadcrumb={[{ href: '/app/nurse', label: 'Overview' }]}
      />

      <Alert tone="warning" title="Emergency services are never contacted by this system" className="mb-6">
        <p>
          Nothing here dispatches emergency services, and no automated alert is a medical
          determination. If a situation is urgent, the person present calls emergency services and
          records it afterwards.
        </p>
      </Alert>

      <Card className="mb-6">
        <CardHeader
          title="Open escalations"
          action={<Badge tone={openEscalations.length ? 'danger' : 'success'}>{openEscalations.length}</Badge>}
        />
        {openEscalations.length ? (
          <ul className="divide-y divide-[color:var(--border)]">
            {openEscalations.map((escalation) => (
              <li key={escalation.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="warning">{titleise(escalation.trigger)}</Badge>
                      <Badge tone="neutral">
                        {label(ESCALATION_LEVEL_LABELS, escalation.level)}
                      </Badge>
                      {escalation.acknowledgedAt ? (
                        <Badge tone="info">Acknowledged</Badge>
                      ) : (
                        <Badge tone="danger">Not acknowledged</Badge>
                      )}
                    </div>
                    <p className="mt-2 text-[0.9375rem] text-ink-800">{escalation.reason}</p>
                    <p className="mt-1 text-sm text-ink-500">
                      <Link
                        href={`/app/nurse/patients/${escalation.senior.id}`}
                        className="font-medium text-brand-800 hover:underline"
                      >
                        {formatName(escalation.senior)}
                      </Link>{' '}
                      · raised by {escalation.raisedBy.name} · {formatDateTime(escalation.raisedAt)} (
                      {relativeTime(escalation.raisedAt)})
                    </p>
                    {escalation.incident ? (
                      <p className="mt-1 text-sm text-ink-500">
                        Incident {escalation.incident.reference}: {escalation.incident.title}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No open escalations"
            description="Everything raised in your caseload has been closed."
          />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Incidents"
          description="Confirm the severity, record what was done, and close when resolved."
        />
        {incidents.length ? (
          <ul className="divide-y divide-[color:var(--border)]">
            {incidents.map((incident) => (
              <li key={incident.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill {...severityDisplay(incident.severity)} />
                  <StatusPill {...incidentStatus(incident.status)} />
                  <Badge tone="neutral">{label(INCIDENT_TYPE_LABELS, incident.type)}</Badge>
                  {!incident.severityConfirmedBy ? (
                    <Badge tone="warning">Severity reported, not confirmed</Badge>
                  ) : null}
                  {!incident.familyNotifiedAt ? (
                    <Badge tone="neutral">Family not told</Badge>
                  ) : null}
                </div>

                <p className="mt-2 font-semibold text-ink-900">{incident.title}</p>
                <p className="mt-1 max-w-3xl text-[0.9375rem] leading-relaxed text-ink-700">
                  {incident.description}
                </p>
                <p className="mt-1.5 text-sm text-ink-500">
                  {incident.reference} ·{' '}
                  <Link
                    href={`/app/nurse/patients/${incident.senior.id}`}
                    className="font-medium text-brand-800 hover:underline"
                  >
                    {formatName(incident.senior)}
                  </Link>{' '}
                  · reported by {incident.reportedBy.name} ({titleise(incident.reportedBy.role)}) ·{' '}
                  {formatDateTime(incident.reportedAt)}
                </p>

                {incident.actionsTaken ? (
                  <p className="mt-2 rounded-card bg-sand-50 px-3 py-2 text-sm text-ink-700">
                    <span className="font-semibold">Actions: </span>
                    {incident.actionsTaken}
                  </p>
                ) : null}

                <IncidentActions
                  incidentId={incident.id}
                  severity={incident.severity}
                  status={incident.status}
                  familyNotified={Boolean(incident.familyNotifiedAt)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No open incidents"
            description="Nothing in your caseload is currently open."
          />
        )}
      </Card>
    </div>
  );
}
