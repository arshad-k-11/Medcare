import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Pagination,
  Stat,
  StatusPill,
  Table,
  Td,
} from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { leadFunnel, periodFromDays } from '@/lib/queries/analytics';
import { formatDate, relativeTime } from '@/lib/format';
import { leadStatus, urgency as urgencyDisplay } from '@/lib/status';
import {
  JOURNEY_LABELS,
  LEAD_PIPELINE,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  PAGE_SIZE_DEFAULT,
  URGENCIES,
  label,
} from '@/lib/constants';
import { firstContactSlaHours } from '@/lib/services/recommendation';
import type { Urgency } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Lead pipeline',
  robots: { index: false, follow: false },
};

/**
 * The CRM pipeline.
 *
 * A table rather than a kanban board: ops staff scan rows and need to sort by how long
 * somebody has been waiting, which a column of cards makes harder, not easier. The pipeline
 * counts along the top give the board-like overview without costing the scannability.
 */
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);
  const params = await searchParams;

  const status = typeof params.status === 'string' ? params.status : undefined;
  const urgencyFilter = typeof params.urgency === 'string' ? params.urgency : undefined;
  const search = typeof params.q === 'string' ? params.q.trim() : '';
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = PAGE_SIZE_DEFAULT;

  const where = {
    ...(status && LEAD_STATUSES.includes(status as never) ? { status } : {}),
    ...(urgencyFilter && URGENCIES.includes(urgencyFilter as never)
      ? { urgency: urgencyFilter }
      : {}),
    ...(search
      ? {
          OR: [
            { contactName: { contains: search } },
            { reference: { contains: search.toUpperCase() } },
            { area: { contains: search } },
            { contactPhone: { contains: search } },
          ],
        }
      : {}),
  };

  const [leads, total, funnel] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        owner: { select: { name: true } },
        source: { select: { label: true } },
        recommendedPackage: { select: { name: true } },
      },
    }),
    prisma.lead.count({ where }),
    leadFunnel(periodFromDays(90)),
  ]);

  const buildHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (urgencyFilter) query.set('urgency', urgencyFilter);
    if (search) query.set('q', search);
    query.set('page', String(nextPage));
    return `/app/admin/leads?${query.toString()}`;
  };

  const now = Date.now();

  return (
    <div>
      <PageHeader
        title="Lead pipeline"
        description="Every enquiry, from first contact to won or lost."
        breadcrumb={[{ href: '/app/admin', label: 'Operations' }]}
      />

      {/* Pipeline counts, each a filter link. */}
      <nav aria-label="Pipeline stages" className="mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {LEAD_PIPELINE.map((stage) => (
          <Link
            key={stage}
            href={`/app/admin/leads?status=${stage}`}
            className={`rounded-card border px-3 py-3 text-center transition-colors ${
              status === stage
                ? 'border-brand-600 bg-brand-50'
                : 'border-[color:var(--border)] bg-white hover:border-brand-300'
            }`}
          >
            <p className="text-2xl font-semibold tabular-nums text-ink-900">
              {funnel[stage] ?? 0}
            </p>
            <p className="mt-0.5 text-xs font-medium text-ink-600">
              {label(LEAD_STATUS_LABELS, stage)}
            </p>
          </Link>
        ))}
      </nav>

      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        <Stat label="Won (90 days)" value={funnel.WON ?? 0} tone="success" href="/app/admin/leads?status=WON" />
        <Stat label="Lost (90 days)" value={funnel.LOST ?? 0} href="/app/admin/leads?status=LOST" />
      </div>

      <Card className="mb-4">
        <form className="flex flex-wrap gap-3 px-5 py-4" method="get">
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Name, reference, phone or area"
            aria-label="Search leads"
            className="tap-target min-w-[14rem] flex-1 rounded-[10px] border border-ink-300 px-3.5 text-[0.9375rem]"
          />
          <select
            name="status"
            defaultValue={status ?? ''}
            aria-label="Filter by status"
            className="tap-target rounded-[10px] border border-ink-300 px-3 text-[0.9375rem]"
          >
            <option value="">Any status</option>
            {LEAD_STATUSES.map((option) => (
              <option key={option} value={option}>
                {label(LEAD_STATUS_LABELS, option)}
              </option>
            ))}
          </select>
          <select
            name="urgency"
            defaultValue={urgencyFilter ?? ''}
            aria-label="Filter by urgency"
            className="tap-target rounded-[10px] border border-ink-300 px-3 text-[0.9375rem]"
          >
            <option value="">Any urgency</option>
            {URGENCIES.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, ' ').toLowerCase()}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="tap-target rounded-[10px] bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Filter
          </button>
          {status || urgencyFilter || search ? (
            <Link
              href="/app/admin/leads"
              className="tap-target inline-flex items-center rounded-[10px] px-3 text-sm font-medium text-ink-600 hover:bg-ink-100"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </Card>

      <Card>
        <CardHeader title={`${total} enquir${total === 1 ? 'y' : 'ies'}`} />
        {leads.length ? (
          <>
            <Table
              caption="Leads"
              head={['Contact', 'Need', 'Urgency', 'Status', 'Owner', 'Follow-up']}
            >
              {leads.map((lead) => {
                const slaMs = firstContactSlaHours(lead.urgency as Urgency) * 3_600_000;
                const late = lead.status === 'NEW' && now - lead.createdAt.getTime() > slaMs;
                return (
                  <tr key={lead.id}>
                    <Td>
                      <Link
                        href={`/app/admin/leads/${lead.id}`}
                        className="font-semibold text-brand-800 hover:underline"
                      >
                        {lead.contactName}
                      </Link>
                      <span className="mt-0.5 block text-xs text-ink-500">
                        {lead.reference} · {lead.area ?? 'area not given'} ·{' '}
                        {label(JOURNEY_LABELS, lead.journey)}
                      </span>
                    </Td>
                    <Td className="max-w-xs">
                      <span className="line-clamp-2 text-ink-700">
                        {lead.careNeedSummary ?? '—'}
                      </span>
                      {lead.recommendedPackage ? (
                        <span className="mt-1 block text-xs text-ink-500">
                          Suggested: {lead.recommendedPackage.name}
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <StatusPill {...urgencyDisplay(lead.urgency)} />
                      {late ? (
                        <span className="mt-1 block">
                          <Badge tone="danger">Past target</Badge>
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <StatusPill {...leadStatus(lead.status)} />
                      <span className="mt-1 block text-xs text-ink-500">
                        {relativeTime(lead.createdAt)}
                      </span>
                    </Td>
                    <Td>{lead.owner?.name ?? <span className="text-ink-500">Unassigned</span>}</Td>
                    <Td className="whitespace-nowrap">
                      {lead.followUpAt ? (
                        <span
                          className={
                            lead.followUpAt < new Date() ? 'font-semibold text-danger' : 'text-ink-700'
                          }
                        >
                          {formatDate(lead.followUpAt)}
                        </span>
                      ) : (
                        <span className="text-ink-500">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
            <Pagination
              page={page}
              totalPages={Math.max(1, Math.ceil(total / pageSize))}
              total={total}
              buildHref={buildHref}
            />
          </>
        ) : (
          <EmptyState
            title="No enquiries match these filters"
            description="Try clearing the filters, or check a different status."
            action={
              <Link
                href="/app/admin/leads"
                className="text-sm font-semibold text-brand-700 hover:underline"
              >
                Clear filters
              </Link>
            }
          />
        )}
      </Card>
    </div>
  );
}
