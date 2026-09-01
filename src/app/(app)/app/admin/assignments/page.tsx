import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Alert,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatusPill,
  Table,
  Td,
} from '@/components/ui';
import { ReplacementMatcher } from '@/components/admin/replacement-matcher';
import { SeniorPicker } from '@/components/admin/senior-picker';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDate, formatName } from '@/lib/format';
import { verificationStatus } from '@/lib/status';
import { SHIFT_PATTERN_LABELS, label } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Caregiver assignments',
  robots: { index: false, follow: false },
};

/**
 * Assignments and replacements.
 *
 * The page leads with the problems — assignments needing replacement and patients with
 * nobody assigned — because that is why an ops person opens it. Picking a patient runs the
 * match.
 */
export default async function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);
  const params = await searchParams;
  const selectedSeniorId = typeof params.senior === 'string' ? params.senior : undefined;

  const [needsReplacement, unassigned, activeAssignments, selectableSeniors, selectedSenior] =
    await Promise.all([
      prisma.caregiverAssignment.findMany({
        where: { status: 'NEEDS_REPLACEMENT' },
        include: {
          senior: { select: { id: true, firstName: true, lastName: true, area: true } },
          caregiver: { select: { user: { select: { name: true } } } },
        },
      }),
      prisma.senior.findMany({
        where: {
          status: 'ACTIVE',
          assignments: { none: { status: { in: ['ACTIVE', 'PROPOSED'] } } },
        },
        select: { id: true, firstName: true, lastName: true, area: true },
      }),
      prisma.caregiverAssignment.findMany({
        where: { status: { in: ['ACTIVE', 'PROPOSED'] } },
        orderBy: { startDate: 'desc' },
        include: {
          senior: { select: { id: true, firstName: true, lastName: true, area: true } },
          caregiver: {
            select: {
              id: true,
              verificationStatus: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      prisma.senior.findMany({
        where: { status: { in: ['ACTIVE', 'ASSESSMENT'] } },
        orderBy: { lastName: 'asc' },
        select: { id: true, firstName: true, lastName: true, area: true },
      }),
      selectedSeniorId
        ? prisma.senior.findUnique({
            where: { id: selectedSeniorId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              assignments: {
                where: { status: { in: ['ACTIVE', 'NEEDS_REPLACEMENT'] } },
                orderBy: { startDate: 'desc' },
                take: 1,
                include: { caregiver: { select: { user: { select: { name: true } } } } },
              },
            },
          })
        : Promise.resolve(null),
    ]);

  const currentAssignment = selectedSenior?.assignments[0]
    ? {
        id: selectedSenior.assignments[0].id,
        caregiverName: selectedSenior.assignments[0].caregiver.user.name,
        shiftPattern: selectedSenior.assignments[0].shiftPattern,
        shiftStart: selectedSenior.assignments[0].shiftStart,
        shiftEnd: selectedSenior.assignments[0].shiftEnd,
        status: selectedSenior.assignments[0].status,
      }
    : null;

  return (
    <div>
      <PageHeader
        title="Caregiver assignments"
        description="Assign, and replace when somebody becomes unavailable."
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
      />

      {needsReplacement.length > 0 ? (
        <Alert
          tone="danger"
          title={`${needsReplacement.length} assignment${needsReplacement.length === 1 ? '' : 's'} need cover`}
          className="mb-6"
        >
          <ul className="mt-1 space-y-1">
            {needsReplacement.map((assignment) => (
              <li key={assignment.id}>
                <Link
                  href={`/app/admin/assignments?senior=${assignment.senior.id}`}
                  className="font-semibold underline"
                >
                  {formatName(assignment.senior)}
                </Link>{' '}
                — {assignment.caregiver.user.name} is unavailable ({assignment.senior.area})
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {unassigned.length > 0 ? (
        <Alert
          tone="warning"
          title={`${unassigned.length} active patient${unassigned.length === 1 ? '' : 's'} with nobody assigned`}
          className="mb-6"
        >
          <ul className="mt-1 space-y-1">
            {unassigned.map((senior) => (
              <li key={senior.id}>
                <Link
                  href={`/app/admin/assignments?senior=${senior.id}`}
                  className="font-semibold underline"
                >
                  {formatName(senior)}
                </Link>{' '}
                ({senior.area})
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Choose a patient"
              description="Running the match shows who can cover, and why."
            />
            <div className="px-5 py-4">
              <SeniorPicker
                seniors={selectableSeniors.map((senior) => ({
                  id: senior.id,
                  label: `${formatName(senior)} — ${senior.area}`,
                }))}
                selectedId={selectedSeniorId ?? ''}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Current assignments"
              description={`${activeAssignments.length} active`}
            />
            {activeAssignments.length ? (
              <Table caption="Active assignments" head={['Patient', 'Caregiver', 'Shift', 'Since']}>
                {activeAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <Td>
                      <Link
                        href={`/app/admin/assignments?senior=${assignment.senior.id}`}
                        className="font-medium text-brand-800 hover:underline"
                      >
                        {formatName(assignment.senior)}
                      </Link>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {assignment.senior.area}
                      </span>
                    </Td>
                    <Td>
                      {assignment.caregiver.user.name}
                      {assignment.caregiver.verificationStatus !== 'VERIFIED' ? (
                        <span className="mt-1 block">
                          <StatusPill
                            {...verificationStatus(assignment.caregiver.verificationStatus)}
                          />
                        </span>
                      ) : null}
                    </Td>
                    <Td className="whitespace-nowrap">
                      {label(SHIFT_PATTERN_LABELS, assignment.shiftPattern)}
                      {assignment.shiftStart ? (
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {assignment.shiftStart}–{assignment.shiftEnd}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="whitespace-nowrap">{formatDate(assignment.startDate)}</Td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState title="No active assignments" />
            )}
          </Card>
        </div>

        <div>
          {selectedSenior ? (
            <ReplacementMatcher
              seniorId={selectedSenior.id}
              seniorName={formatName(selectedSenior)}
              currentAssignment={currentAssignment}
            />
          ) : (
            <Card>
              <EmptyState
                title="Choose a patient to run the match"
                description="The matcher ranks every caregiver on proximity, availability, skills, language, shift compatibility, experience and performance — and shows the reasoning behind each score."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
