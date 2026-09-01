import type { Metadata } from 'next';
import { Alert, PageHeader } from '@/components/ui';
import { ReviewQueue } from '@/components/nurse/review-queue';
import { requirePageUser } from '@/lib/auth-guard';
import { reviewQueue } from '@/lib/queries/nurse';
import { formatName } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Review queue',
  robots: { index: false, follow: false },
};

export default async function NurseReviewsPage() {
  const user = await requirePageUser(['NURSE', 'ADMIN', 'OPS_MANAGER']);
  const { notes, vitals } = await reviewQueue(user);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Review queue"
        description="Oldest first. A flagged item is the platform asking for your judgement, not offering one."
        breadcrumb={[{ href: '/app/nurse', label: 'Overview' }]}
      />

      <Alert tone="info" title="What a flag means" className="mb-6">
        <p>
          A reading appears here because it fell outside the range configured for that patient.
          That is a routing decision, not a clinical one — the platform has drawn no conclusion,
          and nothing has been said to the family beyond that a nurse will look at it.
        </p>
      </Alert>

      <ReviewQueue
        notes={notes.map((note) => ({
          id: note.id,
          type: note.type,
          body: note.body,
          createdAt: note.createdAt.toISOString(),
          authorName: note.author.name,
          seniorId: note.senior.id,
          seniorName: formatName(note.senior),
          area: note.senior.area,
        }))}
        vitals={vitals.map((vital) => ({
          id: vital.id,
          type: vital.type,
          valueNumber: vital.valueNumber,
          valueSecondary: vital.valueSecondary,
          measuredAt: vital.measuredAt.toISOString(),
          note: vital.note,
          recordedByName: vital.recordedBy.name,
          seniorId: vital.senior.id,
          seniorName: formatName(vital.senior),
          area: vital.senior.area,
        }))}
      />
    </div>
  );
}
