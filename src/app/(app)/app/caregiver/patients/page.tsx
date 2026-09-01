import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, EmptyState, PageHeader, StatusPill } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatName } from '@/lib/format';
import { readList } from '@/lib/json-list';
import { assignmentStatus } from '@/lib/status';
import { MOBILITY_LABELS, SHIFT_PATTERN_LABELS, label } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'My patients',
  robots: { index: false, follow: false },
};

/** Only the patients this caregiver is assigned to — the scope rules make that structural. */
export default async function CaregiverPatientsPage() {
  const user = await requirePageUser(['CAREGIVER']);

  const assignments = await prisma.caregiverAssignment.findMany({
    where: {
      caregiverId: user.caregiverProfileId ?? '',
      status: { in: ['ACTIVE', 'PROPOSED', 'NEEDS_REPLACEMENT'] },
    },
    orderBy: { startDate: 'desc' },
    include: {
      senior: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          ageYears: true,
          area: true,
          mobility: true,
          languages: true,
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="My patients"
        description="The people you are currently assigned to."
        breadcrumb={[{ href: '/app/caregiver', label: 'Today' }]}
      />

      {assignments.length === 0 ? (
        <Card>
          <EmptyState
            title="No patients assigned yet"
            description="Operations will assign you once a care plan is ready. Your schedule will fill in at the same time."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader
                title={
                  <Link
                    href={`/app/caregiver/patients/${assignment.senior.id}`}
                    className="hover:text-brand-800 hover:underline"
                  >
                    {formatName(assignment.senior)}, {assignment.senior.ageYears ?? '—'}
                  </Link>
                }
                description={assignment.senior.area}
                action={<StatusPill {...assignmentStatus(assignment.status)} />}
              />
              <div className="grid gap-3 px-5 py-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Shift</p>
                  <p className="mt-1 text-ink-800">
                    {label(SHIFT_PATTERN_LABELS, assignment.shiftPattern)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Mobility
                  </p>
                  <p className="mt-1 text-ink-800">
                    {label(MOBILITY_LABELS, assignment.senior.mobility)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Speaks
                  </p>
                  <p className="mt-1 text-ink-800">
                    {readList(assignment.senior.languages).join(', ') || '—'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
