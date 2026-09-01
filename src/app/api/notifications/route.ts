import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  handler,
  ok,
  paginated,
  pagination,
  parseBody,
  parseQuery,
  requireUser,
} from '@/lib/api';
import { notificationPreferenceSchema } from '@/lib/validation/business';
import { paginationQuery } from '@/lib/validation/common';
import { audit } from '@/lib/audit';

const listQuery = paginationQuery.extend({
  unread: z.enum(['true', 'false']).optional(),
});

/**
 * GET /api/notifications — the caller's own notifications, never anyone else's.
 *
 * There is no `userId` parameter by design: the only readable inbox is the session's.
 */
export const GET = handler(async (request) => {
  const user = await requireUser();
  const query = parseQuery(request, listQuery);
  const { page, pageSize, skip, take } = pagination(query);

  const where = {
    userId: user.id,
    channel: 'IN_APP',
    ...(query.unread === 'true' ? { readAt: null } : {}),
  };

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, channel: 'IN_APP', readAt: null } }),
  ]);

  return ok({ ...paginated(data, total, page, pageSize), unreadCount });
});

/** PATCH /api/notifications — update notification preferences. */
export const PATCH = handler(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, notificationPreferenceSchema);

  await prisma.$transaction(
    input.preferences.map((preference) =>
      prisma.notificationPreference.upsert({
        where: {
          userId_type_channel: {
            userId: user.id,
            type: preference.type,
            channel: preference.channel,
          },
        },
        create: {
          userId: user.id,
          type: preference.type,
          channel: preference.channel,
          enabled: preference.enabled,
        },
        update: { enabled: preference.enabled },
      }),
    ),
  );

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'notification-preferences.updated',
    entity: 'NotificationPreference',
    entityId: user.id,
    metadata: { count: input.preferences.length },
  });

  return ok({ ok: true });
});
