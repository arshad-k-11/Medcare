'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Card, Field, Input } from '@/components/ui';

export function ForgotPasswordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email') }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'Please try again.');
        return;
      }
      setSent(body.message);
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Card className="p-6 sm:p-8">
        <Alert tone="success" title="Check your email">
          <p>{sent}</p>
        </Alert>
        <p className="mt-5 text-sm text-ink-600">
          The link is valid for 30 minutes. If nothing arrives, you can{' '}
          <Link href="/login/otp" className="font-semibold text-brand-700 hover:underline">
            sign in with a one-time code
          </Link>{' '}
          instead, or call us.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-ink-900">Reset your password</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        Enter the email address on your account and we will send a reset link.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {formError ? (
          <Alert tone="danger" title="Something went wrong">
            {formError}
          </Alert>
        ) : null}

        <Field label="Email" name="email" error={errors.email} required>
          {({ id, invalid }) => (
            <Input
              id={id}
              name="email"
              type="email"
              invalid={invalid}
              autoComplete="email"
              autoCapitalize="none"
              required
            />
          )}
        </Field>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Send reset link
        </Button>
      </form>

      <p className="mt-6 border-t border-[color:var(--border)] pt-5 text-center text-sm text-ink-600">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');

    if (password !== confirm) {
      setErrors({ confirm: 'The two passwords do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'Please try again.');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Card className="p-6 sm:p-8">
        <Alert tone="danger" title="This link is incomplete">
          <p>
            The reset link is missing its token. Please open the link from your email again, or
            request a new one.
          </p>
        </Alert>
        <Link
          href="/forgot-password"
          className="mt-5 inline-block text-sm font-semibold text-brand-700 hover:underline"
        >
          Request a new reset link →
        </Link>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="p-6 sm:p-8">
        <Alert tone="success" title="Password changed">
          <p>
            Your password has been changed and you have been signed out on every other device.
            Taking you to sign in…
          </p>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-ink-900">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        Setting a new password signs you out everywhere else, in case someone else had access.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {formError ? (
          <Alert tone="danger" title="Something went wrong">
            {formError}
          </Alert>
        ) : null}

        <Field
          label="New password"
          name="password"
          error={errors.password}
          required
          hint="At least 10 characters, including a number or a symbol."
        >
          {({ id, invalid }) => (
            <Input
              id={id}
              name="password"
              type="password"
              invalid={invalid}
              autoComplete="new-password"
              required
            />
          )}
        </Field>

        <Field label="Confirm new password" name="confirm" error={errors.confirm} required>
          {({ id, invalid }) => (
            <Input
              id={id}
              name="confirm"
              type="password"
              invalid={invalid}
              autoComplete="new-password"
              required
            />
          )}
        </Field>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Set new password
        </Button>
      </form>
    </Card>
  );
}
