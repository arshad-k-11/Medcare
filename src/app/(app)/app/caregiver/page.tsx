import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarOff, Clock, MapPin, Phone, TriangleAlert } from 'lucide-react';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatusPill,
} from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { todayRange } from '@/lib/queries/family';
import { formatDate, formatTime, formatName } from '@/lib/format';
import { visitStatus, verificationStatus } from '@/lib/status';
import { VISIT_KIND_LABELS, label } from '@/lib/constants';

export const metadata: Metadata = {
  title: "Today's schedule",
  robots: { index: false, follow: false },
};

/**
 * The caregiver's home screen.
 *
 * Designed for a phone held one-handed, possibly outdoors, possibly by someone reading it
 * quickly between two buildings. So: one job at a time, the next action as a large button,
 * the address and phone number tappable, and the escalation route always visible rather
 * than hidden behind a menu.
 */
export default async function CaregiverTodayPage() {
  const user = await requirePageUser(['CAREGIVER']);
  const { start, end } = todayRange();

  const [profile, todayVisits, upcomingCount, openLeave] = await Promise.all([
    prisma.caregiverProfile.findUnique({
      where: { id: user.caregiverProfileId ?? '' },
      select: {
        id: true,
        employeeCode: true,
        status: true,
        verificationStatus: true,
        performanceScore: true,
      },
    }),
    prisma.visit.findMany({
      where: {
        caregiverId: user.caregiverProfileId ?? '',
        scheduledStart: { gte: start, lt: end },
      },
      orderBy: { scheduledStart: 'asc' },
      include: {
        senior: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            addressLine: true,
            area: true,
            mobility: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
          },
        },
        tasks: { orderBy: { sortOrder: 'asc' } },
      },
    }),
    prisma.visit.count({
      where: {
        caregiverId: user.caregiverProfileId ?? '',
        scheduledStart: { gte: end },
        status: 'SCHEDULED',
      },
    }),
    prisma.leaveRequest.findFirst({
      where: { caregiverId: user.caregiverProfileId ?? '', status: 'PENDING' },
      select: { id: true, fromDate: true, toDate: true },
    }),
  ]);

  const activeVisit = todayVisits.find((visit) => visit.status === 'IN_PROGRESS');
  const nextVisit = todayVisits.find((visit) => visit.status === 'SCHEDULED');
  const focus = activeVisit ?? nextVisit;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Good ${greeting()}, ${user.name.split(' ')[0]}`}
        description={formatDate(new Date())}
      />

      {profile?.verificationStatus !== 'VERIFIED' ? (
        <Alert tone="warning" title="Your verification is not complete" className="mb-5">
          <p>
            Some checks are still outstanding, so you may not be offered every assignment. Speak to
            operations if you think this is wrong.
          </p>
          <p className="mt-1">
            <StatusPill {...verificationStatus(profile?.verificationStatus)} />
          </p>
        </Alert>
      ) : null}

      {openLeave ? (
        <Alert tone="info" title="Leave request pending" className="mb-5">
          <p>
            Your request for {formatDate(openLeave.fromDate)} to {formatDate(openLeave.toDate)} is
            waiting for a decision. Keep working to your normal schedule until it is approved.
          </p>
        </Alert>
      ) : null}

      {/* The single most important thing on the screen: what to do next. */}
      {focus ? (
        <Card className="mb-5 border-brand-300 shadow-lift">
          <div className="bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white">
            {activeVisit ? 'Visit in progress' : 'Next visit'}
          </div>
          <div className="px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-ink-900">
                  {formatName(focus.senior)}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-[0.9375rem] text-ink-600">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {formatTime(focus.scheduledStart)} – {formatTime(focus.scheduledEnd)}
                </p>
                {focus.senior.addressLine ? (
                  <p className="mt-1 flex items-start gap-1.5 text-[0.9375rem] text-ink-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(focus.senior.addressLine)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-ink-300 underline-offset-2 hover:text-brand-700"
                    >
                      {focus.senior.addressLine}
                    </a>
                  </p>
                ) : null}
              </div>
              <StatusPill {...visitStatus(focus.status)} />
            </div>

            {focus.instructions ? (
              <div className="mt-4 rounded-card bg-sand-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Instructions
                </p>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-800">
                  {focus.instructions}
                </p>
              </div>
            ) : null}

            <ButtonLink
              href={`/app/caregiver/visits/${focus.id}`}
              size="xl"
              fullWidth
              className="mt-5"
            >
              {activeVisit ? 'Continue this visit' : 'Open and check in'}
            </ButtonLink>

            {focus.senior.emergencyContactPhone ? (
              <a
                href={`tel:${focus.senior.emergencyContactPhone}`}
                className="tap-target mt-3 flex items-center justify-center gap-2 rounded-[10px] border border-ink-300 text-[0.9375rem] font-semibold text-ink-800 hover:bg-ink-50"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Call family contact
              </a>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="mb-5">
        <CardHeader
          title="Today's visits"
          description={`${todayVisits.length} scheduled${upcomingCount ? ` · ${upcomingCount} more this week` : ''}`}
          action={
            <ButtonLink href="/app/caregiver/schedule" variant="outline" size="sm">
              Full schedule
            </ButtonLink>
          }
        />
        {todayVisits.length ? (
          <ul className="divide-y divide-[color:var(--border)]">
            {todayVisits.map((visit) => {
              const done = visit.tasks.filter((task) => task.status === 'DONE').length;
              return (
                <li key={visit.id}>
                  <Link
                    href={`/app/caregiver/visits/${visit.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-50"
                  >
                    <div className="w-16 shrink-0 text-center">
                      <p className="text-sm font-semibold tabular-nums text-ink-900">
                        {formatTime(visit.scheduledStart)}
                      </p>
                      <p className="text-xs text-ink-500">
                        {label(VISIT_KIND_LABELS, visit.kind).split(' ')[0]}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{formatName(visit.senior)}</p>
                      <p className="truncate text-sm text-ink-600">
                        {visit.senior.area}
                        {visit.tasks.length
                          ? ` · ${done}/${visit.tasks.length} tasks done`
                          : ''}
                      </p>
                    </div>
                    <StatusPill {...visitStatus(visit.status)} />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="Nothing scheduled today"
            description="Enjoy the break. Your next visits are on the schedule page, and operations will call if something comes up."
            action={
              <ButtonLink href="/app/caregiver/schedule" variant="outline">
                See the week
              </ButtonLink>
            }
          />
        )}
      </Card>

      {/* Escalation is always one tap away, and always says the same thing about emergencies. */}
      <Card className="border-[#f0d5aa] bg-[#fdf8ef]">
        <div className="px-5 py-5">
          <h2 className="flex items-center gap-2 font-semibold text-[#6b3d05]">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
            Something is wrong?
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#6b3d05]">
            If this is a medical emergency, call emergency services first and tell us afterwards.
            You will never be criticised for calling them.
          </p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#6b3d05]">
            For anything else — a fall, a refusal, a reading you are unsure about, a family
            concern — report it and the nurse supervisor will respond.
          </p>
          <ButtonLink href="/app/caregiver/escalate" variant="danger" size="lg" className="mt-4">
            Report an issue to the nurse
          </ButtonLink>
        </div>
      </Card>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/app/caregiver/leave"
          className="flex items-center gap-3 rounded-card border border-[color:var(--border)] bg-white px-4 py-4 text-sm font-semibold text-ink-800 hover:border-brand-300"
        >
          <CalendarOff className="h-5 w-5 text-brand-700" aria-hidden="true" />
          Request leave
        </Link>
        <Link
          href="/app/caregiver/patients"
          className="flex items-center gap-3 rounded-card border border-[color:var(--border)] bg-white px-4 py-4 text-sm font-semibold text-ink-800 hover:border-brand-300"
        >
          <Badge tone="brand">{profile?.employeeCode ?? '—'}</Badge>
          My patients
        </Link>
      </div>
    </div>
  );
}

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(new Date()),
  );
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
