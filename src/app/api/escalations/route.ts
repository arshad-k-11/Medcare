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
import { createEscalationSchema } from '@/lib/validation/care';
import { canAccessSenior, seniorIdWhere } from '@/lib/scope';
import { resolveEscalation } from '@/lib/services/escalation';
import { notify, notifyInternal } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';

const listQuery = z.object({
  seniorId: z.string().optional(),
  open: z.enum(['true', 'false']).optional(),
});

export const GET = handler(async (request) => {
  const user = await requireCapability('escalation:manage');
  const query = parseQuery(request, listQuery);
  const scope = await seniorIdWhere(user);

  const escalations = await prisma.escalation.findMany({
    where: {
      ...scope,
      ...(query.seniorId ? { seniorId: query.seniorId } : {}),
      ...(query.open === 'true' ? { closedAt: null } : {}),
    },
    orderBy: [{ closedAt: 'asc' }, { raisedAt: 'desc' }],
    include: {
      senior: { select: { id: true, firstName: true, lastName: true } },
      raisedBy: { select: { name: true } },
      incident: { select: { reference: true, title: true, severity: true, status: true } },
    },
  });

  return ok({ data: escalations });
});

/**
 * POST /api/escalations
 *
 * Raising a concern. Available to caregivers, nurses, ops, families and seniors — anyone
 * involved in the care can pull this cord, which is the point of having one.
 *
 * The routing comes from the configured rule, and the level is never EMERGENCY_SERVICES:
 * calling emergency services is a human decision that the person present makes, and the
 * response text says so rather than leaving them waiting for us.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('escalation:raise');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, createEscalationSchema);

  if (!(await canAccessSenior(user, input.seniorId))) {
    throw new ApiError('FORBIDDEN', 'You do not have access to that patient.');
  }

  const [senior, rules] = await Promise.all([
    prisma.senior.findUnique({
      where: { id: input.seniorId },
      select: {
        firstName: true,
        lastName: true,
        supervisingNurse: { select: { userId: true } },
      },
    }),
    prisma.escalationRule.findMany({ where: { isActive: true } }),
  ]);

  if (!senior) throw new ApiError('NOT_FOUND', 'That patient could not be found.');

  const plan = resolveEscalation(input.trigger, rules);
  // A client may request a level, but never above OPS — the platform does not dispatch
  // emergency services, and it will not record that it did.
  const level =
    input.level && input.level !== 'EMERGENCY_SERVICES' ? input.level : plan.level;

  const escalation = await prisma.escalation.create({
    data: {
      seniorId: input.seniorId,
      incidentId: input.incidentId ?? null,
      trigger: input.trigger,
      level,
      reason: input.reason,
      raisedByUserId: user.id,
    },
  });

  if (level === 'NURSE' && senior.supervisingNurse?.userId) {
    await notify({
      userId: senior.supervisingNurse.userId,
      type: 'REVIEW_REQUIRED',
      title: 'A concern has been escalated to you',
      body: `${user.name} raised a concern about ${senior.firstName} ${senior.lastName}: ${input.reason} Target response: ${plan.withinMinutes} minutes.`,
      severity: 'WARNING',
      href: '/app/nurse/escalations',
      seniorId: input.seniorId,
    }).catch((error) => log.warn('escalation.notify.nurse.failed', { error: String(error) }));
  } else {
    await notifyInternal({
      type: 'REVIEW_REQUIRED',
      title: 'A concern has been escalated',
      body: `${user.name} raised a concern about ${senior.firstName} ${senior.lastName}: ${input.reason}`,
      severity: 'WARNING',
      href: '/app/admin/incidents',
      seniorId: input.seniorId,
    }).catch((error) => log.warn('escalation.notify.ops.failed', { error: String(error) }));
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'escalation.raised',
    entity: 'Escalation',
    entityId: escalation.id,
    seniorId: input.seniorId,
    metadata: { trigger: input.trigger, level },
  });

  return created({
    id: escalation.id,
    level,
    targetResponseMinutes: plan.withinMinutes,
    message: `Raised. Someone will respond within ${plan.withinMinutes} minutes. If the situation is medically urgent, call emergency services now — do not wait for us to respond.`,
  });
});
