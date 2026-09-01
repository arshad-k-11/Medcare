import type { Metadata } from 'next';
import { CalendarDays, Car, UserRound } from 'lucide-react';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatusPill,
  Table,
  Td,
} from '@/components/ui';
import { SeniorSwitcher } from '@/components/family/senior-switcher';
import { AppointmentForm } from '@/components/family/appointment-form';
import { requirePageUser } from '@/lib/auth-guard';
import { resolveSelectedSenior } from '@/lib/queries/family';
import { prisma } from '@/lib/db';
import { formatDateTime, formatDuration, formatInTimezone, formatName } from '@/lib/format';
import { APPOINTMENT_STATUSES, VISIT_KIND_LABELS, label, titleise } from '@/lib/constants';
import { visitStatus } from '@/lib/status';

export const metadata: Metadata = {
  title: 'Appointments and visits',
  robots: { index: false, follow: false },
};

/**
 * Combined calendar: our own visits and the senior's medical appointments in one place,
 * because a family thinks in "what is happening this week", not in our internal categories.
 */
export default async function FamilyAppointmentsPage({
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
        <PageHeader title="Appointments" />
        <Card>
          <EmptyState title="Nobody linked yet" description="Add a senior to schedule appointments." />
        </Card>
      </div>
    );
  }

  const senior = seniors.find((row) => row.id === selectedId)!;
  const now = new Date();

  const [upcomingAppointments, pastAppointments, upcomingVisits, familyProfile] = await Promise.all([
    prisma.appointment.findMany({
      where: { seniorId: senior.id, scheduledAt: { gte: now } },
      orderBy: { scheduledAt: 'asc' },
    }),
    prisma.appointment.findMany({
      where: { seniorId: senior.id, scheduledAt: { lt: now } },
      orderBy: { scheduledAt: 'desc' },
      take: 20,
    }),
    prisma.visit.findMany({
      where: { seniorId: senior.id, scheduledStart: { gte: now } },
      orderBy: { scheduledStart: 'asc' },
      take: 20,
      include: {
        caregiver: { select: { user: { select: { name: true } } } },
        nurse: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.familyProfile.findUnique({
      where: { id: user.familyProfileId ?? '' },
      select: { isNri: true, user: { select: { timezone: true } } },
    }),
  ]);

  const isNri = familyProfile?.isNri ?? false;
  const tz = familyProfile?.user.timezone ?? 'Asia/Kolkata';

  return (
    <div>
      <PageHeader
        title="Appointments and visits"
        description={`Everything scheduled for ${formatName(senior)}.`}
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

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Care visits coming up"
              description="Caregiver shifts and nurse reviews arranged by us."
            />
            {upcomingVisits.length ? (
              <Table caption="Upcoming care visits" head={['When', 'Type', 'Who', 'Status']}>
                {upcomingVisits.map((visit) => (
                  <tr key={visit.id}>
                    <Td>
                      <span className="font-medium text-ink-900">
                        {formatDateTime(visit.scheduledStart)}
                      </span>
                      {isNri ? (
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {formatInTimezone(visit.scheduledStart, tz)} your time
                        </span>
                      ) : null}
                    </Td>
                    <Td>{label(VISIT_KIND_LABELS, visit.kind)}</Td>
                    <Td>
                      {visit.caregiver?.user.name ??
                        visit.nurse?.user.name ?? (
                          <span className="text-ink-500">To be assigned</span>
                        )}
                    </Td>
                    <Td>
                      <StatusPill {...visitStatus(visit.status)} />
                      {visit.atRisk ? (
                        <span className="mt-1 block">
                          <Badge tone="warning">Cover being arranged</Badge>
                        </span>
                      ) : null}
                    </Td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState
                title="No care visits scheduled"
                description="Visits are scheduled once a care plan is active. Ask your coordinator if you expected something here."
              />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Medical appointments"
              description="Doctor and clinic appointments. We can arrange transport and an escort."
            />
            {upcomingAppointments.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {upcomingAppointments.map((appointment) => (
                  <li key={appointment.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-900">{appointment.title}</p>
                        <p className="mt-0.5 text-sm text-ink-600">
                          {formatDateTime(appointment.scheduledAt)} ·{' '}
                          {formatDuration(appointment.durationMinutes)}
                        </p>
                        {isNri ? (
                          <p className="text-xs text-ink-500">
                            {formatInTimezone(appointment.scheduledAt, tz)} your time
                          </p>
                        ) : null}
                        {appointment.doctorName || appointment.facility ? (
                          <p className="mt-1 text-sm text-ink-600">
                            {[appointment.doctorName, appointment.facility]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        ) : null}
                        {appointment.purpose ? (
                          <p className="mt-2 text-sm text-ink-600">{appointment.purpose}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {appointment.transportRequired ? (
                          <Badge tone="info" icon={<Car className="h-3.5 w-3.5" />}>
                            Transport
                          </Badge>
                        ) : null}
                        {appointment.companionRequired ? (
                          <Badge tone="brand" icon={<UserRound className="h-3.5 w-3.5" />}>
                            Escort
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No appointments scheduled"
                description="Add one below and we will coordinate transport, an escort and a written outcome note."
              />
            )}
          </Card>

          {pastAppointments.length ? (
            <Card>
              <CardHeader title="Past appointments" />
              <Table caption="Past appointments" head={['When', 'Appointment', 'Status', 'Outcome']}>
                {pastAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <Td className="whitespace-nowrap">{formatDateTime(appointment.scheduledAt)}</Td>
                    <Td>
                      <span className="font-medium text-ink-900">{appointment.title}</span>
                      {appointment.facility ? (
                        <span className="mt-0.5 block text-xs text-ink-500">
                          {appointment.facility}
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          appointment.status === 'COMPLETED'
                            ? 'success'
                            : appointment.status === 'MISSED'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {titleise(appointment.status)}
                      </Badge>
                    </Td>
                    <Td className="text-ink-600">{appointment.outcomeNotes ?? '—'}</Td>
                  </tr>
                ))}
              </Table>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <AppointmentForm seniorId={senior.id} seniorName={formatName(senior)} />

          <Card>
            <CardHeader title="What we do about appointments" />
            <div className="px-5 py-4 text-sm leading-relaxed text-ink-600">
              <p>
                On plans that include it, we book the appointment, arrange transport, send a
                caregiver to escort your parent, and write up what the doctor said the same day.
              </p>
              <p className="mt-3">
                We coordinate appointments — we do not provide the consultation, and we do not
                change anything the doctor decides.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Taking readings to an appointment" />
            <div className="px-5 py-4 text-sm leading-relaxed text-ink-600">
              <p>
                Recorded readings and visit notes can be printed from the care updates page. Ten
                minutes with a doctor goes much further with a log than with recollection.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
