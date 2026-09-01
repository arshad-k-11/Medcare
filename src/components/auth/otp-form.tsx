'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Field, Input } from '@/components/ui';

/**
 * One-time code sign-in.
 *
 * Two screens in one component so the phone number does not have to be re-entered, and the
 * code field is focused automatically — this flow is used most on a phone, often by someone
 * who is not confident with the device.
 */
export function OtpForm() {
  const router = useRouter();
  const [stage, setStage] = useState<'PHONE' | 'CODE'>('PHONE');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (stage === 'CODE') codeRef.current?.focus();
  }, [stage]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestCode(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'LOGIN' }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'We could not send a code. Please try again.');
        return;
      }
      setNotice(body.message);
      setCooldown(body.cooldownSeconds ?? 60);
      setStage('CODE');
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: form.get('code'), purpose: 'LOGIN' }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'That code did not work. Please try again.');
        return;
      }
      router.push(body.redirectTo);
      router.refresh();
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-ink-900">Sign in with a code</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        {stage === 'PHONE'
          ? 'We will text a 6-digit code to your mobile number. No password needed.'
          : `Enter the code we sent to ${phone}.`}
      </p>

      {formError ? (
        <Alert tone="danger" title="Something went wrong" className="mt-5">
          {formError}
        </Alert>
      ) : null}

      {notice && stage === 'CODE' ? (
        <Alert tone="info" className="mt-5">
          {notice}
        </Alert>
      ) : null}

      {stage === 'PHONE' ? (
        <form onSubmit={requestCode} className="mt-6 space-y-4" noValidate>
          <Field
            label="Mobile number"
            name="phone"
            error={errors.phone}
            required
            hint="The number registered with us."
          >
            {({ id, invalid }) => (
              <Input
                id={id}
                name="phone"
                type="tel"
                inputMode="tel"
                invalid={invalid}
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            )}
          </Field>

          <Button type="submit" size="lg" fullWidth loading={submitting}>
            Send me a code
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-6 space-y-4" noValidate>
          <Field label="6-digit code" name="code" error={errors.code} required>
            {({ id, invalid }) => (
              <Input
                ref={codeRef}
                id={id}
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                invalid={invalid}
                className="text-center text-2xl tracking-[0.4em]"
                placeholder="••••••"
                required
              />
            )}
          </Field>

          <Button type="submit" size="lg" fullWidth loading={submitting}>
            Sign in
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStage('PHONE');
                setNotice(null);
              }}
              className="font-medium text-ink-600 hover:text-brand-700 hover:underline"
            >
              Change number
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || submitting}
              onClick={() => requestCode()}
              className="font-medium text-brand-700 hover:underline disabled:cursor-not-allowed disabled:text-ink-400 disabled:no-underline"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 border-t border-[color:var(--border)] pt-5 text-center text-sm text-ink-600">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in with a password instead
        </Link>
      </p>
      <p className="mt-3 text-center text-xs leading-relaxed text-ink-500">
        Not receiving codes? Call us and we will help you in. We would rather talk to you than leave
        you locked out.
      </p>
    </Card>
  );
}
