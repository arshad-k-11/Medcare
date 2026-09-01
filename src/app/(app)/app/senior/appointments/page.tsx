import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Car, HeartHandshake } from 'lucide-react';
import { Card } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDayLabel, formatTime } from '@/lib/format';

export const metadata: Metadata = {
  title: 'My appointments',
  robots: { index: false, follow: false },
};

export default async function SeniorAppointmentsPage() {
  const user = await requirePageUser(['SENIOR']);

  const appointments = await prisma.appointment.findMany({
    where: {
      seniorId: user.seniorId ?? '',
      scheduledAt: { gte: new Date() },
      status: 'SCHEDULED',
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/app/senior"
        className="tap-target inline-flex items-center gap-2 text-lg font-semibold text-brand-800 hover:underline"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Back
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-ink-900">My appointments</h1>

      {appointments.length ? (
        <ul className="mt-6 space-y-4">
          {appointments.map((appointment) => (
            <Card as="li" key={appointment.id}>
              <div className="px-6 py-6">
                <p className="text-xl font-semibold text-ink-900">{appointment.title}</p>
                <p className="mt-2 text-lg text-ink-700">
                  {formatDayLabel(appointment.scheduledAt)} at {formatTime(appointment.scheduledAt)}
                </p>
                {appointment.facility ? (
                  <p className="mt-1 text-lg text-ink-700">{appointment.facility}</p>
                ) : null}
                {appointment.companionRequired ? (
                  <p className="mt-4 flex items-center gap-3 text-lg text-ink-700">
                    <HeartHandshake className="h-6 w-6 shrink-0 text-brand-700" aria-hidden="true" />
                    Someone will come with you
                  </p>
                ) : null}
                {appointment.transportRequired ? (
                  <p className="mt-2 flex items-center gap-3 text-lg text-ink-700">
                    <Car className="h-6 w-6 shrink-0 text-brand-700" aria-hidden="true" />
                    Transport is arranged
                  </p>
                ) : null}
              </div>
            </Card>
          ))}
        </ul>
      ) : (
        <Card className="mt-6">
          <div className="px-6 py-7">
            <p className="text-xl text-ink-700">
              You have no appointments coming up. If you think there should be one, please call us.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
