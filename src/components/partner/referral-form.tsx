'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { URGENCIES, URGENCY_LABELS, label } from '@/lib/constants';

/**
 * Referral submission.
 *
 * Under a minute to complete, which is the design constraint — a discharge coordinator with
 * eleven patients will not fill in a long form.
 *
 * The consent confirmation is the one thing that cannot be skipped, and the copy explains
 * why rather than treating it as a checkbox to click past: we are being handed another
 * person's health information.
 */
export function ReferralForm({
  areas,
  services,
  disabled,
}: {
  areas: { id: string; name: string; isActive: boolean }[];
  services: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ reference: string; message: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    if (!consent) {
      setFormError(
        'Please confirm the patient or their family has agreed to this referral. We cannot accept health information otherwise.',
      );
      return;
    }

    const form = new FormData(event.currentTarget);
    const dischargeDate = String(form.get('dischargeDate') ?? '');

    setSubmitting(true);
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: form.get('patientName'),
          patientAgeYears: form.get('patientAgeYears') || undefined,
          contactName: form.get('contactName'),
          contactPhone: form.get('contactPhone'),
          contactEmail: form.get('contactEmail') || undefined,
          patientArea: form.get('patientArea'),
          dischargeStatus: form.get('dischargeStatus'),
          dischargeDate: dischargeDate ? new Date(`${dischargeDate}T12:00:00`).toISOString() : undefined,
          reason: form.get('reason'),
          requestedServiceId: form.get('requestedServiceId') || undefined,
          urgency: form.get('urgency'),
          notes: form.get('notes') || undefined,
          consentConfirmed: true,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'That could not be sent. Please try again.');
        return;
      }
      setResult({ reference: body.reference, message: body.message });
      router.refresh();
    } catch {
      setFormError('We could not reach the server. Please call us instead if this is urgent.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card className="p-6">
        <Alert tone="success" title={`Referral ${result.reference} received`}>
          <p>{result.message}</p>
        </Alert>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setResult(null)}>
            Refer another patient
          </Button>
        </div>
      </Card>
    );
  }

  const activeAreas = areas.filter((area) => area.isActive);
  const inactiveAreas = areas.filter((area) => !area.isActive);

  return (
    <Card>
      <CardHeader
        title="Refer a patient"
        description="About a minute. You will see when we contact the family."
      />
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-4" noValidate>
        {formError ? (
          <Alert tone="danger" title="Not sent">
            {formError}
          </Alert>
        ) : null}

        {disabled ? (
          <Alert tone="warning" title="Your account is awaiting review">
            <p>
              Referrals are not accepted until our team has reviewed the partnership. If a patient is
              being discharged today, please call us and we will take it directly.
            </p>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Patient name" name="patientName" error={errors.patientName} required>
            {({ id, invalid }) => <Input id={id} name="patientName" invalid={invalid} required />}
          </Field>
          <Field label="Age" name="patientAgeYears" error={errors.patientAgeYears}>
            {({ id, invalid }) => (
              <Input id={id} name="patientAgeYears" type="number" min={40} max={120} invalid={invalid} />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Family contact name"
            name="contactName"
            error={errors.contactName}
            required
          >
            {({ id, invalid }) => <Input id={id} name="contactName" invalid={invalid} required />}
          </Field>
          <Field label="Family phone" name="contactPhone" error={errors.contactPhone} required>
            {({ id, invalid }) => (
              <Input id={id} name="contactPhone" type="tel" invalid={invalid} required />
            )}
          </Field>
        </div>

        <Field label="Family email" name="contactEmail" error={errors.contactEmail} hint="Optional">
          {({ id, invalid }) => <Input id={id} name="contactEmail" type="email" invalid={invalid} />}
        </Field>

        <Field
          label="Where does the patient live?"
          name="patientArea"
          error={errors.patientArea}
          required
          hint="We will tell you honestly and quickly if it is outside the areas we staff."
        >
          {({ id, invalid }) => (
            <Select id={id} name="patientArea" invalid={invalid} defaultValue="" required>
              <option value="">Select an area</option>
              <optgroup label="Areas we serve">
                {activeAreas.map((area) => (
                  <option key={area.id} value={area.name}>
                    {area.name}
                  </option>
                ))}
              </optgroup>
              {inactiveAreas.length ? (
                <optgroup label="Not currently served">
                  {inactiveAreas.map((area) => (
                    <option key={area.id} value={area.name}>
                      {area.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <option value="Elsewhere in Mumbai">Elsewhere in Mumbai</option>
            </Select>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Discharge status" name="dischargeStatus" error={errors.dischargeStatus}>
            {({ id, invalid }) => (
              <Select id={id} name="dischargeStatus" invalid={invalid} defaultValue="NOT_APPLICABLE">
                <option value="PRE_DISCHARGE">Being discharged soon</option>
                <option value="DISCHARGED_TODAY">Discharged today</option>
                <option value="DISCHARGED_THIS_WEEK">Discharged this week</option>
                <option value="NOT_APPLICABLE">Not a discharge</option>
              </Select>
            )}
          </Field>
          <Field label="Discharge date" name="dischargeDate" error={errors.dischargeDate}>
            {({ id, invalid }) => <Input id={id} name="dischargeDate" type="date" invalid={invalid} />}
          </Field>
        </div>

        <Field label="How soon is support needed?" name="urgency" error={errors.urgency}>
          {({ id, invalid }) => (
            <Select id={id} name="urgency" invalid={invalid} defaultValue="FEW_DAYS">
              {URGENCIES.map((option) => (
                <option key={option} value={option}>
                  {label(URGENCY_LABELS, option)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Why are you referring them?"
          name="reason"
          error={errors.reason}
          required
          hint="Enough for us to judge whether we can help. No detailed clinical history is needed here."
        >
          {({ id, invalid }) => (
            <Textarea
              id={id}
              name="reason"
              rows={4}
              invalid={invalid}
              required
              placeholder="e.g. Being discharged this evening after a chest infection. No attendant arranged and both children work full time."
            />
          )}
        </Field>

        <Field label="What do you think they need?" name="requestedServiceId" hint="Optional">
          {({ id, invalid }) => (
            <Select id={id} name="requestedServiceId" invalid={invalid} defaultValue="">
              <option value="">Let your team advise</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Anything else" name="notes" error={errors.notes}>
          {({ id, invalid }) => <Textarea id={id} name="notes" rows={2} invalid={invalid} />}
        </Field>

        <div className="rounded-card border border-[color:var(--border)] bg-sand-50 p-4">
          <Checkbox
            label="The patient or their family has agreed to this referral"
            description="We are being handed somebody else's health information, so this is required rather than a formality. We will not contact a family who has not agreed to it."
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={disabled}>
          Send referral
        </Button>
      </form>
    </Card>
  );
}
