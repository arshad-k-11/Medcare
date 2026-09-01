import { prisma } from '@/lib/db';
import {
  created,
  enforceRateLimit,
  handler,
  ok,
  parseBody,
  requireCapability,
} from '@/lib/api';
import { crmTaskSchema } from '@/lib/validation/business';
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { formatDateTime } from '@/lib/format';

/** GET /api/crm-tasks — open follow-ups, soonest first. */
export const GET = handler(async () => {
  const user = await requireCapability('crm-task:manage');

  const tasks = await prisma.crmTask.findMany({
    where: { status: 'OPEN' },
    orderBy: { dueAt: 'asc' },
    include: {
      assignee: { select: { id: true, name: true } },
      lead: { select: { id: true, reference: true, contactName: true } },
    },
  });

  return ok({ data: tasks, mine: tasks.filter((task) => task.assigneeUserId === user.id).length });
});

/**
 * POST /api/crm-tasks — "call the family tomorrow at 11:00".
 *
 * The assignee is notified, because a task assigned to somebody who never sees it is a task
 * that does not exist.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('crm-task:manage');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, crmTaskSchema);

  const task = await prisma.crmTask.create({
    data: {
      title: input.title,
      details: input.details ?? null,
      dueAt: input.dueAt,
      priority: input.priority,
      leadId: input.leadId ?? null,
      assigneeUserId: input.assigneeUserId,
      createdByUserId: user.id,
    },
  });

  if (input.assigneeUserId !== user.id) {
    await notify({
      userId: input.assigneeUserId,
      type: 'SYSTEM',
      title: 'A follow-up has been assigned to you',
      body: `${input.title} — due ${formatDateTime(input.dueAt)}.`,
      severity: input.priority === 'HIGH' ? 'WARNING' : 'INFO',
      href: input.leadId ? `/app/admin/leads/${input.leadId}` : '/app/admin',
    }).catch((error) => log.warn('crm-task.notify.failed', { error: String(error) }));
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'crm-task.created',
    entity: 'CrmTask',
    entityId: task.id,
    metadata: { priority: input.priority, assigned: input.assigneeUserId !== user.id },
  });

  return created({ id: task.id });
});
