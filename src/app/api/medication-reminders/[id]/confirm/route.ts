import { prisma } from '@/lib/db';
import {
  ApiError,
  enforceRateLimit,
  handler,
  ok,
  parseBody,
  requireCapability,
  type RouteContext,
} from '@/lib/api';
import { confirmReminderSchema } from '@/lib/validation/care';
import { canAccessSenior } from '@/lib/scope';
import { audit } from '@/lib/audit';

/**
 * POST /api/medication-reminders/:id/confirm
 *
 * Records whether a reminder was confirmed, missed or not needed. This route records a
 * fact about a reminder — it does not administer, change or approve medication, and
 * nothing here can alter the Medication record itself.
 *
 * A missed reminder creates a note so it reaches the nurse's review queue: a pattern of
 * missed doses is exactly what a treating doctor needs to know at the next appointment.
 */
export const POST = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('medication:confirm');
  await enforceRateLimit('write', user.id, request);
  const { id } = await params;
  const input = await parseBody(request, confirmReminderSchema);

  const reminder = await prisma.medicationReminder.findUnique({
    where: { id },
    include: { medication: { select: { name: true, dose: true } } },
  });

  if (!reminder || !(await canAccessSenior(user, reminder.seniorId))) {
    throw new ApiError('NOT_FOUND', 'That reminder could not be found.');
  }

  if (reminder.status !== 'PENDING') {
    throw new ApiError('CONFLICT', 'This reminder has already been recorded.');
  }

  await prisma.medicationReminder.update({
    where: { id },
    data: {
      status: input.status,
      actedAt: new Date(),
      actedByUserId: user.id,
      note: input.note ?? null,
    },
  });

  if (input.status === 'MISSED') {
    await prisma.careNote.create({
      data: {
        seniorId: reminder.seniorId,
        authorUserId: user.id,
        authorRole: user.role,
        type: 'MISSED_TASK',
        body: `Medication reminder missed: ${reminder.medication.name} ${reminder.medication.dose}.${
          input.note ? ` ${input.note}` : ''
        }`,
        visibleToFamily: true,
        requiresReview: true,
      },
    });
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'medication-reminder.recorded',
    entity: 'MedicationReminder',
    entityId: id,
    seniorId: reminder.seniorId,
    // The medication name is health information and stays out of the audit metadata.
    metadata: { status: input.status },
  });

  return ok({
    ok: true,
    message:
      input.status === 'MISSED'
        ? 'Recorded as missed and flagged to the nurse. Do not give a replacement dose — that is a decision for the doctor.'
        : 'Recorded.',
  });
});
