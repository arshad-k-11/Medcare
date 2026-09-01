import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Pagination, StatusPill, Table, Td } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDate, formatName } from '@/lib/format';
import { seniorStatus } from '@/lib/status';
import { PAGE_SIZE_DEFAULT, SENIOR_STATUSES, SENIOR_STATUS_LABELS, label } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Patients',
  robots: { index: false, follow: false },
};

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);
  const params = await searchParams;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const search = typeof params.q === 'string' ? params.q.trim() : '';
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where = {
    ...(status && SENIOR_STATUSES.includes(status as never) ? { status } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { area: { contains: search } },
          ],
        }
      : {}),
  };

  const [seniors, total] = await Promise.all([
    prisma.senior.findMany({
      where,
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
      skip: (page - 1) * PAGE_SIZE_DEFAULT,
      take: PAGE_SIZE_DEFAULT,
      include: {
        supervisingNurse: { select: { user: { select: { name: true } } } },
        assignments: {
          where: { status: { in: ['ACTIVE', 'NEEDS_REPLACEMENT'] } },
          include: { caregiver: { select: { user: { select: { name: true } } } } },
        },
        familyLinks: {
          where: { isPrimaryContact: true },
          include: { familyProfile: { include: { user: { select: { name: true } } } } },
        },
        carePlans: {
          where: { status: 'ACTIVE' },
          orderBy: { version: 'desc' },
          take: 1,
          select: { reviewDate: true, version: true },
        },
      },
    }),
    prisma.senior.count({ where }),
  ]);

  const buildHref = (next: number) => {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (search) query.set('q', search);
    query.set('page', String(next));
    return `/app/admin/patients?${query.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Patients"
        description={`${total} on record`}
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
      />

      <Card className="mb-4">
        <form className="flex flex-wrap gap-3 px-5 py-4" method="get">
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Name or area"
            aria-label="Search patients"
            className="tap-target min-w-[14rem] flex-1 rounded-[10px] border border-ink-300 px-3.5 text-[0.9375rem]"
          />
          <select
            name="status"
            defaultValue={status ?? ''}
            aria-label="Filter by status"
            className="tap-target rounded-[10px] border border-ink-300 px-3 text-[0.9375rem]"
          >
            <option value="">Any status</option>
            {SENIOR_STATUSES.map((option) => (
              <option key={option} value={option}>
                {label(SENIOR_STATUS_LABELS, option)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="tap-target rounded-[10px] bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Filter
          </button>
        </form>
      </Card>

      <Card>
        {seniors.length ? (
          <>
            <Table
              caption="Patients"
              head={['Patient', 'Area', 'Family contact', 'Caregiver', 'Nurse', 'Status']}
            >
              {seniors.map((senior) => (
                <tr key={senior.id}>
                  <Td>
                    <Link
                      href={`/app/admin/patients/${senior.id}`}
                      className="font-semibold text-brand-800 hover:underline"
                    >
                      {formatName(senior)}
                    </Link>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {senior.ageYears ?? '—'}
                      {senior.carePlans[0]?.reviewDate
                        ? ` · plan review ${formatDate(senior.carePlans[0].reviewDate)}`
                        : ''}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">{senior.area}</Td>
                  <Td>
                    {senior.familyLinks[0]?.familyProfile.user.name ?? (
                      <span className="text-ink-500">None linked</span>
                    )}
                  </Td>
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
                    ) : senior.status === 'ACTIVE' ? (
                      <Badge tone="warning">Not assigned</Badge>
                    ) : (
                      <span className="text-ink-500">—</span>
                    )}
                  </Td>
                  <Td>
                    {senior.supervisingNurse?.user.name ?? (
                      <span className="text-ink-500">—</span>
                    )}
                  </Td>
                  <Td>
                    <StatusPill {...seniorStatus(senior.status)} />
                  </Td>
                </tr>
              ))}
            </Table>
            <Pagination
              page={page}
              totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE_DEFAULT))}
              total={total}
              buildHref={buildHref}
            />
          </>
        ) : (
          <EmptyState title="No patients match these filters" />
        )}
      </Card>
    </div>
  );
}
