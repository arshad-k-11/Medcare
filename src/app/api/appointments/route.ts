import { prisma } from '@/lib/db';
import {
  ApiError,
  created,
  enforceRateLimit,
  handler,
  ok,
  paginated,
  pagination,
  parseBody,
  parseQuery,
  requireCapability,
} from '@/lib/api';
import { createAppointmentSchema } from '@/lib/validation/care';
import { paginationQuery } from '@/lib/validation/common';
import { canAccessSenior, seniorIdWhere } from '@/lib/scope';
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { formatDateTime } from '@/lib/format';
import { z } from 'zod';

const listQuery = paginationQuery.extend({
  seniorId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
});

/** GET /api/appointments — scoped to the caller's patients. */
export const GET = handler(async (request) => {
  const user = await requireCapability('appointment:read');
  const query = parseQuery(request, listQuery);
  const { page, pageSize, skip, take } = pagination(query);

  const scope = await seniorIdWhere(user);
  const where = {
    ...scope,
    ...(query.seniorId ? { seniorId: query.seniorId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          scheduledAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          },
        }
      : {}),
  };

  // A client-supplied seniorId is intersected with the caller's scope above, so an id
  // outside their scope simply returns nothing rather than leaking a record.
  const [data, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      skip,
      take,
      include: { senior: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.appointment.count({ where }),
  ]);

  return ok(paginated(data, total, page, pageSize));
});

/**
 * POST /api/appointments
 *
 * A family can add an appointment for their own senior — they are usually the ones who know
 * about the follow-up. The senior id from the body is checked against the caller's scope
 * before anything is written.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('appointment:write');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, createAppointmentSchema);

  if (!(await canAccessSenior(user, input.seniorId))) {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'appointment.create.denied',
      entity: 'Senior',
      entityId: input.seniorId,
      outcome: 'DENIED',
    });
    throw new ApiError('FORBIDDEN', 'You do not have access to that patient.');
  }

  const appointment = await prisma.appointment.create({
    data: {
      seniorId: input.seniorId,
      title: input.title,
      doctorName: input.doctorName ?? null,
      facility: input.facility ?? null,
      specialty: input.specialty ?? null,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      purpose: input.purpose ?? null,
      transportRequired: input.transportRequired,
      companionRequired: input.companionRequired,
      // A day before, which is when a reminder is actually useful.
      reminderAt: new Date(input.scheduledAt.getTime() - 24 * 60 * 60 * 1000),
      createdByUserId: user.id,
    },
    include: { senior: { select: { firstName: true, lastName: true, supervisingNurseId: true } } },
  });

  // Tell the supervising nurse, so transport and escort actually get arranged.
  if (appointment.senior.supervisingNurseId && (input.transportRequired || input.companionRequired)) {
    const nurse = await prisma.nurseProfile.findUnique({
      where: { id: appointment.senior.supervisingNurseId },
      select: { userId: true },
    });
    if (nurse) {
      await notify({
        userId: nurse.userId,
        type: 'APPOINTMENT_REMINDER',
        title: 'Appointment needs transport or an escort',
        body: `${appointment.senior.firstName} ${appointment.senior.lastName} has "${appointment.title}" on ${formatDateTime(appointment.scheduledAt)}. Requested: ${[
          input.transportRequired ? 'transport' : null,
          input.companionRequired ? 'escort' : null,
        ]
          .filter(Boolean)
          .join(' and ')}.`,
        href: '/app/nurse/visits',
        seniorId: input.seniorId,
      }).catch((error) => log.warn('appointment.notify.failed', { error: String(error) }));
    }
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'appointment.created',
    entity: 'Appointment',
    entityId: appointment.id,
    seniorId: input.seniorId,
    metadata: {
      transportRequired: input.transportRequired,
      companionRequired: input.companionRequired,
    },
  });

  return created({ id: appointment.id });
});
