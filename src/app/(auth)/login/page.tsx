import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { getSessionUser } from '@/lib/session';
import { ROLE_HOME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // An already-signed-in user should not see a login form.
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);

  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : undefined;

  return <LoginForm nextPath={next} />;
}
