import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Card, CardHeader, EmptyState, PageHeader, StatusPill, Table, Td } from '@/components/ui';
import { LeaveDecisions } from '@/components/admin/leave-decisions';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { readList } from '@/lib/json-list';
import { caregiverStatus, verificationStatus } from '@/lib/status';
import { titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Caregivers',
  robots: { index: false, follow: false },
};

/**
 * Caregiver management.
 *
 * Verification status is a first-class column rather than a detail-page field, because the
 * business promise depends on never deploying an unverified caregiver without knowing it.
 */
export default async function AdminCaregiversPage() {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);

  const [caregivers, pendingLeave] = await Promise.all([
    prisma.caregiverProfile.findMany({
      orderBy: [{ status: 'asc' }, { performanceScore: 'desc' }],
      include: {
        user: { select: { name: true, phone: true } },
        assignments: {
          where: { status: { in: ['ACTIVE', 'NEEDS_REPLACEMENT'] } },
          select: { id: true, seniorId: true },
        },
        documents: { select: { id: true, verifiedAt: true } },
      },
    }),
    prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { fromDate: 'asc' },
      include: {
        caregiver: { select: { user: { select: { name: true } } } },
        nurse: { select: { user: { select: { name: true } } } },
      },
    }),
  ]);

  const unverified = caregivers.filter(
    (caregiver) => caregiver.verificationStatus !== 'VERIFIED',
  );

  return (
    <div>
      <PageHeader
        title="Caregivers"
        description={`${caregivers.length} on the team`}
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
      />

      {unverified.length > 0 ? (
        <Alert
          tone="warning"
          title={`${unverified.length} caregiver${unverified.length === 1 ? '' : 's'} without complete verification`}
          className="mb-6"
        >
          <p>
            These are visible as unverified everywhere they appear, including in the replacement
            matcher. Never describe them as verified to a family until the checks are on file.
          </p>
        </Alert>
      ) : null}

      {pendingLeave.length > 0 ? (
        <Card className="mb-6">
          <CardHeader
            title="Leave requests waiting for a decision"
            description="Approving leave flags the affected assignments so cover can be arranged."
          />
          <LeaveDecisions
            requests={pendingLeave.map((request) => ({
              id: request.id,
              name: request.caregiver?.user.name ?? request.nurse?.user.name ?? 'Staff member',
              fromDate: formatDate(request.fromDate),
              toDate: formatDate(request.toDate),
              type: titleise(request.type),
              reason: request.reason,
            }))}
          />
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Team" />
        {caregivers.length ? (
          <Table
            caption="Caregivers"
            head={['Caregiver', 'Verification', 'Areas', 'Languages', 'Caseload', 'Performance', 'Status']}
          >
            {caregivers.map((caregiver) => (
              <tr key={caregiver.id}>
                <Td>
                  <Link
                    href={`/app/admin/caregivers/${caregiver.id}`}
                    className="font-semibold text-brand-800 hover:underline"
                  >
                    {caregiver.user.name}
                  </Link>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    {caregiver.employeeCode} · {caregiver.experienceYears}y experience
                  </span>
                </Td>
                <Td>
                  <StatusPill {...verificationStatus(caregiver.verificationStatus)} />
                  <span className="mt-1 block text-xs text-ink-500">
                    {caregiver.documents.filter((doc) => doc.verifiedAt).length}/
                    {caregiver.documents.length} documents checked
                  </span>
                </Td>
                <Td className="max-w-[12rem] text-ink-700">
                  {readList(caregiver.preferredAreas).join(', ') || '—'}
                </Td>
                <Td className="max-w-[10rem] text-ink-700">
                  {readList(caregiver.languages).join(', ') || '—'}
                </Td>
                <Td className="whitespace-nowrap">
                  {new Set(caregiver.assignments.map((a) => a.seniorId)).size}/
                  {caregiver.maxConcurrentPatients}
                </Td>
                <Td className="whitespace-nowrap">
                  {caregiver.performanceScore}
                  <span className="ml-2 text-xs text-ink-500">
                    {caregiver.attendanceRate}% attendance
                  </span>
                </Td>
                <Td>
                  <StatusPill {...caregiverStatus(caregiver.status)} />
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="No caregivers on record" />
        )}
      </Card>
    </div>
  );
}
