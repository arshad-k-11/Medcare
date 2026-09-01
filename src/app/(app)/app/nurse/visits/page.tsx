import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, CardHeader, EmptyState, PageHeader, StatusPill, Table, Td } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { seniorIdWhere } from '@/lib/scope';
import { formatDateTime, formatName } from '@/lib/format';
import { visitStatus } from '@/lib/status';
import { VISIT_KIND_LABELS, label } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Visits',
  robots: { index: false, follow: false },
};

/** Visits across the caseload, with at-risk and missed visits pulled to the top. */
export default async function NurseVisitsPage() {
  const user = await requirePageUser(['NURSE', 'ADMIN', 'OPS_MANAGER']);
  const where = await seniorIdWhere(user);

  const from = new Date(Date.now() - 7 * 86_400_000);
  const to = new Date(Date.now() + 14 * 86_400_000);

  const [attention, upcoming] = await Promise.all([
    prisma.visit.findMany({
      where: {
        ...where,
        OR: [{ status: 'MISSED', scheduledStart: { gte: from } }, { atRisk: true }],
      },
      orderBy: { scheduledStart: 'asc' },
      include: {
        senior: { select: { id: true, firstName: true, lastName: true, area: true } },
        caregiver: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.visit.findMany({
      where: { ...where, scheduledStart: { gte: new Date(), lt: to }, status: 'SCHEDULED' },
      orderBy: { scheduledStart: 'asc' },
      take: 50,
      include: {
        senior: { select: { id: true, firstName: true, lastName: true, area: true } },
        caregiver: { select: { user: { select: { name: true } } } },
        nurse: { select: { user: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Visits"
        description="Anything missed or at risk first, then what is scheduled."
        breadcrumb={[{ href: '/app/nurse', label: 'Overview' }]}
      />

      <Card className="mb-6">
        <CardHeader
          title="Needs attention"
          description="Missed in the last week, or scheduled without confirmed cover."
          action={<Badge tone={attention.length ? 'danger' : 'success'}>{attention.length}</Badge>}
        />
        {attention.length ? (
          <Table caption="Visits needing attention" head={['When', 'Patient', 'Caregiver', 'Status']}>
            {attention.map((visit) => (
              <tr key={visit.id}>
                <Td className="whitespace-nowrap">{formatDateTime(visit.scheduledStart)}</Td>
                <Td>
                  <Link
                    href={`/app/nurse/patients/${visit.senior.id}`}
                    className="font-medium text-brand-800 hover:underline"
                  >
                    {formatName(visit.senior)}
                  </Link>
                  <span className="mt-0.5 block text-xs text-ink-500">{visit.senior.area}</span>
                </Td>
                <Td>
                  {visit.caregiver?.user.name ?? <span className="text-danger">Not assigned</span>}
                </Td>
                <Td>
                  <StatusPill {...visitStatus(visit.status)} />
                  {visit.atRisk ? (
                    <span className="mt-1 block">
                      <Badge tone="warning">Cover needed</Badge>
                    </span>
                  ) : null}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState
            title="Nothing needs attention"
            description="No missed visits this week and every scheduled visit has cover."
          />
        )}
      </Card>

      <Card>
        <CardHeader title="Scheduled" description="Next two weeks across your caseload." />
        {upcoming.length ? (
          <Table caption="Scheduled visits" head={['When', 'Patient', 'Type', 'Who']}>
            {upcoming.map((visit) => (
              <tr key={visit.id}>
                <Td className="whitespace-nowrap">{formatDateTime(visit.scheduledStart)}</Td>
                <Td>
                  <Link
                    href={`/app/nurse/patients/${visit.senior.id}`}
                    className="font-medium text-brand-800 hover:underline"
                  >
                    {formatName(visit.senior)}
                  </Link>
                </Td>
                <Td>{label(VISIT_KIND_LABELS, visit.kind)}</Td>
                <Td>
                  {visit.caregiver?.user.name ?? visit.nurse?.user.name ?? (
                    <span className="text-ink-500">To be assigned</span>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <EmptyState title="Nothing scheduled in the next two weeks" />
        )}
      </Card>
    </div>
  );
}
