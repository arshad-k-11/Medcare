import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui';
import { EscalateForm } from '@/components/caregiver/escalate-form';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatName } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Report an issue',
  robots: { index: false, follow: false },
};

export default async function CaregiverEscalatePage() {
  const user = await requirePageUser(['CAREGIVER']);

  const assignments = await prisma.caregiverAssignment.findMany({
    where: {
      caregiverId: user.caregiverProfileId ?? '',
      status: { in: ['ACTIVE', 'PROPOSED', 'NEEDS_REPLACEMENT'] },
    },
    include: { senior: { select: { id: true, firstName: true, lastName: true } } },
  });

  // De-duplicate: a caregiver can hold more than one assignment for the same patient.
  const patients = [
    ...new Map(
      assignments.map((assignment) => [
        assignment.senior.id,
        { id: assignment.senior.id, name: formatName(assignment.senior) },
      ]),
    ).values(),
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Report an issue"
        breadcrumb={[{ href: '/app/caregiver', label: "Today's schedule" }]}
      />
      <EscalateForm patients={patients} />
    </div>
  );
}
