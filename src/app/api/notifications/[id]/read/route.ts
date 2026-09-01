import { prisma } from '@/lib/db';
import { handler, ok, requireUser, type RouteContext } from '@/lib/api';

/**
 * POST /api/notifications/:id/read
 *
 * Scoped by userId in the where clause rather than by a lookup-then-check, so a caller
 * cannot mark someone else's notification read even by guessing an id.
 */
export const POST = handler<RouteContext<{ id: string }>>(async (_request, { params }) => {
  const user = await requireUser();
  const { id } = await params;

  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return ok({ ok: true });
});
