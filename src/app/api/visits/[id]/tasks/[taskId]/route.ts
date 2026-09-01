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
import { updateVisitTaskSchema } from '@/lib/validation/care';
import { audit } from '@/lib/audit';

/**
 * PATCH /api/visits/:id/tasks/:taskId
 *
 * Marks a task done, declined or not applicable. A declined task requires a note (enforced
 * by the schema), because "she refused" without a reason is useless to the nurse who has to
 * decide whether the approach needs changing.
 *
 * A refusal also creates a CareNote so it lands in the family timeline and the nurse's
 * review queue rather than only living inside the visit record.
 */
export const PATCH = handler<RouteContext<{ id: string; taskId: string }>>(
  async (request, { params }) => {
    const user = await requireCapability('visit:attend');
    await enforceRateLimit('write', user.id, request);
    const { id, taskId } = await params;
    const input = await parseBody(request, updateVisitTaskSchema);

    const task = await prisma.visitTask.findFirst({
      where: { id: taskId, visitId: id },
      include: {
        visit: {
          select: {
            id: true,
            seniorId: true,
            status: true,
            checkInAt: true,
            caregiverId: true,
            nurseId: true,
          },
        },
      },
    });

    if (!task) throw new ApiError('NOT_FOUND', 'That task could not be found.');

    const isAssignedCaregiver =
      user.role === 'CAREGIVER' && task.visit.caregiverId === user.caregiverProfileId;
    const isAssignedNurse = user.role === 'NURSE' && task.visit.nurseId === user.nurseProfileId;
    const isInternal = user.role === 'ADMIN' || user.role === 'OPS_MANAGER';

    if (!isAssignedCaregiver && !isAssignedNurse && !isInternal) {
      throw new ApiError('FORBIDDEN', 'This visit is not assigned to you.');
    }
    if (!task.visit.checkInAt) {
      throw new ApiError('CONFLICT', 'Please check in before recording tasks.');
    }

    await prisma.visitTask.update({
      where: { id: taskId },
      data: {
        status: input.status,
        completedAt: input.status === 'DONE' ? new Date() : null,
        note: input.note ?? null,
      },
    });

    // A refusal is clinically relevant, so it becomes a note the nurse reviews.
    if (input.status === 'REFUSED') {
      await prisma.careNote.create({
        data: {
          seniorId: task.visit.seniorId,
          visitId: task.visit.id,
          authorUserId: user.id,
          authorRole: user.role,
          type: 'REFUSAL',
          body: `${task.label} was declined. ${input.note ?? ''}`.trim(),
          visibleToFamily: true,
          requiresReview: true,
        },
      });
    }

    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'visit.task.updated',
      entity: 'VisitTask',
      entityId: taskId,
      seniorId: task.visit.seniorId,
      metadata: { status: input.status },
    });

    return ok({ ok: true });
  },
);
