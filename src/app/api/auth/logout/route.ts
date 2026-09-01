import { handler, ok } from '@/lib/api';
import { destroyCurrentSession, getSessionUser } from '@/lib/session';
import { audit } from '@/lib/audit';

/**
 * POST /api/auth/logout
 *
 * Revokes the Session row as well as clearing the cookie, so the JWT stops working
 * immediately rather than remaining valid until it expires. Always returns success —
 * a logout that appears to fail leaves a user unsure whether they are still signed in,
 * which on a shared device is the worse outcome.
 */
export const POST = handler(async () => {
  const user = await getSessionUser();
  await destroyCurrentSession('USER_LOGOUT');

  if (user) {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.logout',
      entity: 'User',
      entityId: user.id,
    });
  }

  return ok({ ok: true });
});
