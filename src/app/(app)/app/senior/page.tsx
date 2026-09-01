import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, Check, HeartHandshake, LifeBuoy, Phone, UserRound } from 'lucide-react';
import { Card } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { todayRange } from '@/lib/queries/family';
import { formatDayLabel, formatTime } from '@/lib/format';

export const metadata: Metadata = {
  title: "Today's care",
  robots: { index: false, follow: false },
};

/**
 * The senior's home screen.
 *
 * The hardest design constraint in the product, and the one most often got wrong. Rules
 * applied here:
 *  * Four things, no more. Everything else is one tap away and off this screen.
 *  * No jargon, no status codes, no counts, no badges. "Sunita is coming today at 8 o'clock",
 *    not "1 visit scheduled · IN_PROGRESS".
 *  * Text starts at 20px and targets at 56px (set by `data-surface="senior"` in the app
 *    layout), so this page does not need to fight the design system to be legible.
 *  * Names and faces, not roles. An 81-year-old remembers "Sunita", not "your assigned
 *    caregiver".
 *  * Nothing clinical. No readings, no flags, no plan versions. A senior seeing a number
 *    they cannot interpret, with no clinician present, is a harm, not a feature.
 */
export default async function SeniorHomePage() {
  const user = await requirePageUser(['SENIOR']);
  const { start, end } = todayRange();

  const seniorId = user.seniorId ?? '';

  const [visits, nextAppointment, coordinator, assignment] = await Promise.all([
    prisma.visit.findMany({
      where: { seniorId, scheduledStart: { gte: start, lt: end } },
      orderBy: { scheduledStart: 'asc' },
      include: {
        caregiver: { select: { user: { select: { name: true } } } },
        nurse: { select: { user: { select: { name: true } } } },
        tasks: { select: { id: true, label: true, status: true } },
      },
    }),
    prisma.appointment.findFirst({
      where: { seniorId, scheduledAt: { gte: new Date() }, status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.senior.findUnique({
      where: { id: seniorId },
      select: {
        firstName: true,
        supervisingNurse: {
          select: { user: { select: { name: true, phone: true } }, isCareCoordinator: true },
        },
      },
    }),
    prisma.caregiverAssignment.findFirst({
      where: { seniorId, status: { in: ['ACTIVE', 'NEEDS_REPLACEMENT'] } },
      orderBy: { startDate: 'desc' },
      include: { caregiver: { select: { user: { select: { name: true } } } } },
    }),
  ]);

  const todayVisit = visits[0];
  const caregiverName =
    todayVisit?.caregiver?.user.name ?? assignment?.caregiver.user.name ?? null;
  const firstName = (name: string) => name.split(' ')[0];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold text-ink-900">
        Hello, {firstName(user.name)}
      </h1>
      <p className="mt-2 text-xl text-ink-600">{formatDayLabel(new Date())}</p>

      {/* One clear answer to "is someone coming today?" */}
      <Card className="mt-7 border-brand-300">
        <div className="px-6 py-7">
          {todayVisit ? (
            <>
              <p className="text-2xl font-semibold text-ink-900">
                {todayVisit.checkInAt
                  ? `${firstName(caregiverName ?? 'Your carer')} is here`
                  : `${firstName(caregiverName ?? 'Your carer')} is coming today`}
              </p>
              <p className="mt-3 text-xl text-ink-700">
                {todayVisit.checkInAt
                  ? `Arrived at ${formatTime(todayVisit.checkInAt)}`
                  : `At ${formatTime(todayVisit.scheduledStart)}`}
              </p>

              {todayVisit.tasks.some((task) => task.status === 'DONE') ? (
                <ul className="mt-6 space-y-3">
                  {todayVisit.tasks
                    .filter((task) => task.status === 'DONE')
                    .map((task) => (
                      <li key={task.id} className="flex items-center gap-3 text-lg text-ink-800">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success text-white"
                          aria-hidden="true"
                        >
                          <Check className="h-5 w-5" strokeWidth={3} />
                        </span>
                        {task.label}
                      </li>
                    ))}
                </ul>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold text-ink-900">Nobody is coming today</p>
              <p className="mt-3 text-xl text-ink-700">
                {assignment
                  ? `Your carer is ${firstName(assignment.caregiver.user.name)}. You can see when they next visit below.`
                  : 'If you were expecting someone, please call us and we will find out.'}
              </p>
            </>
          )}
        </div>
      </Card>

      {/* Four large actions. Nothing else. */}
      <nav aria-label="Main actions" className="mt-6 grid gap-4 sm:grid-cols-2">
        {coordinator?.supervisingNurse?.user.phone ? (
          <a
            href={`tel:${coordinator.supervisingNurse.user.phone}`}
            className="flex min-h-[7rem] flex-col items-center justify-center gap-3 rounded-card bg-brand-700 px-5 py-6 text-center text-xl font-semibold text-white hover:bg-brand-800"
          >
            <Phone className="h-8 w-8" aria-hidden="true" />
            Call {firstName(coordinator.supervisingNurse.user.name)}
          </a>
        ) : (
          <Link
            href="/app/senior/help"
            className="flex min-h-[7rem] flex-col items-center justify-center gap-3 rounded-card bg-brand-700 px-5 py-6 text-center text-xl font-semibold text-white hover:bg-brand-800"
          >
            <Phone className="h-8 w-8" aria-hidden="true" />
            Call for help
          </Link>
        )}

        <Link
          href="/app/senior/caregiver"
          className="flex min-h-[7rem] flex-col items-center justify-center gap-3 rounded-card border-2 border-ink-300 bg-white px-5 py-6 text-center text-xl font-semibold text-ink-900 hover:border-brand-400"
        >
          <UserRound className="h-8 w-8 text-brand-700" aria-hidden="true" />
          My carer
        </Link>

        <Link
          href="/app/senior/appointments"
          className="flex min-h-[7rem] flex-col items-center justify-center gap-3 rounded-card border-2 border-ink-300 bg-white px-5 py-6 text-center text-xl font-semibold text-ink-900 hover:border-brand-400"
        >
          <CalendarDays className="h-8 w-8 text-brand-700" aria-hidden="true" />
          My appointments
        </Link>

        <Link
          href="/app/senior/help"
          className="flex min-h-[7rem] flex-col items-center justify-center gap-3 rounded-card border-2 border-ink-300 bg-white px-5 py-6 text-center text-xl font-semibold text-ink-900 hover:border-brand-400"
        >
          <LifeBuoy className="h-8 w-8 text-brand-700" aria-hidden="true" />
          I need help
        </Link>
      </nav>

      {nextAppointment ? (
        <Card className="mt-6">
          <div className="px-6 py-5">
            <p className="text-lg text-ink-600">Your next appointment</p>
            <p className="mt-2 text-xl font-semibold text-ink-900">{nextAppointment.title}</p>
            <p className="mt-1 text-lg text-ink-700">
              {formatDayLabel(nextAppointment.scheduledAt)} at{' '}
              {formatTime(nextAppointment.scheduledAt)}
            </p>
            {nextAppointment.companionRequired ? (
              <p className="mt-3 flex items-center gap-2 text-lg text-ink-700">
                <HeartHandshake className="h-6 w-6 shrink-0 text-brand-700" aria-hidden="true" />
                Someone will come with you
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="mt-6 border-[#f0d5aa] bg-[#fdf8ef]">
        <div className="px-6 py-5">
          <p className="text-lg font-semibold text-[#6b3d05]">If you feel unwell</p>
          <p className="mt-2 text-lg leading-relaxed text-[#6b3d05]">
            Please call for medical help first, or ask someone to call for you. This app is for
            arranging your care — it is not a doctor and it is not an emergency line.
          </p>
        </div>
      </Card>
    </div>
  );
}
