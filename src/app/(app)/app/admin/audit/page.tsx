import type { Metadata } from 'next';
import { Alert, Badge, Card, EmptyState, PageHeader, Pagination, Table, Td } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/format';
import { PAGE_SIZE_DEFAULT, ROLE_LABELS, type Role } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Audit log',
  robots: { index: false, follow: false },
};

/**
 * The audit trail.
 *
 * Records what happened and to which record — never the sensitive value. That is why the
 * metadata column is safe to display: it carries types, flags and counts, and the redaction
 * in lib/audit.ts strips anything clinical before it is written.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const action = typeof params.action === 'string' ? params.action : undefined;
  const outcome = typeof params.outcome === 'string' ? params.outcome : undefined;

  const where = {
    ...(action ? { action: { contains: action } } : {}),
    ...(outcome ? { outcome } : {}),
  };

  const [entries, total, denials] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE_DEFAULT,
      take: PAGE_SIZE_DEFAULT,
      include: { actor: { select: { name: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({
      where: {
        outcome: { in: ['DENIED', 'FAILURE'] },
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
    }),
  ]);

  const buildHref = (next: number) => {
    const query = new URLSearchParams();
    if (action) query.set('action', action);
    if (outcome) query.set('outcome', outcome);
    query.set('page', String(next));
    return `/app/admin/audit?${query.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Audit log"
        description={`${total} recorded actions`}
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
      />

      <Alert tone="info" title="What is recorded here" className="mb-6">
        <p>
          Every entry records who did what, to which record, and when — but never the sensitive
          value itself. Metadata is passed through the same redaction as our application logs, so
          an accidental clinical note cannot leak into the audit table.
        </p>
        {denials > 0 ? (
          <p className="mt-2">
            {denials} denied or failed action{denials === 1 ? '' : 's'} in the last week. Worth a
            look if that number is unusual.
          </p>
        ) : null}
      </Alert>

      <Card className="mb-4">
        <form className="flex flex-wrap gap-3 px-5 py-4" method="get">
          <input
            type="search"
            name="action"
            defaultValue={action}
            placeholder="Filter by action, e.g. patient.read"
            aria-label="Filter by action"
            className="tap-target min-w-[16rem] flex-1 rounded-[10px] border border-ink-300 px-3.5 text-[0.9375rem]"
          />
          <select
            name="outcome"
            defaultValue={outcome ?? ''}
            aria-label="Filter by outcome"
            className="tap-target rounded-[10px] border border-ink-300 px-3 text-[0.9375rem]"
          >
            <option value="">Any outcome</option>
            <option value="SUCCESS">Success</option>
            <option value="DENIED">Denied</option>
            <option value="FAILURE">Failure</option>
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
        {entries.length ? (
          <>
            <Table caption="Audit log" head={['When', 'Who', 'Action', 'Record', 'Outcome', 'Detail']}>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <Td className="whitespace-nowrap text-ink-600">
                    {formatDateTime(entry.createdAt)}
                  </Td>
                  <Td>
                    {entry.actor?.name ?? <span className="text-ink-500">System</span>}
                    {entry.actorRole ? (
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {ROLE_LABELS[entry.actorRole as Role] ?? entry.actorRole}
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs text-ink-800">
                      {entry.action}
                    </code>
                  </Td>
                  <Td className="text-ink-600">
                    {entry.entity}
                    {entry.entityId ? (
                      <span className="mt-0.5 block font-mono text-xs text-ink-400">
                        {entry.entityId.slice(-8)}
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        entry.outcome === 'SUCCESS'
                          ? 'success'
                          : entry.outcome === 'DENIED'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {entry.outcome.toLowerCase()}
                    </Badge>
                  </Td>
                  <Td className="max-w-xs">
                    {entry.metadata ? (
                      <code className="block truncate text-xs text-ink-500">{entry.metadata}</code>
                    ) : (
                      '—'
                    )}
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
          <EmptyState title="No audit entries match these filters" />
        )}
      </Card>
    </div>
  );
}
