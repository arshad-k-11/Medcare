import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/password-reset-forms';
import { Card, Skeleton } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="space-y-4 p-8">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
