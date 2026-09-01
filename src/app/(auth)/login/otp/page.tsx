import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OtpForm } from '@/components/auth/otp-form';
import { getSessionUser } from '@/lib/session';
import { ROLE_HOME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Sign in with a code',
  robots: { index: false, follow: false },
};

export default async function OtpPage() {
  const user = await getSessionUser();
  if (user) redirect(ROLE_HOME[user.role]);
  return <OtpForm />;
}
