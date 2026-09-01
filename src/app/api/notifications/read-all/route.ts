import { prisma } from '@/lib/db';
import { handler, ok, requireUser } from '@/lib/api';

/** POST /api/notifications/read-all — clears the caller's unread badge. */
export const POST = handler(async () => {
  const user = await requireUser();

  const result = await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return ok({ marked: result.count });
});
