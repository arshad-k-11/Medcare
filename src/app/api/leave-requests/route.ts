import { prisma } from '@/lib/db';
import {
  ApiError,
  created,
  enforceRateLimit,
  handler,
  ok,
  parseBody,
  requireCapability,
  requireUser,
} from '@/lib/api';
import { leaveRequestSchema } from '@/lib/validation/care';
import { notifyInternal } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { formatDate } from '@/lib/format';

/** GET /api/leave-requests — ops sees all, staff see their own. */
export const GET = handler(async () => {
  const user = await requireUser();

  const isOps = ['ADMIN', 'OPS_MANAGER'].includes(user.role);
  const requests = await prisma.leaveRequest.findMany({
    where: isOps
      ? {}
      : {
          OR: [
            { caregiverId: user.caregiverProfileId ?? '__none__' },
            { nurseId: user.nurseProfileId ?? '__none__' },
          ],
        },
    orderBy: [{ status: 'asc' }, { fromDate: 'asc' }],
    include: {
      caregiver: { select: { id: true, user: { select: { name: true } } } },
      nurse: { select: { id: true, user: { select: { name: true } } } },
    },
  });

  return ok({ data: requests });
});

/**
 * POST /api/leave-requests
 *
 * Staff request their own leave. The route also tells ops how many visits are affected, so
 * the person approving it knows the cover cost before saying yes rather than discovering it
 * the following week.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('leave:request');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, leaveRequestSchema);

  if (!user.caregiverProfileId && !user.nurseProfileId) {
    throw new ApiError('FORBIDDEN', 'Only care staff can request leave here.');
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      caregiverId: user.caregiverProfileId ?? null,
      nurseId: user.caregiverProfileId ? null : (user.nurseProfileId ?? null),
      fromDate: input.fromDate,
      toDate: input.toDate,
      reason: input.reason,
      type: input.type,
      status: 'PENDING',
    },
  });

  const affectedVisits = await prisma.visit.count({
    where: {
      ...(user.caregiverProfileId
        ? { caregiverId: user.caregiverProfileId }
        : { nurseId: user.nurseProfileId ?? '' }),
      scheduledStart: { gte: input.fromDate, lte: input.toDate },
      status: 'SCHEDULED',
    },
  });

  await notifyInternal({
    type: 'SYSTEM',
    title: `${input.type === 'EMERGENCY' ? 'Emergency leave' : 'Leave'} request from ${user.name}`,
    body: `${formatDate(input.fromDate)} to ${formatDate(input.toDate)}. ${affectedVisits} scheduled visit${affectedVisits === 1 ? '' : 's'} affected. Reason: ${input.reason}`,
    severity: input.type === 'EMERGENCY' ? 'WARNING' : 'INFO',
    href: '/app/admin/caregivers',
  }).catch((error) => log.warn('leave.notify.failed', { error: String(error) }));

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'leave.requested',
    entity: 'LeaveRequest',
    entityId: leave.id,
    metadata: { type: input.type, affectedVisits },
  });

  return created({
    id: leave.id,
    affectedVisits,
    message: `Request sent. ${affectedVisits} scheduled visit${affectedVisits === 1 ? '' : 's'} would need cover, and operations will arrange that.`,
  });
});
