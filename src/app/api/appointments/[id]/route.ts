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
import { updateAppointmentSchema } from '@/lib/validation/care';
import { canAccessSenior } from '@/lib/scope';
import { audit } from '@/lib/audit';

/** PATCH /api/appointments/:id — reschedule, cancel or record the outcome. */
export const PATCH = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('appointment:write');
  await enforceRateLimit('write', user.id, request);
  const { id } = await params;
  const input = await parseBody(request, updateAppointmentSchema);

  const existing = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, seniorId: true },
  });

  // A 404 rather than a 403 for a record outside scope: confirming that an id exists is
  // itself a small leak.
  if (!existing || !(await canAccessSenior(user, existing.seniorId))) {
    throw new ApiError('NOT_FOUND', 'That appointment could not be found.');
  }

  await prisma.appointment.update({
    where: { id },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.doctorName !== undefined ? { doctorName: input.doctorName ?? null } : {}),
      ...(input.facility !== undefined ? { facility: input.facility ?? null } : {}),
      ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
      ...(input.durationMinutes ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.purpose !== undefined ? { purpose: input.purpose ?? null } : {}),
      ...(input.transportRequired != null ? { transportRequired: input.transportRequired } : {}),
      ...(input.companionRequired != null ? { companionRequired: input.companionRequired } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.outcomeNotes !== undefined ? { outcomeNotes: input.outcomeNotes ?? null } : {}),
    },
  });

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'appointment.updated',
    entity: 'Appointment',
    entityId: id,
    seniorId: existing.seniorId,
    metadata: { fields: Object.keys(input) },
  });

  return ok({ ok: true });
});
