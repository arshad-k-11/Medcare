import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Badge,
  Card,
  CardHeader,
  DescriptionList,
  EmptyState,
  PageHeader,
  StatusPill,
} from '@/components/ui';
import { LeadWorkspace } from '@/components/admin/lead-workspace';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDate, formatDateTime, formatName, formatPhone, relativeTime } from '@/lib/format';
import { readList } from '@/lib/json-list';
import { assessmentStatus, leadStatus, urgency as urgencyDisplay } from '@/lib/status';
import {
  BUDGET_BAND_LABELS,
  CONTACT_CHANNEL_LABELS,
  JOURNEY_LABELS,
  SITUATION_LABELS,
  label,
  titleise,
} from '@/lib/constants';
import { firstContactSlaHours } from '@/lib/services/recommendation';
import type { Urgency } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Enquiry',
  robots: { index: false, follow: false },
};

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageUser(['ADMIN', 'OPS_MANAGER']);
  const { id } = await params;

  const [lead, staff, packages] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true } },
        source: { select: { label: true } },
        recommendedPackage: { select: { id: true, name: true, slug: true } },
        senior: { select: { id: true, firstName: true, lastName: true, status: true, area: true } },
        familyProfile: { include: { user: { select: { name: true, email: true, phone: true } } } },
        partner: { select: { id: true, organisationName: true, partnerType: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { name: true } } },
        },
        assessments: { orderBy: { createdAt: 'desc' }, include: { nurse: { select: { user: { select: { name: true } } } } } },
        crmTasks: { orderBy: { dueAt: 'asc' }, include: { assignee: { select: { name: true } } } },
        referral: { select: { reference: true, status: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'OPS_MANAGER'] }, status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.carePackage.findMany({
      where: { isPublished: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  if (!lead) notFound();

  const slaHours = firstContactSlaHours(lead.urgency as Urgency);
  const late =
    lead.status === 'NEW' && Date.now() - lead.createdAt.getTime() > slaHours * 3_600_000;
  const situations = readList(lead.situations);
  const openTasks = lead.crmTasks.filter((task) => task.status === 'OPEN');

  return (
    <div>
      <PageHeader
        title={lead.contactName}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{lead.reference}</span>
            <StatusPill {...leadStatus(lead.status)} />
            <StatusPill {...urgencyDisplay(lead.urgency)} />
            {late ? <Badge tone="danger">Past the {slaHours}h contact target</Badge> : null}
          </span>
        }
        breadcrumb={[
          { href: '/app/admin', label: 'Operations' },
          { href: '/app/admin/leads', label: 'Leads' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="What they told us" />
            <div className="space-y-4 px-5 py-4">
              {lead.careNeedSummary ? (
                <p className="text-[1.0625rem] leading-relaxed text-ink-800">
                  {lead.careNeedSummary}
                </p>
              ) : null}

              {situations.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Situation
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {situations.map((situation) => (
                      <li key={situation}>
                        <Badge tone="neutral">{label(SITUATION_LABELS, situation)}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {lead.notes ? (
                <div className="rounded-card bg-sand-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Their notes
                  </p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-800">{lead.notes}</p>
                </div>
              ) : null}

              <DescriptionList
                columns={2}
                items={[
                  { label: 'Phone', value: formatPhone(lead.contactPhone) },
                  { label: 'Email', value: lead.contactEmail ?? '—' },
                  { label: 'Relationship', value: lead.relationship ? titleise(lead.relationship) : '—' },
                  {
                    label: 'Prefers',
                    value: label(CONTACT_CHANNEL_LABELS, lead.preferredChannel),
                  },
                  {
                    label: 'Where they are',
                    value: [lead.contactCity, lead.contactCountry].filter(Boolean).join(', ') || '—',
                  },
                  { label: 'Patient area', value: lead.area ?? '—' },
                  { label: 'Journey', value: label(JOURNEY_LABELS, lead.journey) },
                  { label: 'Source', value: lead.source?.label ?? '—' },
                  { label: 'Budget', value: label(BUDGET_BAND_LABELS, lead.budgetBand) },
                  {
                    label: 'Suggested plan',
                    value: lead.recommendedPackage ? (
                      <Link
                        href={`/care-packages/${lead.recommendedPackage.slug}`}
                        className="text-brand-800 hover:underline"
                      >
                        {lead.recommendedPackage.name}
                      </Link>
                    ) : (
                      '—'
                    ),
                  },
                ]}
              />

              {lead.lostReason ? (
                <div className="rounded-card border border-[color:var(--border)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Why it was lost
                  </p>
                  <p className="mt-1 text-[0.9375rem] text-ink-800">{lead.lostReason}</p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="History"
              description="Every call, message and stage change, in order."
            />
            {lead.activities.length ? (
              <ol className="divide-y divide-[color:var(--border)]">
                {lead.activities.map((activity) => (
                  <li key={activity.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={activity.type === 'STATUS_CHANGE' ? 'brand' : 'neutral'}>
                        {titleise(activity.type)}
                      </Badge>
                      <span className="text-xs text-ink-500">
                        {formatDateTime(activity.createdAt)} ({relativeTime(activity.createdAt)})
                      </span>
                    </div>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-800">
                      {activity.summary}
                    </p>
                    {activity.outcome ? (
                      <p className="mt-1 text-sm text-ink-600">
                        <span className="font-medium">Outcome: </span>
                        {activity.outcome}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-ink-500">
                      {activity.actor?.name ?? 'System'}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="Nothing logged yet" description="Log the first call using the panel alongside." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <LeadWorkspace
            leadId={lead.id}
            status={lead.status}
            urgency={lead.urgency}
            budgetBand={lead.budgetBand}
            ownerUserId={lead.ownerUserId}
            followUpAt={lead.followUpAt?.toISOString() ?? null}
            staff={staff}
            packages={packages}
            recommendedPackageId={lead.recommendedPackageId}
          />

          {lead.senior ? (
            <Card>
              <CardHeader title="Linked patient" />
              <div className="px-5 py-4 text-sm">
                <Link
                  href={`/app/admin/patients/${lead.senior.id}`}
                  className="font-semibold text-brand-800 hover:underline"
                >
                  {formatName(lead.senior)}
                </Link>
                <p className="mt-1 text-ink-600">
                  {lead.senior.area} · {titleise(lead.senior.status)}
                </p>
              </div>
            </Card>
          ) : null}

          {lead.familyProfile ? (
            <Card>
              <CardHeader title="Family account" />
              <div className="px-5 py-4 text-sm">
                <p className="font-semibold text-ink-900">{lead.familyProfile.user.name}</p>
                <p className="text-ink-600">{lead.familyProfile.user.email ?? '—'}</p>
                <p className="text-ink-600">{formatPhone(lead.familyProfile.user.phone)}</p>
                {lead.familyProfile.isNri ? (
                  <p className="mt-1">
                    <Badge tone="info">Outside India</Badge>
                  </p>
                ) : null}
                {lead.familyProfile.bestTimeToCall ? (
                  <p className="mt-2 text-ink-600">
                    Best time to call: {lead.familyProfile.bestTimeToCall}
                  </p>
                ) : null}
              </div>
            </Card>
          ) : null}

          {lead.partner ? (
            <Card>
              <CardHeader title="Referred by" />
              <div className="px-5 py-4 text-sm">
                <p className="font-semibold text-ink-900">{lead.partner.organisationName}</p>
                <p className="text-ink-600">{titleise(lead.partner.partnerType)}</p>
                {lead.referral ? (
                  <p className="mt-1 text-ink-600">
                    Referral {lead.referral.reference} · {titleise(lead.referral.status)}
                  </p>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Assessments" />
            {lead.assessments.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {lead.assessments.map((assessment) => (
                  <li key={assessment.id} className="px-5 py-3 text-sm">
                    <StatusPill {...assessmentStatus(assessment.status)} />
                    <p className="mt-1.5 text-ink-700">
                      {assessment.scheduledAt
                        ? `Scheduled ${formatDateTime(assessment.scheduledAt)}`
                        : assessment.requestedFor
                          ? `Requested for ${formatDate(assessment.requestedFor)}`
                          : 'Not scheduled'}
                    </p>
                    {assessment.nurse ? (
                      <p className="text-xs text-ink-500">{assessment.nurse.user.name}</p>
                    ) : (
                      <p className="text-xs text-warning">No nurse assigned</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No assessment yet" />
            )}
          </Card>

          {openTasks.length ? (
            <Card>
              <CardHeader title="Open follow-ups" />
              <ul className="divide-y divide-[color:var(--border)]">
                {openTasks.map((task) => (
                  <li key={task.id} className="px-5 py-3 text-sm">
                    <p className="font-medium text-ink-900">{task.title}</p>
                    <p
                      className={
                        task.dueAt < new Date() ? 'font-medium text-danger' : 'text-ink-600'
                      }
                    >
                      {formatDateTime(task.dueAt)} · {task.assignee.name}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
