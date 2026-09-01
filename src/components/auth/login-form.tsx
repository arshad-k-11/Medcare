'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Field, Input } from '@/components/ui';

/**
 * Password sign-in.
 *
 * The OTP route is presented as an equal alternative rather than a fallback, because a
 * meaningful share of this product's users — caregivers on shared phones, seniors, family
 * members who signed up through the funnel and never set a password — will never
 * successfully use a password.
 */
export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: form.get('identifier'),
          password: form.get('password'),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'We could not sign you in. Please try again.');
        return;
      }
      // A full navigation, so the server layout re-reads the session cookie.
      router.push(nextPath && nextPath.startsWith('/app') ? nextPath : body.redirectTo);
      router.refresh();
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-ink-900">Sign in</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        For families, seniors, caregivers, nurses and partners.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {formError ? (
          <Alert tone="danger" title="Could not sign in">
            {formError}
          </Alert>
        ) : null}

        <Field
          label="Email or mobile number"
          name="identifier"
          error={errors.identifier}
          required
        >
          {({ id, invalid }) => (
            <Input
              id={id}
              name="identifier"
              invalid={invalid}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          )}
        </Field>

        <Field label="Password" name="password" error={errors.password} required>
          {({ id, invalid }) => (
            <Input
              id={id}
              name="password"
              type="password"
              invalid={invalid}
              autoComplete="current-password"
              required
            />
          )}
        </Field>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Sign in
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-200" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">or</span>
        <span className="h-px flex-1 bg-ink-200" aria-hidden="true" />
      </div>

      <Link
        href="/login/otp"
        className="tap-target flex w-full items-center justify-center rounded-[10px] border border-ink-300 bg-white px-4 text-[0.9375rem] font-semibold text-ink-900 hover:border-ink-400 hover:bg-ink-50"
      >
        Sign in with a one-time code
      </Link>
      <p className="mt-2 text-center text-xs text-ink-500">
        We send a 6-digit code to your mobile number. No password needed.
      </p>

      <p className="mt-6 border-t border-[color:var(--border)] pt-5 text-center text-sm text-ink-600">
        New here?{' '}
        <Link href="/register" className="font-semibold text-brand-700 hover:underline">
          Create a family account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-ink-600">
        Just want care arranged?{' '}
        <Link href="/get-assessment" className="font-semibold text-brand-700 hover:underline">
          Start with a free assessment
        </Link>{' '}
        — no account needed.
      </p>
    </Card>
  );
}
