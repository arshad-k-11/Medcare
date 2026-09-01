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
import { decideLeaveSchema } from '@/lib/validation/care';
import { notify, notifyInternal } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { formatDate } from '@/lib/format';

/**
 * PATCH /api/leave-requests/:id — approve or reject.
 *
 * Approving leave for a caregiver flags their affected assignments as needing replacement
 * and marks the affected visits at risk. That is the trigger for Workflow C: the leave
 * approval is what surfaces the cover problem, rather than someone noticing it on the day.
 */
export const PATCH = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('leave:decide');
  await enforceRateLimit('write', user.id, request);
  const { id } = await params;
  const input = await parseBody(request, decideLeaveSchema);

  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      caregiver: { select: { id: true, userId: true, user: { select: { name: true } } } },
      nurse: { select: { id: true, userId: true, user: { select: { name: true } } } },
    },
  });

  if (!leave) throw new ApiError('NOT_FOUND', 'That request could not be found.');
  if (leave.status !== 'PENDING') {
    throw new ApiError('CONFLICT', 'That request has already been decided.');
  }

  const approving = input.status === 'APPROVED';
  let affectedAssignments = 0;
  let affectedVisits = 0;

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id },
      data: {
        status: input.status,
        decidedAt: new Date(),
        decidedBy: user.name,
        decisionNote: input.decisionNote ?? null,
      },
    });

    if (approving && leave.caregiverId) {
      await tx.caregiverProfile.update({
        where: { id: leave.caregiverId },
        data: { status: 'ON_LEAVE' },
      });

      // Flag the assignments, so ops sees the cover problem now rather than on the day.
      const assignments = await tx.caregiverAssignment.updateMany({
        where: { caregiverId: leave.caregiverId, status: 'ACTIVE' },
        data: { status: 'NEEDS_REPLACEMENT' },
      });
      affectedAssignments = assignments.count;

      const visits = await tx.visit.updateMany({
        where: {
          caregiverId: leave.caregiverId,
          scheduledStart: { gte: leave.fromDate, lte: leave.toDate },
          status: 'SCHEDULED',
        },
        data: { atRisk: true },
      });
      affectedVisits = visits.count;
    }
  });

  const staffUserId = leave.caregiver?.userId ?? leave.nurse?.userId;
  if (staffUserId) {
    await notify({
      userId: staffUserId,
      type: 'SYSTEM',
      title: approving ? 'Your leave has been approved' : 'Your leave request was not approved',
      body: approving
        ? `${formatDate(leave.fromDate)} to ${formatDate(leave.toDate)} is approved. Cover is being arranged — you will not be offered shifts during this period.${input.decisionNote ? ` ${input.decisionNote}` : ''}`
        : `${formatDate(leave.fromDate)} to ${formatDate(leave.toDate)} was not approved.${input.decisionNote ? ` ${input.decisionNote}` : ' Please speak to operations.'}`,
      href: '/app/caregiver/leave',
    }).catch((error) => log.warn('leave.decision.notify.failed', { error: String(error) }));
  }

  if (approving && affectedVisits > 0) {
    await notifyInternal({
      type: 'SYSTEM',
      title: 'Replacement cover needed',
      body: `${leave.caregiver?.user.name ?? 'A staff member'} is on approved leave from ${formatDate(leave.fromDate)}. ${affectedAssignments} assignment${affectedAssignments === 1 ? '' : 's'} and ${affectedVisits} visit${affectedVisits === 1 ? '' : 's'} need cover.`,
      severity: 'WARNING',
      href: '/app/admin/assignments',
    }).catch((error) => log.warn('leave.cover.notify.failed', { error: String(error) }));
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: approving ? 'leave.approved' : 'leave.rejected',
    entity: 'LeaveRequest',
    entityId: id,
    metadata: { affectedAssignments, affectedVisits },
  });

  return ok({ ok: true, affectedAssignments, affectedVisits });
});
