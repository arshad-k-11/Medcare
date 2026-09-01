import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  DescriptionList,
  EmptyState,
  PageHeader,
  StatusPill,
  Table,
  Td,
} from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { formatDate, formatDateTime, formatMoney, formatName, formatPhone } from '@/lib/format';
import { readList } from '@/lib/json-list';
import {
  assessmentStatus,
  assignmentStatus,
  carePlanStatus,
  incidentStatus,
  invoiceStatus,
  seniorStatus,
  visitStatus,
} from '@/lib/status';
import {
  LIVING_ARRANGEMENT_LABELS,
  MOBILITY_LABELS,
  SHIFT_PATTERN_LABELS,
  label,
  titleise,
} from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Patient',
  robots: { index: false, follow: false },
};

/** The operational view of a patient: who, what plan, who is assigned, what is owed. */
export default async function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser(['ADMIN', 'OPS_MANAGER']);
  const { id } = await params;

  const senior = await prisma.senior.findUnique({
    where: { id },
    include: {
      serviceArea: { select: { name: true, isActive: true } },
      supervisingNurse: { select: { user: { select: { name: true } } } },
      familyLinks: {
        include: { familyProfile: { include: { user: { select: { name: true, email: true, phone: true } } } } },
      },
      assignments: {
        orderBy: { startDate: 'desc' },
        include: { caregiver: { select: { id: true, user: { select: { name: true } } } } },
      },
      carePlans: { orderBy: { version: 'desc' }, include: { package: { select: { name: true } } } },
      assessments: {
        orderBy: { createdAt: 'desc' },
        include: { nurse: { select: { user: { select: { name: true } } } } },
      },
      visits: {
        orderBy: { scheduledStart: 'desc' },
        take: 12,
        include: { caregiver: { select: { user: { select: { name: true } } } } },
      },
      incidents: { orderBy: { reportedAt: 'desc' }, take: 6 },
      invoices: { orderBy: { createdAt: 'desc' } },
      leads: { select: { id: true, reference: true, status: true } },
    },
  });

  if (!senior) notFound();

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'patient.read',
    entity: 'Senior',
    entityId: id,
    seniorId: id,
  });

  const activePlan = senior.carePlans.find((plan) => plan.status === 'ACTIVE');
  const outstanding = senior.invoices
    .filter((invoice) => ['SENT', 'PARTIAL', 'OVERDUE'].includes(invoice.status))
    .reduce((sum, invoice) => sum + (invoice.totalPaise - invoice.amountPaidPaise), 0);

  return (
    <div>
      <PageHeader
        title={`${formatName(senior)}, ${senior.ageYears ?? '—'}`}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{senior.serviceArea?.name ?? senior.area}</span>
            <StatusPill {...seniorStatus(senior.status)} />
            {senior.serviceArea && !senior.serviceArea.isActive ? (
              <Badge tone="danger">Area not currently served</Badge>
            ) : null}
          </span>
        }
        breadcrumb={[
          { href: '/app/admin', label: 'Operations' },
          { href: '/app/admin/patients', label: 'Patients' },
        ]}
        action={
          <ButtonLink href={`/app/admin/assignments?senior=${senior.id}`} size="sm">
            Manage caregiver
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Care plans"
              action={activePlan ? <StatusPill {...carePlanStatus(activePlan.status)} /> : undefined}
            />
            {senior.carePlans.length ? (
              <Table caption="Care plans" head={['Version', 'Title', 'Package', 'Review', 'Status']}>
                {senior.carePlans.map((plan) => (
                  <tr key={plan.id}>
                    <Td>v{plan.version}</Td>
                    <Td className="font-medium text-ink-900">{plan.title}</Td>
                    <Td>{plan.package?.name ?? 'Custom'}</Td>
                    <Td className="whitespace-nowrap">
                      {plan.reviewDate ? formatDate(plan.reviewDate) : '—'}
                    </Td>
                    <Td>
                      <StatusPill {...carePlanStatus(plan.status)} />
                    </Td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState
                title="No care plan yet"
                description="A plan is written after the assessment. Without one there is no agreed task list for caregivers."
              />
            )}
          </Card>

          <Card>
            <CardHeader title="Caregiver assignments" />
            {senior.assignments.length ? (
              <Table caption="Assignments" head={['Caregiver', 'Role', 'Shift', 'Period', 'Status']}>
                {senior.assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <Td>
                      <Link
                        href={`/app/admin/caregivers/${assignment.caregiver.id}`}
                        className="font-medium text-brand-800 hover:underline"
                      >
                        {assignment.caregiver.user.name}
                      </Link>
                      {assignment.matchScore ? (
                        <span className="mt-0.5 block text-xs text-ink-500">
                          Matched {assignment.matchScore}/100
                        </span>
                      ) : null}
                    </Td>
                    <Td>{titleise(assignment.role)}</Td>
                    <Td className="whitespace-nowrap">
                      {label(SHIFT_PATTERN_LABELS, assignment.shiftPattern)}
                    </Td>
                    <Td className="whitespace-nowrap">
                      {formatDate(assignment.startDate)}
                      {assignment.endDate ? ` – ${formatDate(assignment.endDate)}` : ''}
                    </Td>
                    <Td>
                      <StatusPill {...assignmentStatus(assignment.status)} />
                      {assignment.replacementReason ? (
                        <span className="mt-1 block max-w-xs text-xs text-ink-500">
                          {assignment.replacementReason}
                        </span>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState
                title="No caregiver has been assigned"
                action={
                  <ButtonLink href={`/app/admin/assignments?senior=${senior.id}`} size="sm">
                    Run the match
                  </ButtonLink>
                }
              />
            )}
          </Card>

          <Card>
            <CardHeader title="Recent visits" />
            {senior.visits.length ? (
              <Table caption="Visits" head={['When', 'Caregiver', 'Status']}>
                {senior.visits.map((visit) => (
                  <tr key={visit.id}>
                    <Td className="whitespace-nowrap">{formatDateTime(visit.scheduledStart)}</Td>
                    <Td>{visit.caregiver?.user.name ?? '—'}</Td>
                    <Td>
                      <StatusPill {...visitStatus(visit.status)} />
                    </Td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState title="No visits yet" />
            )}
          </Card>

          <Card>
            <CardHeader title="Assessments" />
            {senior.assessments.length ? (
              <Table caption="Assessments" head={['Type', 'Scheduled', 'Nurse', 'Status']}>
                {senior.assessments.map((assessment) => (
                  <tr key={assessment.id}>
                    <Td>{titleise(assessment.type)}</Td>
                    <Td className="whitespace-nowrap">
                      {assessment.scheduledAt ? formatDateTime(assessment.scheduledAt) : '—'}
                    </Td>
                    <Td>
                      {assessment.nurse?.user.name ?? (
                        <span className="text-warning">Not assigned</span>
                      )}
                    </Td>
                    <Td>
                      <StatusPill {...assessmentStatus(assessment.status)} />
                    </Td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState title="No assessment on record" />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <div className="px-5 py-4">
              <DescriptionList
                columns={1}
                items={[
                  { label: 'Living arrangement', value: label(LIVING_ARRANGEMENT_LABELS, senior.livingArrangement) },
                  { label: 'Mobility', value: label(MOBILITY_LABELS, senior.mobility) },
                  { label: 'Conditions', value: readList(senior.conditions).join(', ') || '—' },
                  { label: 'Languages', value: readList(senior.languages).join(', ') || '—' },
                  { label: 'Address', value: senior.addressLine ?? '—' },
                  { label: 'Supervising nurse', value: senior.supervisingNurse?.user.name ?? 'Not assigned' },
                  {
                    label: 'Consent',
                    value: senior.consentCapturedAt
                      ? `${formatDate(senior.consentCapturedAt)} · ${senior.consentCapturedBy ?? 'unknown'}`
                      : 'Not recorded',
                  },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Family" />
            {senior.familyLinks.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {senior.familyLinks.map((link) => (
                  <li key={link.id} className="px-5 py-3 text-sm">
                    <p className="font-semibold text-ink-900">
                      {link.familyProfile.user.name}
                    </p>
                    <p className="text-ink-600">
                      {titleise(link.relationship)} ·{' '}
                      {formatPhone(link.familyProfile.user.phone)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {link.isPrimaryContact ? <Badge tone="brand">Primary contact</Badge> : null}
                      {link.isPrimaryPayer ? <Badge tone="neutral">Payer</Badge> : null}
                      {!link.canViewClinical ? (
                        <Badge tone="warning">No clinical access</Badge>
                      ) : null}
                      {link.familyProfile.isNri ? <Badge tone="info">Outside India</Badge> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No family linked" />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Billing"
              action={
                outstanding > 0 ? (
                  <Badge tone="warning">{formatMoney(outstanding)} outstanding</Badge>
                ) : undefined
              }
            />
            {senior.invoices.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {senior.invoices.slice(0, 6).map((invoice) => (
                  <li key={invoice.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium text-ink-900">{invoice.number}</p>
                      <p className="text-xs text-ink-500">
                        {invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : 'No due date'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-nums text-ink-900">{formatMoney(invoice.totalPaise)}</p>
                      <StatusPill {...invoiceStatus(invoice.status)} className="mt-1" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No invoices" />
            )}
          </Card>

          <Card>
            <CardHeader title="Incidents" />
            {senior.incidents.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {senior.incidents.map((incident) => (
                  <li key={incident.id} className="px-5 py-3 text-sm">
                    <StatusPill {...incidentStatus(incident.status)} />
                    <p className="mt-1.5 font-medium text-ink-900">{incident.title}</p>
                    <p className="text-xs text-ink-500">
                      {incident.reference} · {formatDate(incident.reportedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No incidents" />
            )}
          </Card>

          {senior.leads.length ? (
            <Card>
              <CardHeader title="Enquiries" />
              <ul className="divide-y divide-[color:var(--border)]">
                {senior.leads.map((lead) => (
                  <li key={lead.id} className="px-5 py-3 text-sm">
                    <Link
                      href={`/app/admin/leads/${lead.id}`}
                      className="font-medium text-brand-800 hover:underline"
                    >
                      {lead.reference}
                    </Link>
                    <span className="ml-2 text-ink-500">{titleise(lead.status)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
