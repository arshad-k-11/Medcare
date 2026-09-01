import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Stat } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDate, formatName, relativeTime } from '@/lib/format';
import { FEEDBACK_TYPE_LABELS, label, titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Feedback and complaints',
  robots: { index: false, follow: false },
};

/**
 * Feedback and complaints.
 *
 * Resolution time is computed from the records rather than reported, and complaints open
 * longer than three days are called out — a complaint that quietly ages is the thing that
 * loses a customer.
 */
export default async function AdminFeedbackPage() {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);

  const [feedback, ratings] = await Promise.all([
    prisma.feedback.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        author: { select: { name: true, role: true } },
        senior: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.feedback.aggregate({
      where: { type: 'RATING', rating: { not: null } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const complaints = feedback.filter((item) => item.type === 'COMPLAINT');
  const openComplaints = complaints.filter((item) =>
    ['OPEN', 'IN_PROGRESS'].includes(item.status),
  );

  const resolved = complaints.filter((item) => item.resolvedAt);
  const resolutionDays = resolved.map(
    (item) => (item.resolvedAt!.getTime() - item.createdAt.getTime()) / 86_400_000,
  );
  const medianResolution = resolutionDays.length
    ? resolutionDays.sort((a, b) => a - b)[Math.floor(resolutionDays.length / 2)]
    : null;

  const threeDaysAgo = Date.now() - 3 * 86_400_000;
  const ageing = openComplaints.filter((item) => item.createdAt.getTime() < threeDaysAgo);

  return (
    <div>
      <PageHeader
        title="Feedback and complaints"
        description="What families are telling us, and how long we take to act."
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Average rating"
          value={ratings._avg.rating ? ratings._avg.rating.toFixed(1) : '—'}
          hint={ratings._count._all ? `${ratings._count._all} responses` : 'No ratings yet'}
        />
        <Stat
          label="Open complaints"
          value={openComplaints.length}
          tone={openComplaints.length > 0 ? 'warning' : 'success'}
        />
        <Stat
          label="Open more than 3 days"
          value={ageing.length}
          tone={ageing.length > 0 ? 'danger' : 'success'}
        />
        <Stat
          label="Typical resolution time"
          value={medianResolution != null ? `${medianResolution.toFixed(1)} days` : '—'}
          hint={medianResolution != null ? 'Median, from the records' : 'None resolved yet'}
        />
      </div>

      <Card>
        <CardHeader title="All feedback" />
        {feedback.length ? (
          <ul className="divide-y divide-[color:var(--border)]">
            {feedback.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      item.type === 'COMPLAINT'
                        ? 'danger'
                        : item.type === 'RATING'
                          ? 'success'
                          : 'neutral'
                    }
                  >
                    {label(FEEDBACK_TYPE_LABELS, item.type)}
                  </Badge>
                  {item.rating ? <Badge tone="brand">{item.rating}/5</Badge> : null}
                  <Badge tone={item.status === 'RESOLVED' || item.status === 'CLOSED' ? 'success' : 'warning'}>
                    {titleise(item.status)}
                  </Badge>
                  {item.type === 'COMPLAINT' &&
                  ['OPEN', 'IN_PROGRESS'].includes(item.status) &&
                  item.createdAt.getTime() < threeDaysAgo ? (
                    <Badge tone="danger">Ageing</Badge>
                  ) : null}
                </div>

                {item.subject ? (
                  <p className="mt-2 font-semibold text-ink-900">{item.subject}</p>
                ) : null}
                {item.comment ? (
                  <p className="mt-1 max-w-3xl text-[0.9375rem] leading-relaxed text-ink-700">
                    {item.comment}
                  </p>
                ) : null}

                <p className="mt-1.5 text-sm text-ink-500">
                  {item.author.name} ({titleise(item.author.role)})
                  {item.senior ? (
                    <>
                      {' · '}
                      <Link
                        href={`/app/admin/patients/${item.senior.id}`}
                        className="text-brand-800 hover:underline"
                      >
                        {formatName(item.senior)}
                      </Link>
                    </>
                  ) : null}
                  {' · '}
                  {relativeTime(item.createdAt)}
                </p>

                {item.resolution ? (
                  <p className="mt-2 rounded-card bg-[#f1faf5] px-3 py-2 text-sm text-[#0d6340]">
                    <span className="font-semibold">Resolved: </span>
                    {item.resolution}
                    {item.resolvedAt ? ` (${formatDate(item.resolvedAt)})` : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No feedback yet"
            description="Ratings and complaints from families and seniors appear here."
          />
        )}
      </Card>
    </div>
  );
}
