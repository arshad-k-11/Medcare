import { NextResponse } from 'next/server';
import { destroyCurrentSession, getSessionUser } from '@/lib/session';
import { audit } from '@/lib/audit';

/**
 * GET /logout
 *
 * A plain link target, so signing out works without JavaScript — which matters for the
 * caregiver and senior surfaces on low-end devices. The POST API route exists too, for
 * client-side sign-out.
 */
export async function GET(request: Request) {
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

  return NextResponse.redirect(new URL('/login', request.url));
}
