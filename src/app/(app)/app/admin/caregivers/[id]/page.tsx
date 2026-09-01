import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  DescriptionList,
  EmptyState,
  PageHeader,
  Progress,
  Stat,
  StatusPill,
  Table,
  Td,
} from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';
import { formatDate, formatDateTime, formatName, formatPhone } from '@/lib/format';
import { readList } from '@/lib/json-list';
import { assignmentStatus, caregiverStatus, verificationStatus, visitStatus } from '@/lib/status';
import {
  DAYS_OF_WEEK,
  DOCUMENT_CATEGORY_LABELS,
  SHIFT_PATTERN_LABELS,
  label,
  titleise,
} from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Caregiver',
  robots: { index: false, follow: false },
};

/**
 * The operational record for one caregiver.
 *
 * Two rules shape this page.
 *
 * First, verification is stated as it actually is. A caregiver is only described as
 * verified where a person has recorded the check, and the documents table shows which
 * individual documents were checked and by when they expire. An unverified caregiver is
 * not quietly presented as a normal one — the banner at the top says so, because the whole
 * business promise rests on nobody being surprised by this at the point of assignment.
 *
 * Second, performance figures are labelled as the internal, ops-maintained numbers they
 * are. They are not a rating a family gave, and the page does not imply that they are.
 */
