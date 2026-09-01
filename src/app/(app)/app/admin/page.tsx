import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Clock, TriangleAlert } from 'lucide-react';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
  StatusPill,
  Table,
  Td,
} from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { adminKpis, periodFromDays } from '@/lib/queries/analytics';
import { formatCompactMoney, formatDateTime, formatName, relativeTime } from '@/lib/format';
import { leadStatus, urgency as urgencyDisplay, severity as severityDisplay } from '@/lib/status';
import { firstContactSlaHours } from '@/lib/services/recommendation';
import type { Urgency } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Operations dashboard',
  robots: { index: false, follow: false },
};

/**
 * The operations dashboard.
 *
 * Ordered by what will hurt the business today if ignored: leads past their contact SLA,
 * patients without a caregiver, open incidents. The revenue numbers are further down, not
 * because they matter less, but because nobody fixes revenue this morning.
 */
export default async function AdminDashboardPage() {
  const user = await requirePageUser(['ADMIN', 'OPS_MANAGER']);
  const period = periodFromDays(30);

  const [kpis, urgentLeads, unassigned, openIncidents, dueTasks, atRiskVisits] = await Promise.all([
    adminKpis(period),
    prisma.lead.findMany({
      where: { status: { in: ['NEW', 'CONTACTED'] } },
      orderBy: [{ urgency: 'asc' }, { createdAt: 'asc' }],
      take: 8,
      include: {
        owner: { select: { name: true } },
        recommendedPackage: { select: { name: true } },
      },
    }),
    prisma.senior.findMany({
      where: {
        status: 'ACTIVE',
        assignments: { none: { status: { in: ['ACTIVE', 'PROPOSED'] } } },
      },
      take: 6,
      select: { id: true, firstName: true, lastName: true, area: true },
    }),
    prisma.incident.findMany({
      where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      orderBy: [{ severity: 'desc' }, { reportedAt: 'asc' }],
      take: 6,
      include: { senior: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.crmTask.findMany({
      where: { status: 'OPEN', dueAt: { lte: new Date(Date.now() + 86_400_000) } },
      orderBy: { dueAt: 'asc' },
      take: 8,
      include: {
        assignee: { select: { name: true } },
        lead: { select: { id: true, reference: true, contactName: true } },
      },
    }),
    prisma.visit.count({ where: { atRisk: true, status: 'SCHEDULED' } }),
  ]);

  // A lead is late when the SLA for its urgency has already passed.
  const now = Date.now();
  const lateLeads = urgentLeads.filter((lead) => {
    const slaMs = firstContactSlaHours(lead.urgency as Urgency) * 3_600_000;
    return lead.status === 'NEW' && now - lead.createdAt.getTime() > slaMs;
  });

  return (
    <div>
      <PageHeader
        title="Operations"
        description={`${period.label} · signed in as ${user.name}`}
        action={
          <div className="flex gap-2">
            <ButtonLink href="/app/admin/leads" variant="outline" size="sm">
              Lead pipeline
            </ButtonLink>
            <ButtonLink href="/app/admin/analytics" size="sm">
              Analytics
            </ButtonLink>
          </div>
        }
      />

      {/* What is on fire, if anything. */}
      {lateLeads.length > 0 || kpis.unassignedActive > 0 || atRiskVisits > 0 ? (
        <div className="mb-6 space-y-3">
          {lateLeads.length > 0 ? (
            <Alert
              tone="danger"
              title={`${lateLeads.length} enquir${lateLeads.length === 1 ? 'y is' : 'ies are'} past the first-contact target`}
              icon={<Clock className="h-4 w-4" />}
            >
              <p>
                These families are still waiting for a first call.{' '}
                <Link href="/app/admin/leads?status=NEW" className="font-semibold underline">
                  Open them now
                </Link>
                .
              </p>
            </Alert>
          ) : null}
          {kpis.unassignedActive > 0 ? (
            <Alert
              tone="warning"
              title={`${kpis.unassignedActive} active patient${kpis.unassignedActive === 1 ? '' : 's'} with no caregiver`}
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              <p>
                A patient in active care without an assignment has nobody scheduled to visit them.
              </p>
            </Alert>
          ) : null}
          {atRiskVisits > 0 ? (
            <Alert
              tone="warning"
              title={`${atRiskVisits} scheduled visit${atRiskVisits === 1 ? '' : 's'} without confirmed cover`}
              icon={<TriangleAlert className="h-4 w-4" />}
            >
              <p>
                <Link href="/app/admin/assignments" className="font-semibold underline">
                  Run the replacement match
                </Link>{' '}
                and assign cover before these are due.
              </p>
            </Alert>
          ) : null}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active patients" value={kpis.activePatients} href="/app/admin/patients" />
        <Stat
          label="New enquiries"
          value={kpis.newLeads}
          hint={period.label.toLowerCase()}
          href="/app/admin/leads"
        />
        <Stat
          label="Conversion rate"
          value={kpis.conversionRate != null ? `${kpis.conversionRate}%` : '—'}
          hint={kpis.conversionRate == null ? 'Too few closed enquiries to say' : `${kpis.wonLeads} won`}
          tone="brand"
        />
        <Stat
          label="Open incidents"
          value={kpis.openIncidents}
          tone={kpis.openIncidents > 0 ? 'danger' : 'success'}
          href="/app/admin/incidents"
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Caregivers available"
          value={kpis.availableCaregivers}
          hint={`${kpis.activeCaregivers} active · ${kpis.caregiversOnLeave} on leave`}
          href="/app/admin/caregivers"
        />
        <Stat
          label="Visits completed"
          value={kpis.completedVisits}
          hint={
            kpis.visitCompletionRate != null
              ? `${kpis.visitCompletionRate}% of finished visits`
              : 'Too few visits to rate'
          }
          tone="success"
        />
        <Stat
          label="Missed visits"
          value={kpis.missedVisits}
          tone={kpis.missedVisits > 0 ? 'danger' : 'success'}
          hint={period.label.toLowerCase()}
        />
        <Stat
          label="Customer rating"
          value={kpis.averageRating ? kpis.averageRating.toFixed(1) : '—'}
          hint={kpis.ratingCount ? `${kpis.ratingCount} responses` : 'No responses yet'}
          href="/app/admin/feedback"
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Collected"
          value={formatCompactMoney(kpis.revenuePaise)}
          hint={period.label.toLowerCase()}
          tone="success"
          href="/app/admin/billing"
        />
        <Stat
          label="Outstanding"
          value={formatCompactMoney(kpis.outstandingPaise)}
          hint={`${kpis.outstandingCount} unpaid invoice${kpis.outstandingCount === 1 ? '' : 's'}`}
          tone={kpis.outstandingPaise > 0 ? 'warning' : 'neutral'}
          href="/app/admin/billing"
        />
        <Stat
          label="Partner-sourced enquiries"
          value={kpis.referralLeads}
          hint={period.label.toLowerCase()}
          href="/app/admin/referrals"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Enquiries needing a call"
            action={
              <ButtonLink href="/app/admin/leads" variant="ghost" size="sm">
                All leads
              </ButtonLink>
            }
          />
          {urgentLeads.length ? (
            <Table caption="Enquiries needing a call" head={['Contact', 'Urgency', 'Waiting', 'Owner']}>
              {urgentLeads.map((lead) => {
                const slaMs = firstContactSlaHours(lead.urgency as Urgency) * 3_600_000;
                const late = lead.status === 'NEW' && now - lead.createdAt.getTime() > slaMs;
                return (
                  <tr key={lead.id}>
                    <Td>
                      <Link
                        href={`/app/admin/leads/${lead.id}`}
                        className="font-medium text-brand-800 hover:underline"
                      >
                        {lead.contactName}
                      </Link>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {lead.area ?? '—'} · {lead.reference}
                      </span>
                    </Td>
                    <Td>
                      <StatusPill {...urgencyDisplay(lead.urgency)} />
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span className={late ? 'font-semibold text-danger' : 'text-ink-700'}>
                        {relativeTime(lead.createdAt)}
                      </span>
                      {late ? (
                        <span className="mt-0.5 block">
                          <Badge tone="danger">Past target</Badge>
                        </span>
                      ) : null}
                    </Td>
                    <Td>{lead.owner?.name ?? <span className="text-ink-500">Unassigned</span>}</Td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <EmptyState
              title="Every enquiry has been contacted"
              description="Nothing is sitting in the new or contacted state waiting for a call."
            />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Follow-ups due"
            description="Today and tomorrow."
            action={
              <ButtonLink href="/app/admin/leads" variant="ghost" size="sm">
                CRM
              </ButtonLink>
            }
          />
          {dueTasks.length ? (
            <ul className="divide-y divide-[color:var(--border)]">
              {dueTasks.map((task) => {
                const overdue = task.dueAt < new Date();
                return (
                  <li key={task.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">{task.title}</p>
                        <p className="text-sm text-ink-500">
                          {task.assignee.name} ·{' '}
                          <span className={overdue ? 'font-semibold text-danger' : ''}>
                            {formatDateTime(task.dueAt)}
                          </span>
                        </p>
                        {task.lead ? (
                          <Link
                            href={`/app/admin/leads/${task.lead.id}`}
                            className="text-sm text-brand-800 hover:underline"
                          >
                            {task.lead.contactName} ({task.lead.reference})
                          </Link>
                        ) : null}
                      </div>
                      {task.priority === 'HIGH' ? <Badge tone="danger">High</Badge> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="No follow-ups due" description="Nothing is scheduled for today or tomorrow." />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Patients without a caregiver"
            action={
              <ButtonLink href="/app/admin/assignments" variant="ghost" size="sm">
                Assign
              </ButtonLink>
            }
          />
          {unassigned.length ? (
            <ul className="divide-y divide-[color:var(--border)]">
              {unassigned.map((senior) => (
                <li key={senior.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <Link
                      href={`/app/admin/patients/${senior.id}`}
                      className="font-medium text-brand-800 hover:underline"
                    >
                      {formatName(senior)}
                    </Link>
                    <p className="text-sm text-ink-500">{senior.area}</p>
                  </div>
                  <ButtonLink
                    href={`/app/admin/assignments?senior=${senior.id}`}
                    variant="outline"
                    size="sm"
                  >
                    Find a caregiver
                  </ButtonLink>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Every active patient has a caregiver"
              description="Nothing to assign right now."
            />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Open incidents"
            action={
              <ButtonLink href="/app/admin/incidents" variant="ghost" size="sm">
                All incidents
              </ButtonLink>
            }
          />
          {openIncidents.length ? (
            <ul className="divide-y divide-[color:var(--border)]">
              {openIncidents.map((incident) => (
                <li key={incident.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill {...severityDisplay(incident.severity)} />
                    <span className="text-xs text-ink-500">{incident.reference}</span>
                  </div>
                  <p className="mt-1 font-medium text-ink-900">{incident.title}</p>
                  <p className="text-sm text-ink-500">
                    {formatName(incident.senior)} · {relativeTime(incident.reportedAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No open incidents" description="Everything reported has been closed." />
          )}
        </Card>
      </div>
    </div>
  );
}
