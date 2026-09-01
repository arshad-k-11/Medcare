import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  ApiError,
  created,
  enforceRateLimit,
  handler,
  ok,
  parseBody,
  parseQuery,
  requireCapability,
} from '@/lib/api';
import { createMedicationSchema } from '@/lib/validation/care';
import { canAccessSenior, seniorIdWhere } from '@/lib/scope';
import { audit } from '@/lib/audit';
import { writeList } from '@/lib/json-list';

const listQuery = z.object({
  seniorId: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
});

export const GET = handler(async (request) => {
  const user = await requireCapability('medication:read');
  const query = parseQuery(request, listQuery);
  const scope = await seniorIdWhere(user);

  const medications = await prisma.medication.findMany({
    where: {
      ...scope,
      ...(query.seniorId ? { seniorId: query.seniorId } : {}),
      ...(query.active === 'true' ? { isActive: true } : {}),
    },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: {
      enteredBy: { select: { name: true } },
      senior: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return ok({ data: medications });
});

/**
 * POST /api/medications
 *
 * Records a medication that an authorised person has read off a prescription, and generates
 * reminder occurrences for it. The platform does not prescribe: the record explicitly
 * captures WHO entered it (`enteredByUserId`) and who prescribed it (`prescribedBy`, for
 * reference only), and the API is available only to nurses, ops and family — never to a
 * caregiver, who can confirm a reminder but must never define one.
 *
 * Reminders are generated 14 days ahead. A scheduled job extends the window in production;
 * generating a finite horizon rather than an unbounded one keeps the table sane.
 */
const REMINDER_HORIZON_DAYS = 14;

export const POST = handler(async (request) => {
  const user = await requireCapability('medication:write');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, createMedicationSchema);

  if (!(await canAccessSenior(user, input.seniorId))) {
    throw new ApiError('FORBIDDEN', 'You do not have access to that patient.');
  }

  const medication = await prisma.medication.create({
    data: {
      seniorId: input.seniorId,
      name: input.name,
      dose: input.dose,
      form: input.form ?? null,
      timings: writeList(input.timings),
      instructions: input.instructions ?? null,
      prescribedBy: input.prescribedBy ?? null,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      enteredByUserId: user.id,
    },
  });

  // Generate the reminder occurrences.
  const start = new Date(Math.max(input.startDate.getTime(), Date.now()));
  start.setHours(0, 0, 0, 0);
  const horizon = new Date(start.getTime() + REMINDER_HORIZON_DAYS * 86_400_000);
  const end = input.endDate && input.endDate < horizon ? input.endDate : horizon;

  const reminders: { medicationId: string; seniorId: string; dueAt: Date }[] = [];
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    for (const timing of input.timings) {
      const [hours, minutes] = timing.split(':').map(Number);
      const dueAt = new Date(day);
      dueAt.setHours(hours, minutes, 0, 0);
      if (dueAt >= new Date()) {
        reminders.push({ medicationId: medication.id, seniorId: input.seniorId, dueAt });
      }
    }
  }

  if (reminders.length) {
    await prisma.medicationReminder.createMany({ data: reminders });
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'medication.created',
    entity: 'Medication',
    entityId: medication.id,
    seniorId: input.seniorId,
    // Name and dose are health information; only the shape is recorded.
    metadata: { timingsPerDay: input.timings.length, remindersCreated: reminders.length },
  });

  return created({
    id: medication.id,
    remindersCreated: reminders.length,
    message: `Recorded, with ${reminders.length} reminders scheduled for the next ${REMINDER_HORIZON_DAYS} days. This records what a doctor has prescribed — it does not change it.`,
  });
});
