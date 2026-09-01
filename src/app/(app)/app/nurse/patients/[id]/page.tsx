import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  DescriptionList,
  EmptyState,
  PageHeader,
  StatusPill,
  Table,
  Td,
} from '@/components/ui';
import { LineTrend } from '@/components/charts';
import { NurseNoteForm } from '@/components/nurse/nurse-note-form';
import { requirePageUser } from '@/lib/auth-guard';
import { nursePatientDetail } from '@/lib/queries/nurse';
import { canAccessSenior } from '@/lib/scope';
import { audit } from '@/lib/audit';
import {
  formatDate,
  formatDateTime,
  formatName,
  formatPhone,
  formatVital,
} from '@/lib/format';
import { readList } from '@/lib/json-list';
import {
  CARE_NOTE_TYPE_LABELS,
  LIVING_ARRANGEMENT_LABELS,
  MOBILITY_LABELS,
  SERVICE_CLASS_LABELS,
  VITAL_META,
  label,
  titleise,
  type VitalType,
} from '@/lib/constants';
import {
  assignmentStatus,
  carePlanStatus,
  incidentStatus,
  reminderStatus,
  seniorStatus,
  severity as severityDisplay,
  visitStatus,
  vitalFlag,
} from '@/lib/status';

export const metadata: Metadata = {
  title: 'Patient record',
  robots: { index: false, follow: false },
};

/**
 * The clinical record for one patient.
 *
 * This is the densest screen in the product and that is correct: a nurse reviewing a case
 * needs demographics, plan, caregiver, visits, notes, readings, medication, appointments,
 * incidents and documents together. Splitting it across tabs would mean a nurse forming a
 * judgement without having seen the medication list.
 */
