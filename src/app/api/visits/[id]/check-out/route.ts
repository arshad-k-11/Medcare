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
import { checkOutSchema } from '@/lib/validation/care';
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';

/**
 * POST /api/visits/:id/check-out
 *
 * Completes a visit. Any task still pending is recorded as pending rather than being
 * silently marked done — an honest incomplete record is worth far more to a nurse than a
 * tidy one, and a pattern of the same task never being completed is a real signal.
 */
export const POST = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('visit:attend');
  await enforceRateLimit('write', user.id, request);
  const { id } = await params;
  const input = await parseBody(request, checkOutSchema);

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      senior: {
        select: {
          id: true,
          firstName: true,
          familyLinks: { select: { familyProfile: { select: { userId: true } } } },
        },
      },
      caregiver: { select: { id: true, user: { select: { name: true } } } },
      nurse: { select: { id: true, user: { select: { name: true } } } },
      tasks: { select: { id: true, status: true } },
    },
  });

  if (!visit) throw new ApiError('NOT_FOUND', 'That visit could not be found.');

  const isAssignedCaregiver =
    user.role === 'CAREGIVER' && visit.caregiver?.id === user.caregiverProfileId;
  const isAssignedNurse = user.role === 'NURSE' && visit.nurse?.id === user.nurseProfileId;
  const isInternal = user.role === 'ADMIN' || user.role === 'OPS_MANAGER';

  if (!isAssignedCaregiver && !isAssignedNurse && !isInternal) {
    throw new ApiError('FORBIDDEN', 'This visit is not assigned to you.');
  }
  if (!visit.checkInAt) {
    throw new ApiError('CONFLICT', 'Please check in before checking out.');
  }
  if (visit.checkOutAt) {
    throw new ApiError('CONFLICT', 'You have already checked out of this visit.');
  }

  const done = visit.tasks.filter((task) => task.status === 'DONE').length;
  const pending = visit.tasks.filter((task) => task.status === 'PENDING').length;

  const now = new Date();
  await prisma.visit.update({
    where: { id },
    data: {
      checkOutAt: now,
      status: 'COMPLETED',
      summary: input.summary ?? null,
    },
  });

  const who = visit.caregiver?.user.name ?? visit.nurse?.user.name ?? 'Your care team';
  const familyUserIds = visit.senior.familyLinks.map((link) => link.familyProfile.userId);

  await Promise.all(
    familyUserIds.map((familyUserId) =>
      notify({
        userId: familyUserId,
        type: 'VISIT_UPDATE',
        title: 'Visit completed',
        body: `${who} completed today's visit for ${visit.senior.firstName}. ${done} of ${visit.tasks.length} planned tasks were completed${
          pending > 0 ? `, and ${pending} were not` : ''
        }.${input.summary ? ` Note: ${input.summary}` : ''}`,
        href: '/app/family',
        seniorId: visit.seniorId,
        templateKey: 'visit.completed',
      }),
    ),
  ).catch((error) => log.warn('visit.check-out.notify.failed', { error: String(error) }));

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'visit.checked-out',
    entity: 'Visit',
    entityId: id,
    seniorId: visit.seniorId,
    metadata: { tasksDone: done, tasksPending: pending },
  });

  return ok({ checkOutAt: now.toISOString(), tasksDone: done, tasksPending: pending });
});
