import { redirect } from 'next/navigation';
import { getSessionUser, type SessionUser } from './session';
import { ROLE_HOME, type Role } from './constants';

/**
 * Page-level guards for server components. API routes use requireUser/requireCapability
 * in lib/api.ts; pages need a redirect instead of a 401 body.
 */

export async function requirePageUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (roles && !roles.includes(user.role)) redirect(ROLE_HOME[user.role]);
  return user;
}

export async function currentUser(): Promise<SessionUser | null> {
  return getSessionUser();
}
