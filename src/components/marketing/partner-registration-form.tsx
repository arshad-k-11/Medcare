'use client';

import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Field, Input, Select, Textarea } from '@/components/ui';
import { PARTNER_TYPES, PARTNER_TYPE_LABELS, label } from '@/lib/constants';

type FieldErrors = Record<string, string>;

/**
 * Partner registration request.
 *
 * Submits an *application*, not an account: the API creates an invited partner user and
 * notifies operations, because a referral partner receives patient-adjacent information
 * and that relationship should be reviewed by a person before it is live. The form says so
 * rather than implying instant access.
 */
export function PartnerRegistrationForm({ areas }: { areas: { id: string; name: string }[] }) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const [consent, setConsent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    if (!consent) {
      setFormError('Please confirm you are authorised to register this organisation.');
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(
      [...form.entries()].map(([key, value]) => [key, typeof value === 'string' ? value : '']),
    );

    setSubmitting(true);
    try {
      const response = await fetch('/api/public/partner-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'Something went wrong. Please try again.');
        return;
      }
      setDone({ reference: body.reference });
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="p-6">
        <Alert tone="success" title="Request received">
          <p>
            Your reference is <strong className="font-semibold">{done.reference}</strong>. Our
            operations team reviews every partner request before enabling an account, usually within
            one working day. We will contact you on the details you gave us.
          </p>
        </Alert>
        <p className="mt-4 text-sm text-ink-600">
          If you have a patient being discharged today, do not wait for the account — call our
          operations team and we will take the referral directly.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-ink-900">Partner registration request</h2>
      <p className="mt-1.5 text-sm text-ink-600">
        Reviewed by a person before an account is enabled — partners receive patient-adjacent
        information, so this is not instant.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {formError ? (
          <Alert tone="danger" title="Please check the form">
            {formError}
          </Alert>
        ) : null}

        <Field
          label="Organisation name"
          name="organisationName"
          error={errors.organisationName}
          required
        >
          {({ id, invalid }) => (
            <Input id={id} name="organisationName" invalid={invalid} autoComplete="organization" />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type of organisation" name="partnerType" error={errors.partnerType} required>
            {({ id, invalid }) => (
              <Select id={id} name="partnerType" invalid={invalid} defaultValue="HOSPITAL">
                {PARTNER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {label(PARTNER_TYPE_LABELS, type)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Area" name="area" error={errors.area}>
            {({ id, invalid }) => (
              <Select id={id} name="area" invalid={invalid} defaultValue="">
                <option value="">Select an area</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.name}>
                    {area.name}
                  </option>
                ))}
                <option value="Other">Somewhere else in Mumbai</option>
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" name="contactPerson" error={errors.contactPerson} required>
            {({ id, invalid }) => (
              <Input id={id} name="contactPerson" invalid={invalid} autoComplete="name" />
            )}
          </Field>
          <Field label="Your role" name="designation" error={errors.designation}>
            {({ id, invalid }) => (
              <Input
                id={id}
                name="designation"
                invalid={invalid}
                placeholder="e.g. Discharge coordinator"
              />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Work email" name="email" error={errors.email} required>
            {({ id, invalid }) => (
              <Input id={id} name="email" type="email" invalid={invalid} autoComplete="email" />
            )}
          </Field>
          <Field label="Phone" name="phone" error={errors.phone} required>
            {({ id, invalid }) => (
              <Input id={id} name="phone" type="tel" invalid={invalid} autoComplete="tel" />
            )}
          </Field>
        </div>

        <Field
          label="Anything we should know"
          name="notes"
          error={errors.notes}
          hint="Typical patient profile, expected volume, or a question."
        >
          {({ id, invalid }) => <Textarea id={id} name="notes" invalid={invalid} rows={3} />}
        </Field>

        <Checkbox
          label="I am authorised to register this organisation"
          description="We will not share patient information with a partner account until this is confirmed with you."
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Send registration request
        </Button>

        <p className="text-xs leading-relaxed text-ink-500">
          We use these details to contact you about the partnership. Read our{' '}
          <a href="/legal/privacy" className="font-medium text-brand-700 hover:underline">
            privacy notice
          </a>
          .
        </p>
      </form>
    </Card>
  );
}