export default async function AdminCaregiverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser(['ADMIN', 'OPS_MANAGER']);
  const { id } = await params;

  const caregiver = await prisma.caregiverProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true } },
      documents: { orderBy: { createdAt: 'desc' } },
      trainingRecords: { orderBy: { completedAt: 'desc' } },
      availability: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      leaveRequests: { orderBy: { fromDate: 'desc' }, take: 12 },
      assignments: {
        orderBy: { startDate: 'desc' },
        include: {
          senior: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      visits: {
        orderBy: { scheduledStart: 'desc' },
        take: 12,
        include: { senior: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  if (!caregiver) notFound();

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'caregiver.read',
    entity: 'CaregiverProfile',
    entityId: caregiver.id,
  });

  const verification = verificationStatus(caregiver.verificationStatus);
  const isVerified = caregiver.verificationStatus === 'VERIFIED';
  const activeAssignments = caregiver.assignments.filter((assignment) =>
    ['ACTIVE', 'NEEDS_REPLACEMENT'].includes(assignment.status),
  );
  const now = new Date();
  const expiringSoon = caregiver.documents.filter(
    (document) =>
      document.expiresAt &&
      document.expiresAt.getTime() - now.getTime() < 60 * 24 * 3_600_000,
  );
  const unverifiedDocuments = caregiver.documents.filter((document) => !document.verifiedAt);
  const approvedLeave = caregiver.leaveRequests.filter(
    (leave) => leave.status === 'APPROVED' && leave.toDate >= now,
  );

  // Attendance measured from this caregiver's own recent visits, alongside the score ops
  // maintain by hand. Showing both makes a disagreement between them visible.
  const finishedVisits = caregiver.visits.filter((visit) =>
    ['COMPLETED', 'MISSED'].includes(visit.status),
  );
  const missedVisits = finishedVisits.filter((visit) => visit.status === 'MISSED').length;

  const skills = readList(caregiver.skills);
  const languages = readList(caregiver.languages);
  const qualifications = readList(caregiver.qualifications);
  const preferredAreas = readList(caregiver.preferredAreas);

  return (
    <div>
      <PageHeader
        title={caregiver.user.name}
        description={`${caregiver.employeeCode} · ${caregiver.experienceYears} year${caregiver.experienceYears === 1 ? '' : 's'} of experience`}
        breadcrumb={[
          { href: '/app/admin', label: 'Operations' },
          { href: '/app/admin/caregivers', label: 'Caregivers' },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              tone={caregiverStatus(caregiver.status).tone}
              label={caregiverStatus(caregiver.status).label}
            />
            <StatusPill tone={verification.tone} label={verification.label} />
          </div>
        }
      />

      {!isVerified ? (
        <Alert
          tone={caregiver.verificationStatus === 'REJECTED' ? 'danger' : 'warning'}
          title={`This caregiver is not verified — ${verification.label.toLowerCase()}`}
          className="mb-6"
        >
          <p>
            Do not describe them to a family as verified, and do not place them with a new
            patient, until the checks below have actually been completed and recorded here.
            {unverifiedDocuments.length
              ? ` ${unverifiedDocuments.length} document${unverifiedDocuments.length === 1 ? ' has' : 's have'} been uploaded but not yet checked.`
              : ' No documents have been uploaded yet.'}
          </p>
        </Alert>
      ) : null}

      {expiringSoon.length ? (
        <Alert tone="warning" title="Documents expiring within 60 days" className="mb-6">
          <ul className="list-disc space-y-1 pl-5">
            {expiringSoon.map((document) => (
              <li key={document.id}>
                {document.label} — expires {formatDate(document.expiresAt)}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {approvedLeave.length ? (
        <Alert tone="info" title="Approved leave coming up" className="mb-6">
          <ul className="list-disc space-y-1 pl-5">
            {approvedLeave.map((leave) => (
              <li key={leave.id}>
                {formatDate(leave.fromDate)} – {formatDate(leave.toDate)} ·{' '}
                {titleise(leave.type)}. {leave.reason}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Any patient covered by this caregiver during those dates needs a replacement
            arranged from the patient&rsquo;s own record.
          </p>
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Patients now"
          value={`${activeAssignments.length}/${caregiver.maxConcurrentPatients}`}
          hint={
            activeAssignments.length >= caregiver.maxConcurrentPatients
              ? 'At capacity'
              : 'Has room for another'
          }
          tone={activeAssignments.length >= caregiver.maxConcurrentPatients ? 'warning' : 'success'}
        />
        <Stat
          label="Performance score"
          value={caregiver.performanceScore}
          hint="Internal, maintained by ops"
          tone={caregiver.performanceScore >= 80 ? 'success' : 'warning'}
        />
        <Stat
          label="Recorded attendance"
          value={`${caregiver.attendanceRate}%`}
          hint="Internal, maintained by ops"
          tone={caregiver.attendanceRate >= 95 ? 'success' : 'warning'}
        />
        <Stat
          label="Missed visits"
          value={finishedVisits.length ? `${missedVisits}/${finishedVisits.length}` : '—'}
          hint={finishedVisits.length ? 'Of the last recorded visits' : 'No completed visits yet'}
          tone={missedVisits === 0 ? 'success' : 'warning'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Profile" />
            <div className="px-5 py-4">
              <DescriptionList
                items={[
                  { label: 'Employee code', value: caregiver.employeeCode },
                  { label: 'Phone', value: formatPhone(caregiver.user.phone) },
                  { label: 'Email', value: caregiver.user.email ?? '—' },
                  { label: 'Account', value: titleise(caregiver.user.status) },
                  {
                    label: 'Experience',
                    value: `${caregiver.experienceYears} year${caregiver.experienceYears === 1 ? '' : 's'}`,
                  },
                  { label: 'Joined', value: formatDate(caregiver.createdAt) },
                  {
                    label: 'Last signed in',
                    value: caregiver.user.lastLoginAt
                      ? formatDateTime(caregiver.user.lastLoginAt)
                      : 'Never',
                  },
                  {
                    label: 'Verified on',
                    value: caregiver.verifiedAt ? formatDate(caregiver.verifiedAt) : 'Not verified',
                  },
                ]}
              />

              <div className="mt-5 space-y-4 border-t border-[color:var(--border)] pt-4">
                <TagRow title="Skills" values={skills} empty="No skills recorded yet." />
                <TagRow title="Languages" values={languages} empty="No languages recorded yet." />
                <TagRow
                  title="Qualifications"
                  values={qualifications}
                  empty="No qualifications recorded. Anything claimed here must have a document behind it."
                />
                <TagRow
                  title="Preferred areas"
                  values={preferredAreas}
                  empty="No area preference recorded — treated as available across all served areas."
                />
              </div>

              {caregiver.bio ? (
                <p className="mt-5 border-t border-[color:var(--border)] pt-4 text-[0.9375rem] leading-relaxed text-ink-600">
                  {caregiver.bio}
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Verification documents"
              description="A document counts as checked only once somebody records the check."
            />
            {caregiver.documents.length ? (
              <Table
                caption="Verification documents"
                head={['Document', 'Category', 'Uploaded', 'Checked', 'Expires']}
              >
                {caregiver.documents.map((document) => (
                  <tr key={document.id}>
                    <Td className="font-medium text-ink-900">{document.label}</Td>
                    <Td>{label(DOCUMENT_CATEGORY_LABELS, document.category)}</Td>
                    <Td>{formatDate(document.createdAt)}</Td>
                    <Td>
                      {document.verifiedAt ? (
                        <StatusPill
                          tone="success"
                          label={`Checked ${formatDate(document.verifiedAt)}`}
                        />
                      ) : (
                        <StatusPill tone="warning" label="Not checked" />
                      )}
                    </Td>
                    <Td>
                      {document.expiresAt ? (
                        <span
                          className={
                            document.expiresAt < now ? 'font-semibold text-danger' : undefined
                          }
                        >
                          {formatDate(document.expiresAt)}
                          {document.expiresAt < now ? ' · expired' : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </Td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState
                title="No documents uploaded"
                description="Identity, address, qualification and police verification documents are collected during onboarding. Until they are here and checked, this caregiver stays unverified."
              />
            )}
          </Card>

          <Card>
            <CardHeader title="Assignments" description="Current and past patients." />
            {caregiver.assignments.length ? (
              <Table
                caption="Assignments"
                head={['Patient', 'Role', 'Shift', 'Dates', 'Status']}
              >
                {caregiver.assignments.map((assignment) => {
                  const status = assignmentStatus(assignment.status);
                  const days = readList(assignment.daysOfWeek)
                    .map((day) => DAYS_OF_WEEK[Number(day)] ?? day)
                    .join(', ');
                  return (
                    <tr key={assignment.id}>
                      <Td>
                        <Link
                          className="font-medium text-brand-700 underline-offset-2 hover:underline"
                          href={`/app/admin/patients/${assignment.senior.id}`}
                        >
                          {formatName(assignment.senior)}
                        </Link>
                        {assignment.replacementReason ? (
                          <p className="mt-1 text-xs text-ink-500">
                            Replacement: {assignment.replacementReason}
                          </p>
                        ) : null}
                      </Td>
                      <Td>{titleise(assignment.role)}</Td>
                      <Td>
                        {label(SHIFT_PATTERN_LABELS, assignment.shiftPattern)}
                        {assignment.shiftStart && assignment.shiftEnd ? (
                          <span className="block text-xs text-ink-500">
                            {assignment.shiftStart}–{assignment.shiftEnd}
                            {days ? ` · ${days}` : ''}
                          </span>
                        ) : null}
                      </Td>
                      <Td>
                        {formatDate(assignment.startDate)}
                        {assignment.endDate ? ` – ${formatDate(assignment.endDate)}` : ' – ongoing'}
                      </Td>
                      <Td>
                        <StatusPill tone={status.tone} label={status.label} />
                        {assignment.matchScore != null ? (
                          <span className="mt-1 block text-xs text-ink-500">
                            Matched {assignment.matchScore}/100
                          </span>
                        ) : null}
                      </Td>
                    </tr>
                  );
                })}
              </Table>
            ) : (
              <EmptyState
                title="No assignments yet"
                description="This caregiver has not been placed with a patient."
              />
            )}
          </Card>

          <Card>
            <CardHeader title="Recent visits" description="The last twelve scheduled visits." />
            {caregiver.visits.length ? (
              <Table caption="Recent visits" head={['When', 'Patient', 'Checked in', 'Status']}>
                {caregiver.visits.map((visit) => {
                  const status = visitStatus(visit.status);
                  return (
                    <tr key={visit.id}>
                      <Td>{formatDateTime(visit.scheduledStart)}</Td>
                      <Td>
                        <Link
                          className="text-brand-700 underline-offset-2 hover:underline"
                          href={`/app/admin/patients/${visit.senior.id}`}
                        >
                          {formatName(visit.senior)}
                        </Link>
                      </Td>
                      <Td>
                        {visit.checkInAt ? (
                          <>
                            {formatDateTime(visit.checkInAt)}
                            {!visit.locationVerified ? (
                              <span className="block text-xs text-ink-500">
                                Location not confirmed
                              </span>
                            ) : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </Td>
                      <Td>
                        <StatusPill tone={status.tone} label={status.label} />
                      </Td>
                    </tr>
                  );
                })}
              </Table>
            ) : (
              <EmptyState title="No visits recorded" description="Nothing has been scheduled yet." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Standing availability"
              description="What they have told us they can work."
            />
            <div className="px-5 py-4">
              {caregiver.availability.length ? (
                <ul className="space-y-2 text-[0.9375rem]">
                  {caregiver.availability.map((slot) => (
                    <li key={slot.id} className="flex items-baseline justify-between gap-3">
                      <span className="font-medium text-ink-900">
                        {DAYS_OF_WEEK[slot.dayOfWeek] ?? `Day ${slot.dayOfWeek}`}
                      </span>
                      <span className={slot.isAvailable ? 'text-ink-600' : 'text-ink-400 line-through'}>
                        {slot.startTime}–{slot.endTime}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[0.9375rem] text-ink-600">
                  No standing availability recorded. The matcher treats an empty pattern as
                  unknown rather than as fully available.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Training" />
            {caregiver.trainingRecords.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {caregiver.trainingRecords.map((record) => (
                  <li key={record.id} className="px-5 py-3">
                    <p className="text-[0.9375rem] font-medium text-ink-900">{record.courseName}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      Completed {formatDate(record.completedAt)}
                      {record.score != null ? ` · scored ${record.score}` : ''}
                    </p>
                    {record.notes ? (
                      <p className="mt-1 text-sm text-ink-600">{record.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No training recorded"
                description="Do not describe this caregiver as trained in anything that is not listed here."
              />
            )}
          </Card>

          <Card>
            <CardHeader title="Leave history" />
            {caregiver.leaveRequests.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {caregiver.leaveRequests.map((leave) => (
                  <li key={leave.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[0.9375rem] font-medium text-ink-900">
                        {formatDate(leave.fromDate)} – {formatDate(leave.toDate)}
                      </p>
                      <Badge
                        tone={
                          leave.status === 'APPROVED'
                            ? 'success'
                            : leave.status === 'REJECTED'
                              ? 'danger'
                              : leave.status === 'PENDING'
                                ? 'warning'
                                : 'neutral'
                        }
                      >
                        {titleise(leave.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-600">
                      {titleise(leave.type)} · {leave.reason}
                    </p>
                    {leave.decisionNote ? (
                      <p className="mt-1 text-xs text-ink-500">{leave.decisionNote}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No leave requested" description="Nothing on record." />
            )}
          </Card>

          <Card>
            <CardHeader title="How these numbers are made" />
            <div className="space-y-3 px-5 py-4">
              <Progress
                label="Performance score"
                value={caregiver.performanceScore}
                tone={caregiver.performanceScore >= 80 ? 'success' : 'warning'}
              />
              <Progress
                label="Attendance"
                value={caregiver.attendanceRate}
                tone={caregiver.attendanceRate >= 95 ? 'success' : 'warning'}
              />
              <p className="text-sm leading-relaxed text-ink-600">
                Both figures are maintained by the operations team from visit completion,
                punctuality and family feedback. They are internal working numbers, not a
                rating a family gave, and they are never shown to families or to partners.
                The replacement matcher uses them for five of its hundred points.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TagRow({ title, values, empty }: { title: string; values: string[]; empty: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
      {values.length ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Badge key={value} tone="neutral">
              {value}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-ink-500">{empty}</p>
      )}
    </div>
  );
}