export default async function NursePatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser(['NURSE', 'ADMIN', 'OPS_MANAGER']);
  const { id } = await params;

  if (!(await canAccessSenior(user, id))) {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'patient.read.denied',
      entity: 'Senior',
      entityId: id,
      outcome: 'DENIED',
    });
    notFound();
  }

  const detail = await nursePatientDetail(id);
  if (!detail.senior) notFound();

  // Opening a full clinical record is a PHI read and is recorded as one.
  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'patient.clinical-record.read',
    entity: 'Senior',
    entityId: id,
    seniorId: id,
  });

  const { senior, plan, visits, notes, vitals, medications, appointments, incidents, documents } =
    detail;

  const primaryContact = senior.familyLinks.find((link) => link.isPrimaryContact);
  const conditions = readList(senior.conditions);
  const flaggedVitals = vitals.filter(
    (vital) => vital.flag === 'REQUIRES_REVIEW' && !vital.reviewedAt,
  );
  const unreviewedNotes = notes.filter((note) => note.requiresReview && !note.reviewedAt);

  // Group readings by type for the charts.
  const vitalsByType = new Map<string, typeof vitals>();
  for (const vital of [...vitals].reverse()) {
    const list = vitalsByType.get(vital.type);
    if (list) list.push(vital);
    else vitalsByType.set(vital.type, [vital]);
  }

  return (
    <div>
      <PageHeader
        title={`${formatName(senior)}, ${senior.ageYears ?? '—'}`}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{senior.serviceArea?.name ?? senior.area}</span>
            <StatusPill {...seniorStatus(senior.status)} />
            {senior.supervisingNurse ? (
              <span className="text-ink-500">
                Supervised by {senior.supervisingNurse.user.name}
              </span>
            ) : (
              <Badge tone="warning">No supervising nurse assigned</Badge>
            )}
          </span>
        }
        breadcrumb={[
          { href: '/app/nurse', label: 'Overview' },
          { href: '/app/nurse/patients', label: 'Patients' },
        ]}
      />

      {flaggedVitals.length + unreviewedNotes.length > 0 ? (
        <Alert tone="warning" title="Items waiting for your review" className="mb-6">
          <p>
            {flaggedVitals.length} reading{flaggedVitals.length === 1 ? '' : 's'} and{' '}
            {unreviewedNotes.length} note{unreviewedNotes.length === 1 ? '' : 's'} for this patient
            have not been reviewed.{' '}
            <Link href="/app/nurse/reviews" className="font-semibold underline">
              Open the review queue
            </Link>
            .
          </p>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          {/* Care plan */}
          <Card>
            <CardHeader
              title="Care plan"
              description={plan ? `${plan.title} · version ${plan.version}` : undefined}
              action={plan ? <StatusPill {...carePlanStatus(plan.status)} /> : undefined}
            />
            {plan ? (
              <div className="space-y-5 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Goals
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[0.9375rem] text-ink-800">
                    {readList(plan.primaryGoals).map((goal) => (
                      <li key={goal} className="flex gap-2">
                        <span className="text-brand-700" aria-hidden="true">
                          •
                        </span>
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>

                <DescriptionList
                  columns={2}
                  items={[
                    { label: 'Package', value: plan.package?.name ?? 'Custom' },
                    {
                      label: 'Review date',
                      value: plan.reviewDate ? formatDate(plan.reviewDate) : 'Not set',
                    },
                    { label: 'Schedule', value: plan.scheduleSummary ?? '—' },
                    { label: 'Approved by', value: plan.approvedBy ?? 'Not approved' },
                  ]}
                />

                {plan.mobilityNotes || plan.dietaryNotes || plan.escalationPreferences ? (
                  <div className="space-y-3 border-t border-[color:var(--border)] pt-4 text-sm">
                    {plan.mobilityNotes ? (
                      <p>
                        <span className="font-semibold text-ink-900">Mobility: </span>
                        <span className="text-ink-700">{plan.mobilityNotes}</span>
                      </p>
                    ) : null}
                    {plan.dietaryNotes ? (
                      <p>
                        <span className="font-semibold text-ink-900">Diet: </span>
                        <span className="text-ink-700">{plan.dietaryNotes}</span>
                      </p>
                    ) : null}
                    {plan.escalationPreferences ? (
                      <p>
                        <span className="font-semibold text-ink-900">Escalation: </span>
                        <span className="text-ink-700">{plan.escalationPreferences}</span>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="border-t border-[color:var(--border)] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Services
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {plan.services.map((row) => (
                      <li key={row.id} className="flex flex-wrap items-center gap-2">
                        <span className="text-ink-800">{row.service.name}</span>
                        <Badge tone="neutral">{titleise(row.frequency)}</Badge>
                        <Badge
                          tone={row.service.serviceClass === 'NURSING' ? 'info' : 'neutral'}
                        >
                          {label(SERVICE_CLASS_LABELS, row.service.serviceClass)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.versions.length > 1 ? (
                  <details className="border-t border-[color:var(--border)] pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-brand-800">
                      Version history ({plan.versions.length})
                    </summary>
                    <ul className="mt-3 space-y-2.5 text-sm">
                      {plan.versions.map((version) => (
                        <li key={version.id}>
                          <p className="font-medium text-ink-900">
                            v{version.version} · {formatDate(version.createdAt)}
                          </p>
                          <p className="text-ink-600">
                            {version.changeNote ?? 'No change note recorded'}
                            {version.createdBy ? ` — ${version.createdBy}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title="No active care plan"
                description="A plan is written after the assessment. Until there is one, caregivers have no agreed task list to work from."
              />
            )}
          </Card>

          {/* Readings */}
          <Card>
            <CardHeader
              title="Readings"
              description="Recorded as measured. The shaded band is the range configured for this patient."
            />
            {vitalsByType.size ? (
              <div className="space-y-6 px-5 py-4">
                {[...vitalsByType.entries()].map(([type, readings]) => {
                  const meta = VITAL_META[type as VitalType];
                  const latest = readings[readings.length - 1];
                  return (
                    <div key={type}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-semibold text-ink-900">{meta?.label ?? type}</h3>
                        <span className="text-sm tabular-nums text-ink-700">
                          Latest:{' '}
                          {formatVital(type, latest.valueNumber, latest.valueSecondary)} (
                          {formatDate(latest.measuredAt)})
                        </span>
                      </div>
                      <LineTrend
                        data={readings.map((reading) => ({
                          label: formatDate(reading.measuredAt).replace(/ \d{4}$/, ''),
                          value: reading.valueNumber,
                          ...(reading.valueSecondary != null
                            ? { secondary: reading.valueSecondary }
                            : {}),
                        }))}
                        series={
                          type === 'BLOOD_PRESSURE'
                            ? [
                                { key: 'value', label: 'Systolic' },
                                { key: 'secondary', label: 'Diastolic', colour: '#175cd3' },
                              ]
                            : [{ key: 'value', label: meta?.label ?? type }]
                        }
                        unit={meta?.unit}
                        height={170}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No readings recorded" />
            )}
          </Card>

          {/* Visits */}
          <Card>
            <CardHeader title="Recent visits" />
            {visits.length ? (
              <Table caption="Recent visits" head={['When', 'Who', 'Tasks', 'Status']}>
                {visits.slice(0, 12).map((visit) => {
                  const done = visit.tasks.filter((task) => task.status === 'DONE').length;
                  const refused = visit.tasks.filter((task) => task.status === 'REFUSED').length;
                  return (
                    <tr key={visit.id}>
                      <Td className="whitespace-nowrap">{formatDateTime(visit.scheduledStart)}</Td>
                      <Td>{visit.caregiver?.user.name ?? visit.nurse?.user.name ?? '—'}</Td>
                      <Td>
                        {visit.tasks.length ? (
                          <>
                            {done}/{visit.tasks.length}
                            {refused > 0 ? (
                              <span className="ml-2">
                                <Badge tone="warning">{refused} declined</Badge>
                              </span>
                            ) : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </Td>
                      <Td>
                        <StatusPill {...visitStatus(visit.status)} />
                      </Td>
                    </tr>
                  );
                })}
              </Table>
            ) : (
              <EmptyState title="No visits recorded yet" />
            )}
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader title="Care notes" description="Everything recorded, internal notes included." />
            {notes.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {notes.slice(0, 15).map((note) => (
                  <li key={note.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          ['CONCERN', 'REFUSAL', 'MISSED_TASK'].includes(note.type)
                            ? 'warning'
                            : note.type === 'NURSE_REVIEW'
                              ? 'info'
                              : 'neutral'
                        }
                      >
                        {label(CARE_NOTE_TYPE_LABELS, note.type)}
                      </Badge>
                      {!note.visibleToFamily ? <Badge tone="neutral">Internal only</Badge> : null}
                      {note.requiresReview && !note.reviewedAt ? (
                        <Badge tone="danger">Needs review</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-800">
                      {note.body}
                    </p>
                    <p className="mt-1.5 text-xs text-ink-500">
                      {note.author.name} · {formatDateTime(note.createdAt)}
                      {note.reviewedBy ? ` · reviewed by ${note.reviewedBy}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No notes yet" />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <NurseNoteForm seniorId={senior.id} />

          <Card>
            <CardHeader title="Patient details" />
            <div className="px-5 py-4">
              <DescriptionList
                columns={1}
                items={[
                  { label: 'Living arrangement', value: label(LIVING_ARRANGEMENT_LABELS, senior.livingArrangement) },
                  { label: 'Mobility', value: label(MOBILITY_LABELS, senior.mobility) },
                  { label: 'Conditions', value: conditions.join(', ') || 'None recorded' },
                  { label: 'Allergies', value: senior.allergies ?? 'None recorded' },
                  { label: 'Languages', value: readList(senior.languages).join(', ') || '—' },
                  { label: 'Address', value: senior.addressLine ?? '—' },
                  {
                    label: 'Emergency contact',
                    value: senior.emergencyContactName
                      ? `${senior.emergencyContactName} · ${formatPhone(senior.emergencyContactPhone)}`
                      : '—',
                  },
                  {
                    label: 'Consent recorded',
                    value: senior.consentCapturedAt
                      ? `${formatDate(senior.consentCapturedAt)} by ${senior.consentCapturedBy ?? 'unknown'}`
                      : 'Not recorded',
                  },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Care team" />
            <div className="space-y-4 px-5 py-4 text-sm">
              {senior.assignments.length ? (
                senior.assignments.map((assignment) => (
                  <div key={assignment.id}>
                    <p className="font-semibold text-ink-900">
                      {assignment.caregiver.user.name}
                    </p>
                    <p className="text-ink-600">
                      {titleise(assignment.role)} ·{' '}
                      {readList(assignment.caregiver.languages).join(', ') || 'languages not recorded'}
                    </p>
                    <p className="mt-1">
                      <StatusPill {...assignmentStatus(assignment.status)} />
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-ink-600">No caregiver assigned.</p>
              )}

              {primaryContact ? (
                <div className="border-t border-[color:var(--border)] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Primary family contact
                  </p>
                  <p className="mt-1 font-semibold text-ink-900">
                    {primaryContact.familyProfile.user.name}
                  </p>
                  <p className="text-ink-600">
                    {titleise(primaryContact.relationship)} ·{' '}
                    {formatPhone(primaryContact.familyProfile.user.phone)}
                  </p>
                  {!primaryContact.canViewClinical ? (
                    <p className="mt-1">
                      <Badge tone="neutral">Cannot see clinical detail</Badge>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Medication" description="Recorded from the prescription. Not prescribed by us." />
            {medications.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {medications.map((medication) => {
                  const recent = medication.reminders.slice(0, 7);
                  const missed = recent.filter((r) => r.status === 'MISSED').length;
                  return (
                    <li key={medication.id} className="px-5 py-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-ink-900">
                          {medication.name} {medication.dose}
                        </p>
                        {!medication.isActive ? <Badge tone="neutral">Stopped</Badge> : null}
                      </div>
                      <p className="text-ink-600">
                        {readList(medication.timings).join(', ') || 'No times set'}
                      </p>
                      {medication.instructions ? (
                        <p className="mt-0.5 text-ink-600">{medication.instructions}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-ink-500">
                        Entered by {medication.enteredBy.name}
                        {medication.prescribedBy ? ` · prescribed by ${medication.prescribedBy}` : ''}
                      </p>
                      {missed > 0 ? (
                        <p className="mt-1.5">
                          <Badge tone="danger">{missed} missed in the last 7 reminders</Badge>
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="No medication recorded" />
            )}
          </Card>

          <Card>
            <CardHeader title="Incidents" />
            {incidents.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {incidents.map((incident) => (
                  <li key={incident.id} className="px-5 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill {...severityDisplay(incident.severity)} />
                      <StatusPill {...incidentStatus(incident.status)} />
                    </div>
                    <p className="mt-1.5 font-medium text-ink-900">{incident.title}</p>
                    <p className="text-xs text-ink-500">
                      {incident.reference} · {formatDate(incident.reportedAt)} ·{' '}
                      {incident.reportedBy.name}
                    </p>
                    {!incident.severityConfirmedBy && incident.status === 'OPEN' ? (
                      <p className="mt-1">
                        <Badge tone="warning">Severity not yet confirmed by a nurse</Badge>
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No incidents recorded" />
            )}
          </Card>

          <Card>
            <CardHeader title="Appointments" />
            {appointments.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {appointments.map((appointment) => (
                  <li key={appointment.id} className="px-5 py-3 text-sm">
                    <p className="font-medium text-ink-900">{appointment.title}</p>
                    <p className="text-ink-600">{formatDateTime(appointment.scheduledAt)}</p>
                    {appointment.outcomeNotes ? (
                      <p className="mt-1 text-ink-600">{appointment.outcomeNotes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No appointments" />
            )}
          </Card>

          <Card>
            <CardHeader title="Documents" />
            {documents.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {documents.map((document) => (
                  <li key={document.id} className="px-5 py-3 text-sm">
                    <a
                      href={`/api/documents/${document.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-800 hover:underline"
                    >
                      {document.label}
                    </a>
                    <p className="text-xs text-ink-500">
                      {titleise(document.category)} · {formatDate(document.uploadedAt)} ·{' '}
                      {document.uploadedBy.name}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No documents" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
