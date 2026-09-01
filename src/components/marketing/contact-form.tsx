'use client';

import { useState } from 'react';
import { Alert, Button, ButtonLink, Card, Checkbox, Field, Input, Textarea } from '@/components/ui';

/**
 * General contact form.
 *
 * Kept deliberately short. Anyone with a real care need is better served by the intake
 * funnel, so the form points them there rather than collecting half the same information
 * in a free-text box.
 */
export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [consent, setConsent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    if (!consent) {
      setFormError('We need your permission to reply to you.');
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          phone: form.get('phone'),
          email: form.get('email'),
          subject: form.get('subject'),
          message: form.get('message'),
          consentToContact: true,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'Something went wrong. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      setFormError('We could not reach the server. Please check your connection or call us.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Card className="p-6">
        <Alert tone="success" title="Message received">
          <p>
            Thank you — we have your message and will reply during operating hours, usually within one
            working day. If the situation is urgent, please call us instead of waiting for the reply.
          </p>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-ink-900">Send us a message</h2>
      <p className="mt-1.5 text-sm text-ink-600">
        For a specific care need, the{' '}
        <a href="/get-assessment" className="font-semibold text-brand-700 hover:underline">
          free assessment
        </a>{' '}
        gets you a faster and more useful answer than this form.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {formError ? (
          <Alert tone="danger" title="Please check the form">
            {formError}
          </Alert>
        ) : null}

        <Field label="Your name" name="name" error={errors.name} required>
          {({ id, invalid }) => <Input id={id} name="name" invalid={invalid} autoComplete="name" />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" name="phone" error={errors.phone} required>
            {({ id, invalid }) => (
              <Input id={id} name="phone" type="tel" invalid={invalid} autoComplete="tel" />
            )}
          </Field>
          <Field label="Email" name="email" error={errors.email} hint="Optional">
            {({ id, invalid }) => (
              <Input id={id} name="email" type="email" invalid={invalid} autoComplete="email" />
            )}
          </Field>
        </div>

        <Field label="Subject" name="subject" error={errors.subject} required>
          {({ id, invalid }) => <Input id={id} name="subject" invalid={invalid} />}
        </Field>

        <Field
          label="Message"
          name="message"
          error={errors.message}
          required
          hint="Please do not include detailed medical information here — we will collect that securely during the assessment."
        >
          {({ id, invalid }) => <Textarea id={id} name="message" invalid={invalid} rows={5} />}
        </Field>

        <Checkbox
          label="You may contact me about this enquiry"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Send message
        </Button>

        <div className="rounded-card border border-[color:var(--border)] bg-sand-50 p-4">
          <p className="text-sm font-semibold text-ink-900">Need care arranged, not a conversation?</p>
          <ButtonLink href="/get-assessment" variant="outline" size="sm" className="mt-3">
            Start the free assessment
          </ButtonLink>
        </div>
      </form>
    </Card>
  );
}
