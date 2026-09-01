import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Clock, MapPin, Phone } from 'lucide-react';
import { Alert, ButtonLink, Card, CardHeader, DescriptionList, PageHeader } from '@/components/ui';
import { VisitRunner } from '@/components/caregiver/visit-runner';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDateTime, formatName, formatTime } from '@/lib/format';
import { readList } from '@/lib/json-list';
import { MOBILITY_LABELS, VISIT_KIND_LABELS, label } from '@/lib/constants';
import { audit } from '@/lib/audit';

export const metadata: Metadata = {
  title: 'Visit',
  robots: { index: false, follow: false },
};

export default async function CaregiverVisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser(['CAREGIVER', 'ADMIN', 'OPS_MANAGER']);
  const { id } = await params;

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      senior: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          ageYears: true,
          addressLine: true,
          area: true,
          mobility: true,
          languages: true,
          allergies: true,
          conditions: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          notes: true,
          supervisingNurse: { select: { user: { select: { name: true } } } },
        },
      },
      tasks: { orderBy: { sortOrder: 'asc' } },
      carePlan: {
        select: {
          title: true,
          mobilityNotes: true,
          dietaryNotes: true,
          escalationPreferences: true,
          services: { include: { service: { select: { slug: true, name: true } } } },
        },
      },
    },
  });

  if (!visit) notFound();

  // A caregiver may only open their own visit.
  const isOwn = user.role !== 'CAREGIVER' || visit.caregiverId === user.caregiverProfileId;
  if (!isOwn) {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'visit.read.denied',
      entity: 'Visit',
      entityId: id,
      outcome: 'DENIED',
    });
    notFound();
  }

  const reminders = await prisma.medicationReminder.findMany({
    where: {
      seniorId: visit.seniorId,
      dueAt: {
        gte: new Date(visit.scheduledStart.getTime() - 60 * 60 * 1000),
        lte: new Date(visit.scheduledEnd.getTime() + 60 * 60 * 1000),
      },
    },
    orderBy: { dueAt: 'asc' },
    include: { medication: { select: { name: true, dose: true, instructions: true } } },
  });

  // Which readings this plan asks for, if any.
  const wantsVitals = (visit.carePlan?.services ?? []).some((row) =>
    ['vitals-monitoring'].includes(row.service.slug),
  );
  const requestedVitals = wantsVitals ? ['BLOOD_PRESSURE', 'BLOOD_GLUCOSE', 'HEART_RATE'] : [];

  const conditions = readList(visit.senior.conditions);
  const languages = readList(visit.senior.languages);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={formatName(visit.senior)}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {formatTime(visit.scheduledStart)}–{formatTime(visit.scheduledEnd)}
            </span>
            <span>{label(VISIT_KIND_LABELS, visit.kind)}</span>
          </span>
        }
        breadcrumb={[{ href: '/app/caregiver', label: "Today's schedule" }]}
      />

      {/* Everything the caregiver needs before they knock on the door. */}
      <Card className="mb-5">
        <CardHeader title="Before you go in" />
        <div className="space-y-4 px-5 py-4">
          {visit.senior.addressLine ? (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(visit.senior.addressLine)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-[0.9375rem] text-brand-800 underline underline-offset-2"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {visit.senior.addressLine}
            </a>
          ) : null}

          <DescriptionList
            columns={2}
            items={[
              { label: 'Age', value: visit.senior.ageYears ?? '—' },
              { label: 'Mobility', value: label(MOBILITY_LABELS, visit.senior.mobility) },
              { label: 'Speaks', value: languages.join(', ') || '—' },
              { label: 'Allergies', value: visit.senior.allergies || 'None recorded' },
            ]}
          />

          {conditions.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Conditions on record
              </p>
              <p className="mt-1 text-[0.9375rem] text-ink-800">{conditions.join(' · ')}</p>
            </div>
          ) : null}

          {visit.carePlan?.mobilityNotes ? (
            <div className="rounded-card border border-[#f0d5aa] bg-[#fdf8ef] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b3d05]">
                Mobility — read this
              </p>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-[#6b3d05]">
                {visit.carePlan.mobilityNotes}
              </p>
            </div>
          ) : null}

          {visit.carePlan?.dietaryNotes ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Diet</p>
              <p className="mt-1 text-[0.9375rem] text-ink-800">{visit.carePlan.dietaryNotes}</p>
            </div>
          ) : null}

          {visit.senior.notes ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Household notes
              </p>
              <p className="mt-1 text-[0.9375rem] text-ink-800">{visit.senior.notes}</p>
            </div>
          ) : null}

          {visit.instructions ? (
            <div className="rounded-card bg-sand-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Instructions for this visit
              </p>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-800">
                {visit.instructions}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-[color:var(--border)] pt-4">
            {visit.senior.emergencyContactPhone ? (
              <a
                href={`tel:${visit.senior.emergencyContactPhone}`}
                className="tap-target inline-flex items-center gap-2 rounded-[10px] border border-ink-300 px-4 text-sm font-semibold text-ink-800 hover:bg-ink-50"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {visit.senior.emergencyContactName ?? 'Family contact'}
              </a>
            ) : null}
            <ButtonLink href="/app/caregiver/escalate" variant="outline" size="sm">
              Report an issue
            </ButtonLink>
          </div>
        </div>
      </Card>

      <VisitRunner
        visitId={visit.id}
        seniorId={visit.senior.id}
        seniorName={formatName(visit.senior)}
        status={visit.status}
        checkedInAt={visit.checkInAt?.toISOString() ?? null}
        tasks={visit.tasks.map((task) => ({
          id: task.id,
          label: task.label,
          instructions: task.instructions,
          status: task.status,
          note: task.note,
        }))}
        reminders={reminders.map((reminder) => ({
          id: reminder.id,
          dueAt: reminder.dueAt.toISOString(),
          status: reminder.status,
          medicationName: reminder.medication.name,
          dose: reminder.medication.dose,
          instructions: reminder.medication.instructions,
        }))}
        requestedVitals={requestedVitals}
      />

      {visit.carePlan?.escalationPreferences ? (
        <Alert tone="info" title="If you need to escalate" className="mt-5">
          <p>{visit.carePlan.escalationPreferences}</p>
          <p className="mt-2">
            Nurse supervisor: {visit.senior.supervisingNurse?.user.name ?? 'contact operations'}.
            For a medical emergency, call emergency services first.
          </p>
        </Alert>
      ) : null}

      <p className="mt-6 text-center text-sm text-ink-500">
        Visit scheduled for {formatDateTime(visit.scheduledStart)} ·{' '}
        <Link href="/app/caregiver" className="font-medium text-brand-700 hover:underline">
          Back to today
        </Link>
      </p>
    </div>
  );
}
