import type { Metadata } from 'next';
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  DescriptionList,
  EmptyState,
  PageHeader,
  Progress,
  StatusPill,
} from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { readList } from '@/lib/json-list';
import { caregiverStatus, verificationStatus } from '@/lib/status';
import { titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'My profile',
  robots: { index: false, follow: false },
};

/**
 * The caregiver's own record, shown to them honestly — including their verification status
 * and performance score. Scoring people on numbers they cannot see is how a workforce stops
 * trusting the system.
 */
export default async function CaregiverProfilePage() {
  const user = await requirePageUser(['CAREGIVER']);

  const profile = await prisma.caregiverProfile.findUnique({
    where: { id: user.caregiverProfileId ?? '' },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      documents: { orderBy: { createdAt: 'desc' } },
      trainingRecords: { orderBy: { completedAt: 'desc' } },
      availability: { orderBy: { dayOfWeek: 'asc' } },
    },
  });

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="My profile" />
        <Card>
          <EmptyState
            title="Profile not found"
            description="Please contact operations — your staff record could not be loaded."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={profile.user.name}
        description={`Employee code ${profile.employeeCode}`}
        breadcrumb={[{ href: '/app/caregiver', label: 'Today' }]}
        action={<StatusPill {...caregiverStatus(profile.status)} />}
      />

      {profile.verificationStatus !== 'VERIFIED' ? (
        <Alert tone="warning" title="Verification not complete" className="mb-5">
          <p>
            Until every check is on file we may not assign you to some patients. If you have already
            given operations a document that is not showing here, tell them — it is worth chasing.
          </p>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Your details" />
          <div className="px-5 py-4">
            <DescriptionList
              columns={1}
              items={[
                { label: 'Verification', value: <StatusPill {...verificationStatus(profile.verificationStatus)} /> },
                { label: 'Experience', value: `${profile.experienceYears} years` },
                { label: 'Languages', value: readList(profile.languages).join(', ') || '—' },
                { label: 'Skills', value: readList(profile.skills).map(titleise).join(', ') || '—' },
                { label: 'Areas you work', value: readList(profile.preferredAreas).join(', ') || '—' },
                { label: 'Maximum patients at once', value: profile.maxConcurrentPatients },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="How we are measuring"
            description="Shown to you because you should not be scored on numbers you cannot see."
          />
          <div className="space-y-5 px-5 py-4">
            <Progress
              label="Performance score"
              value={profile.performanceScore}
              tone={profile.performanceScore >= 80 ? 'success' : profile.performanceScore >= 60 ? 'warning' : 'danger'}
            />
            <Progress
              label="Attendance"
              value={profile.attendanceRate}
              tone={profile.attendanceRate >= 90 ? 'success' : 'warning'}
            />
            <p className="text-sm leading-relaxed text-ink-600">
              These come from visit completion, punctuality and family feedback. If a number looks
              wrong to you, raise it — it affects which assignments you are offered, so it matters
              that it is accurate.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Documents on file" />
          {profile.documents.length ? (
            <ul className="divide-y divide-[color:var(--border)]">
              {profile.documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{document.label}</p>
                    <p className="text-xs text-ink-500">{titleise(document.category)}</p>
                  </div>
                  <Badge tone={document.verifiedAt ? 'success' : 'warning'}>
                    {document.verifiedAt ? `Verified ${formatDate(document.verifiedAt)}` : 'Awaiting check'}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No documents on file"
              description="Operations will ask you for identity, address and police verification."
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Training" />
          {profile.trainingRecords.length ? (
            <ul className="divide-y divide-[color:var(--border)]">
              {profile.trainingRecords.map((record) => (
                <li key={record.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-900">{record.courseName}</p>
                    <p className="text-xs text-ink-500">
                      Completed {formatDate(record.completedAt)}
                    </p>
                  </div>
                  {record.score != null ? <Badge tone="brand">{record.score}%</Badge> : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No training recorded yet"
              description="Internal training is paid and recorded here once completed."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
