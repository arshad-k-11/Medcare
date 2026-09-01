import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CalendarPlus,
  FileUp,
  MessageSquare,
  Phone,
  Receipt,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  DescriptionList,
  EmptyState,
  PageHeader,
  StatusPill,
} from '@/components/ui';
import { TodayStatus } from '@/components/family/today-status';
import { TimelineFeed } from '@/components/family/timeline-feed';
import { SeniorSwitcher } from '@/components/family/senior-switcher';
import { requirePageUser } from '@/lib/auth-guard';
import {
  familyTimeline,
  resolveSelectedSenior,
  todayStatus,
  upcomingForSenior,
} from '@/lib/queries/family';
import { formatDate, formatDateTime, formatInTimezone, formatName } from '@/lib/format';
import { readList } from '@/lib/json-list';
import { seniorStatus, verificationStatus } from '@/lib/status';
import { VISIT_KIND_LABELS, label } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { audit } from '@/lib/audit';

export const metadata: Metadata = {
  title: 'Your family dashboard',
  robots: { index: false, follow: false },
};

export default async function FamilyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser(['FAMILY']);
  const params = await searchParams;
  const requested = typeof params.senior === 'string' ? params.senior : undefined;

  const { seniors, selectedId } = await resolveSelectedSenior(user, requested);

  if (!selectedId) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title={`Welcome, ${user.name.split(' ')[0]}`}
          description="You do not have anyone linked to your account yet."
        />
        <Card>
          <EmptyState
            title="Add the person you are arranging care for"
            description="Once they are added we can arrange a free home assessment, and this dashboard will show who is providing care, what happened today and what is scheduled next."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink href="/app/family/seniors/new">Add a senior</ButtonLink>
                <ButtonLink href="/get-assessment" variant="outline">
                  Book a free assessment
                </ButtonLink>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  const senior = seniors.find((row) => row.id === selectedId)!;
  const [status, timeline, upcoming, familyProfile] = await Promise.all([
    todayStatus(senior.id),
    familyTimeline(senior.id, 14),
    upcomingForSenior(senior.id, 4),
    prisma.familyProfile.findUnique({
      where: { id: user.familyProfileId ?? '' },
      select: { isNri: true, user: { select: { timezone: true } } },
    }),
  ]);

  // Reading a patient's dashboard is a PHI read and is recorded as one.
  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'patient.dashboard.read',
    entity: 'Senior',
    entityId: senior.id,
    seniorId: senior.id,
  });

  const plan = senior.carePlans[0];
  const primaryAssignment =
    senior.assignments.find((assignment) => assignment.role === 'PRIMARY') ?? senior.assignments[0];
  const needsReplacement = senior.assignments.some(
    (assignment) => assignment.status === 'NEEDS_REPLACEMENT',
  );
  const isNri = familyProfile?.isNri ?? false;
  const familyTimezone = familyProfile?.user.timezone ?? 'Asia/Kolkata';

  return (
    <div>
      <PageHeader
        title={`${formatName(senior)}, ${senior.ageYears ?? '—'}`}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{senior.serviceArea?.name ?? senior.area}</span>
            <StatusPill {...seniorStatus(senior.status)} />
            {plan ? (
              <span className="text-ink-500">
                {plan.package?.name ?? plan.title} · plan v{plan.version}
              </span>
            ) : null}
          </span>
        }
        action={
          <SeniorSwitcher
            seniors={seniors.map((row) => ({
              id: row.id,
              firstName: row.firstName,
              lastName: row.lastName,
            }))}
            selectedId={senior.id}
          />
        }
      />

      {needsReplacement ? (
        <Alert
          tone="warning"
          title="A caregiver change is being arranged"
          icon={<TriangleAlert className="h-4 w-4" />}
          className="mb-6"
        >
          <p>
            The assigned caregiver is currently unavailable. Our operations team is arranging cover
            and will confirm who is coming before the next visit. You do not need to do anything.
          </p>
          <Link
            href="/app/family/messages"
            className="mt-2 inline-block font-semibold text-brand-800 underline"
          >
            Message the care team
          </Link>
        </Alert>
      ) : null}

      {/* Quick actions. Every one of these goes somewhere real. */}
      <nav aria-label="Quick actions" className="mb-6">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { href: '/app/family/support', label: 'Call coordinator', icon: Phone },
            { href: '/app/family/support#request', label: 'Request support', icon: MessageSquare },
            { href: '/app/family/appointments', label: 'Book a visit', icon: CalendarPlus },
            { href: '/app/family/documents', label: 'Upload document', icon: FileUp },
            { href: '/app/family/updates', label: 'Care report', icon: UserRound },
            { href: '/app/family/billing', label: 'Make a payment', icon: Receipt },
          ].map((action) => (
            <li key={action.label}>
              <Link
                href={action.href}
                className="tap-target flex h-full flex-col items-center justify-center gap-1.5 rounded-card border border-[color:var(--border)] bg-white px-2 py-3 text-center text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-800"
              >
                <action.icon className="h-5 w-5 text-brand-700" aria-hidden="true" />
                {action.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <TodayStatus {...status} />

          <Card>
            <CardHeader
              title="Care updates"
              description="Everything recorded in the last fortnight."
              action={
                <ButtonLink href="/app/family/updates" variant="outline" size="sm">
                  See all
                </ButtonLink>
              }
            />
            <div className="px-5 py-4">
              <TimelineFeed entries={timeline} limit={12} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Who is providing care — the question families ask most. */}
          <Card>
            <CardHeader title="Your care team" />
            <div className="space-y-4 px-5 py-4">
              {primaryAssignment ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Caregiver
                  </p>
                  <p className="mt-1 font-semibold text-ink-900">
                    {primaryAssignment.caregiver.user.name}
                  </p>
                  <p className="text-sm text-ink-600">
                    {readList(primaryAssignment.caregiver.languages).join(', ') || 'Languages not recorded'}
                  </p>
                  <p className="mt-1.5">
                    <StatusPill
                      {...verificationStatus(primaryAssignment.caregiver.verificationStatus)}
                    />
                  </p>
                  {primaryAssignment.shiftStart ? (
                    <p className="mt-2 text-sm text-ink-600">
                      Usually {primaryAssignment.shiftStart}–{primaryAssignment.shiftEnd}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-ink-600">
                  No caregiver assigned yet. This happens after the assessment and the care plan.
                </p>
              )}

              {senior.supervisingNurse ? (
                <div className="border-t border-[color:var(--border)] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    {senior.supervisingNurse.isCareCoordinator
                      ? 'Care coordinator'
                      : 'Nurse supervisor'}
                  </p>
                  <p className="mt-1 font-semibold text-ink-900">
                    {senior.supervisingNurse.user.name}
                  </p>
                  <p className="text-sm text-ink-600">
                    Reviews the care notes and updates the plan.
                  </p>
                </div>
              ) : null}

              <div className="border-t border-[color:var(--border)] pt-4">
                <ButtonLink href="/app/family/support" variant="outline" size="sm" fullWidth>
                  Contact the care team
                </ButtonLink>
              </div>
            </div>
          </Card>

          {plan ? (
            <Card>
              <CardHeader
                title="Current care plan"
                action={<Badge tone="brand">v{plan.version}</Badge>}
              />
              <div className="px-5 py-4">
                <p className="font-medium text-ink-900">{plan.title}</p>
                {plan.scheduleSummary ? (
                  <p className="mt-2 text-sm text-ink-600">{plan.scheduleSummary}</p>
                ) : null}
                <DescriptionList
                  className="mt-4"
                  columns={1}
                  items={[
                    {
                      label: 'Next review',
                      value: plan.reviewDate ? formatDate(plan.reviewDate) : 'To be scheduled',
                    },
                    { label: 'Plan', value: plan.package?.name ?? 'Custom plan' },
                  ]}
                />
                <p className="mt-4 text-xs leading-relaxed text-ink-500">
                  The review is a genuine decision point, including the option to reduce or stop
                  support.
                </p>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Coming up"
              action={
                <ButtonLink href="/app/family/appointments" variant="ghost" size="sm">
                  All dates
                </ButtonLink>
              }
            />
            <div className="px-5 py-4">
              {upcoming.visits.length === 0 && upcoming.appointments.length === 0 ? (
                <p className="text-sm text-ink-600">Nothing scheduled at the moment.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {upcoming.visits.map((visit) => (
                    <li key={visit.id}>
                      <p className="font-medium text-ink-900">
                        {label(VISIT_KIND_LABELS, visit.kind)}
                      </p>
                      <p className="text-ink-600">{formatDateTime(visit.scheduledStart)}</p>
                      {/* An NRI family needs both times: theirs, and their parent's. */}
                      {isNri ? (
                        <p className="text-xs text-ink-500">
                          {formatInTimezone(visit.scheduledStart, familyTimezone)} your time
                        </p>
                      ) : null}
                      <p className="text-xs text-ink-500">
                        {visit.caregiver?.user.name ?? visit.nurse?.user.name ?? 'To be assigned'}
                      </p>
                    </li>
                  ))}
                  {upcoming.appointments.map((appointment) => (
                    <li key={appointment.id}>
                      <p className="font-medium text-ink-900">{appointment.title}</p>
                      <p className="text-ink-600">{formatDateTime(appointment.scheduledAt)}</p>
                      {appointment.facility ? (
                        <p className="text-xs text-ink-500">{appointment.facility}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="If something is wrong" />
            <div className="px-5 py-4 text-sm leading-relaxed text-ink-600">
              <p>
                For a medical emergency, call emergency services or go to the nearest hospital
                first. We arrange planned care at home and are not an emergency service.
              </p>
              <p className="mt-3">
                For anything else — a concern, a complaint, a change of plan — use the support page
                and we will respond. Complaints are recorded and tracked, not absorbed into a phone
                call.
              </p>
              <ButtonLink href="/app/family/support" size="sm" className="mt-4">
                Get help
              </ButtonLink>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
