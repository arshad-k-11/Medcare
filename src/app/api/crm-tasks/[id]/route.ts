import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  ApiError,
  handler,
  ok,
  parseBody,
  requireCapability,
  type RouteContext,
} from '@/lib/api';
import { audit } from '@/lib/audit';

const schema = z.object({ status: z.enum(['OPEN', 'DONE', 'CANCELLED']) }).strict();

/** PATCH /api/crm-tasks/:id — complete or cancel a follow-up. */
export const PATCH = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('crm-task:manage');
  const { id } = await params;
  const input = await parseBody(request, schema);

  const task = await prisma.crmTask.findUnique({ where: { id }, select: { id: true } });
  if (!task) throw new ApiError('NOT_FOUND', 'That follow-up could not be found.');

  await prisma.crmTask.update({
    where: { id },
    data: {
      status: input.status,
      completedAt: input.status === 'DONE' ? new Date() : null,
    },
  });

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'crm-task.updated',
    entity: 'CrmTask',
    entityId: id,
    metadata: { status: input.status },
  });

  return ok({ ok: true });
});
