import type { Metadata } from 'next';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Table, Td } from '@/components/ui';
import { LeaveRequestForm } from '@/components/caregiver/leave-request-form';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Leave',
  robots: { index: false, follow: false },
};

export default async function CaregiverLeavePage() {
  const user = await requirePageUser(['CAREGIVER']);

  const requests = await prisma.leaveRequest.findMany({
    where: { caregiverId: user.caregiverProfileId ?? '' },
    orderBy: { fromDate: 'desc' },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Leave"
        description="Request time off. Arranging cover is operations' job, not yours."
        breadcrumb={[{ href: '/app/caregiver', label: 'Today' }]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <LeaveRequestForm />

        <Card>
          <CardHeader title="Your requests" />
          {requests.length ? (
            <Table caption="Leave requests" head={['Dates', 'Type', 'Status', 'Note']}>
              {requests.map((request) => (
                <tr key={request.id}>
                  <Td className="whitespace-nowrap">
                    {formatDate(request.fromDate)} – {formatDate(request.toDate)}
                  </Td>
                  <Td>{titleise(request.type)}</Td>
                  <Td>
                    <Badge
                      tone={
                        request.status === 'APPROVED'
                          ? 'success'
                          : request.status === 'REJECTED'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {titleise(request.status)}
                    </Badge>
                  </Td>
                  <Td className="text-ink-600">{request.decisionNote ?? request.reason}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <EmptyState
              title="No leave requests yet"
              description="Requests you make appear here with their status."
            />
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="How leave works here" />
        <div className="px-5 py-4 text-[0.9375rem] leading-relaxed text-ink-600">
          <p>
            Planned leave: please give as much notice as you can, so cover can be arranged for the
            same days rather than at the last minute.
          </p>
          <p className="mt-3">
            Sick or emergency leave: request it and call operations. Do not attend a visit while
            unwell — an infection carried into an elderly person&rsquo;s home is far worse than a
            missed visit.
          </p>
          <p className="mt-3">
            Once leave is approved, you will not be offered replacement shifts during it. That is
            deliberate — approved leave is leave.
          </p>
        </div>
      </Card>
    </div>
  );
}
