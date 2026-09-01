import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Languages, Phone } from 'lucide-react';
import { Card } from '@/components/ui';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDayLabel, formatTime } from '@/lib/format';
import { readList } from '@/lib/json-list';

export const metadata: Metadata = {
  title: 'My carer',
  robots: { index: false, follow: false },
};

/** Who is looking after me, and when are they next coming. No jargon, no status codes. */
export default async function SeniorCaregiverPage() {
  const user = await requirePageUser(['SENIOR']);
  const seniorId = user.seniorId ?? '';

  const [assignment, nextVisits, coordinator] = await Promise.all([
    prisma.caregiverAssignment.findFirst({
      where: { seniorId, status: { in: ['ACTIVE', 'NEEDS_REPLACEMENT'] } },
      orderBy: { startDate: 'desc' },
      include: {
        caregiver: {
          select: {
            languages: true,
            experienceYears: true,
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.visit.findMany({
      where: { seniorId, scheduledStart: { gte: new Date() }, status: 'SCHEDULED' },
      orderBy: { scheduledStart: 'asc' },
      take: 4,
      include: { caregiver: { select: { user: { select: { name: true } } } } },
    }),
    prisma.senior.findUnique({
      where: { id: seniorId },
      select: {
        supervisingNurse: { select: { user: { select: { name: true, phone: true } } } },
      },
    }),
  ]);

  const firstName = (name: string) => name.split(' ')[0];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/app/senior"
        className="tap-target inline-flex items-center gap-2 text-lg font-semibold text-brand-800 hover:underline"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Back
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-ink-900">My carer</h1>

      {assignment ? (
        <Card className="mt-6">
          <div className="px-6 py-7">
            <p className="text-2xl font-semibold text-ink-900">
              {assignment.caregiver.user.name}
            </p>
            <p className="mt-2 text-xl text-ink-700">
              Looks after you {assignment.shiftStart ? `from ${assignment.shiftStart}` : ''}
            </p>
            {readList(assignment.caregiver.languages).length ? (
              <p className="mt-4 flex items-center gap-3 text-lg text-ink-700">
                <Languages className="h-6 w-6 shrink-0 text-brand-700" aria-hidden="true" />
                Speaks {readList(assignment.caregiver.languages).join(', ')}
              </p>
            ) : null}
            {assignment.status === 'NEEDS_REPLACEMENT' ? (
              <p className="mt-5 rounded-card bg-[#fdf8ef] px-4 py-4 text-lg leading-relaxed text-[#6b3d05]">
                {firstName(assignment.caregiver.user.name)} cannot come at the moment. We are
                arranging somebody else, and we will tell you their name before they arrive.
              </p>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card className="mt-6">
          <div className="px-6 py-7">
            <p className="text-xl text-ink-700">
              You do not have a carer arranged yet. Please call us and we will explain what is
              happening.
            </p>
          </div>
        </Card>
      )}

      {nextVisits.length ? (
        <Card className="mt-6">
          <div className="px-6 py-6">
            <p className="text-lg text-ink-600">When they are coming next</p>
            <ul className="mt-4 space-y-4">
              {nextVisits.map((visit) => (
                <li key={visit.id} className="text-lg text-ink-800">
                  <span className="font-semibold">{formatDayLabel(visit.scheduledStart)}</span> at{' '}
                  {formatTime(visit.scheduledStart)}
                  {visit.caregiver ? ` — ${firstName(visit.caregiver.user.name)}` : ''}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}

      {coordinator?.supervisingNurse ? (
        <Card className="mt-6">
          <div className="px-6 py-6">
            <p className="text-lg text-ink-600">The nurse who looks after your care</p>
            <p className="mt-2 text-xl font-semibold text-ink-900">
              {coordinator.supervisingNurse.user.name}
            </p>
            {coordinator.supervisingNurse.user.phone ? (
              <a
                href={`tel:${coordinator.supervisingNurse.user.phone}`}
                className="mt-4 flex min-h-[3.5rem] items-center justify-center gap-3 rounded-card bg-brand-700 px-5 text-xl font-semibold text-white hover:bg-brand-800"
              >
                <Phone className="h-6 w-6" aria-hidden="true" />
                Call {firstName(coordinator.supervisingNurse.user.name)}
              </a>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
