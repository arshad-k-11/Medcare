'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Checkbox, Field, Input, Select } from '@/components/ui';
import {
  CONTACT_CHANNELS,
  CONTACT_CHANNEL_LABELS,
  RELATIONSHIPS,
  RELATIONSHIP_LABELS,
  label,
} from '@/lib/constants';

/**
 * Family registration.
 *
 * Only family accounts are self-registerable. Staff, nurse, caregiver and partner accounts
 * are created by an administrator or through the reviewed partner-application flow — the
 * form does not offer a role field, and the API ignores one if sent.
 */
export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    if (!accepted) {
      setFormError('Please accept the terms and the privacy notice to continue.');
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          phone: form.get('phone'),
          password: form.get('password'),
          relationship: form.get('relationship'),
          city: form.get('city') || undefined,
          country: form.get('country') || 'India',
          preferredChannel: form.get('preferredChannel'),
          acceptTerms: true,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'We could not create the account. Please try again.');
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
      <h1 className="text-2xl font-semibold text-ink-900">Create a family account</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        For the family member arranging and paying for care. You can add the senior afterwards.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {formError ? (
          <Alert tone="danger" title="Could not create the account">
            {formError}
          </Alert>
        ) : null}

        <Field label="Your name" name="name" error={errors.name} required>
          {({ id, invalid }) => (
            <Input id={id} name="name" invalid={invalid} autoComplete="name" required />
          )}
        </Field>

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

        <Field
          label="Mobile number"
          name="phone"
          error={errors.phone}
          required
          hint="Include your country code if you are outside India."
        >
          {({ id, invalid }) => (
            <Input id={id} name="phone" type="tel" invalid={invalid} autoComplete="tel" required />
          )}
        </Field>

        <Field
          label="Password"
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

        <Field
          label="Your relationship to the person needing care"
          name="relationship"
          error={errors.relationship}
          required
        >
          {({ id, invalid }) => (
            <Select id={id} name="relationship" invalid={invalid} defaultValue="" required>
              <option value="">Select</option>
              {RELATIONSHIPS.map((option) => (
                <option key={option} value={option}>
                  {label(RELATIONSHIP_LABELS, option)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your city" name="city" error={errors.city}>
            {({ id, invalid }) => <Input id={id} name="city" invalid={invalid} />}
          </Field>
          <Field label="Your country" name="country" error={errors.country}>
            {({ id, invalid }) => (
              <Input id={id} name="country" invalid={invalid} defaultValue="India" />
            )}
          </Field>
        </div>

        <Field
          label="How should we contact you?"
          name="preferredChannel"
          error={errors.preferredChannel}
        >
          {({ id, invalid }) => (
            <Select id={id} name="preferredChannel" invalid={invalid} defaultValue="PHONE">
              {CONTACT_CHANNELS.map((option) => (
                <option key={option} value={option}>
                  {label(CONTACT_CHANNEL_LABELS, option)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="rounded-card border border-[color:var(--border)] bg-sand-50 p-4">
          <Checkbox
            label={
              <span>
                I accept the{' '}
                <Link href="/legal/terms" className="font-semibold text-brand-700 underline">
                  terms of service
                </Link>{' '}
                and the{' '}
                <Link href="/legal/privacy" className="font-semibold text-brand-700 underline">
                  privacy notice
                </Link>
              </span>
            }
            description="Both are drafts pending professional legal review, and we say so on the page rather than hiding it."
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 border-t border-[color:var(--border)] pt-5 text-center text-sm text-ink-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
