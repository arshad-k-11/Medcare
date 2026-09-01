import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, EmptyState, PageHeader, StatusPill, Table, Td } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { seniorWhere } from '@/lib/scope';
import { formatDate, formatName } from '@/lib/format';
import { seniorStatus } from '@/lib/status';
import { readList } from '@/lib/json-list';

export const metadata: Metadata = {
  title: 'Patients',
  robots: { index: false, follow: false },
};

export default async function NursePatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser(['NURSE', 'ADMIN', 'OPS_MANAGER']);
  const params = await searchParams;
  const search = typeof params.q === 'string' ? params.q.trim() : '';

  const scope = await seniorWhere(user);
  const seniors = await prisma.senior.findMany({
    where: {
      ...scope,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { area: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
    include: {
      carePlans: {
        where: { status: 'ACTIVE' },
        orderBy: { version: 'desc' },
        take: 1,
        select: { id: true, reviewDate: true, version: true },
      },
      assignments: {
        where: { status: { in: ['ACTIVE', 'NEEDS_REPLACEMENT'] } },
        include: { caregiver: { select: { user: { select: { name: true } } } } },
      },
      _count: {
        select: {
          careNotes: { where: { requiresReview: true, reviewedAt: null } },
          vitals: { where: { flag: 'REQUIRES_REVIEW', reviewedAt: null } },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Patients"
        description={`${seniors.length} in your caseload`}
        breadcrumb={[{ href: '/app/nurse', label: 'Overview' }]}
      />

      <Card className="mb-4">
        <form className="flex flex-wrap gap-3 px-5 py-4" method="get">
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search by name or area"
            aria-label="Search patients"
            className="tap-target min-w-[16rem] flex-1 rounded-[10px] border border-ink-300 px-3.5 text-[0.9375rem]"
          />
          <button
            type="submit"
            className="tap-target rounded-[10px] bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Search
          </button>
        </form>
      </Card>

      <Card>
        {seniors.length ? (
          <Table
            caption="Patients in your caseload"
            head={['Patient', 'Area', 'Caregiver', 'Care plan', 'Waiting for you', 'Status']}
          >
            {seniors.map((senior) => {
              const waiting = senior._count.careNotes + senior._count.vitals;
              const plan = senior.carePlans[0];
              const overdue = plan?.reviewDate ? plan.reviewDate < new Date() : false;
              return (
                <tr key={senior.id}>
                  <Td>
                    <Link
                      href={`/app/nurse/patients/${senior.id}`}
                      className="font-semibold text-brand-800 hover:underline"
                    >
                      {formatName(senior)}
                    </Link>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {senior.ageYears ?? '—'} · {readList(senior.conditions).slice(0, 2).join(', ') || 'No conditions recorded'}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">{senior.area}</Td>
                  <Td>
                    {senior.assignments[0] ? (
                      <>
                        {senior.assignments[0].caregiver.user.name}
                        {senior.assignments[0].status === 'NEEDS_REPLACEMENT' ? (
                          <span className="mt-1 block">
                            <Badge tone="danger">Cover needed</Badge>
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-ink-500">Not assigned</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {plan ? (
                      <>
                        v{plan.version}
                        <span
                          className={`mt-0.5 block text-xs ${overdue ? 'font-medium text-danger' : 'text-ink-500'}`}
                        >
                          {plan.reviewDate
                            ? `${overdue ? 'Review overdue' : 'Review'} ${formatDate(plan.reviewDate)}`
                            : 'No review date'}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-500">No active plan</span>
                    )}
                  </Td>
                  <Td>
                    {waiting > 0 ? (
                      <Badge tone="warning">
                        {waiting} item{waiting === 1 ? '' : 's'}
                      </Badge>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </Td>
                  <Td>
                    <StatusPill {...seniorStatus(senior.status)} />
                  </Td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <EmptyState
            title={search ? 'No patients match that search' : 'No patients in your caseload yet'}
            description={
              search
                ? 'Try a different name or area.'
                : 'Patients appear here once you are set as their supervising nurse or you attend a visit.'
            }
          />
        )}
      </Card>
    </div>
  );
}
