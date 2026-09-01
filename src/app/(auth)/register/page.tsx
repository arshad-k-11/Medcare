import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/auth/register-form';
import { getSessionUser } from '@/lib/session';
import { ROLE_HOME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Create a family account',
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);
  return <RegisterForm />;
}
