import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { ROLE_HOME } from '@/lib/constants';

/** /app is a router: each role has its own home. */
export default async function AppIndexPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  redirect(ROLE_HOME[user.role]);
}
