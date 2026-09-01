'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, TriangleAlert } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  ChoiceCard,
  Field,
  Select,
  Textarea,
} from '@/components/ui';
import { INCIDENT_TYPES, INCIDENT_TYPE_LABELS, label } from '@/lib/constants';

/**
 * Report an issue to the nurse supervisor.
 *
 * The emergency notice sits above the form, not below it, because the worst possible
 * outcome of this screen is a caregiver carefully filling in a form while somebody needs an
 * ambulance. The form is for everything that is *not* that.
 *
 * Severity here is a report, not a determination — the copy says so, and the API records it
 * as unconfirmed until a nurse reviews it.
 */
export function EscalateForm({
  patients,
}: {
  patients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [seniorId, setSeniorId] = useState(patients[0]?.id ?? '');
  const [type, setType] = useState('HEALTH_CONCERN');
  const [severity, setSeverity] = useState('MEDIUM');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ reference: string; message: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorId,
          type,
          severity,
          title: form.get('title'),
          description: form.get('description'),
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
      setFormError(
        'No connection, so this was not sent. Please call your supervisor directly rather than waiting.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card className="p-6">
        <Alert tone="success" title={`Reported — reference ${result.reference}`}>
          <p>{result.message}</p>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => setResult(null)}>
          Report something else
        </Button>
      </Card>
    );
  }

  return (
    <>
      {/* Above the form, deliberately. */}
      <Card className="mb-5 border-[#f3c2bd] bg-[#fdf3f2]">
        <div className="px-5 py-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#95190f]">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
            Is this a medical emergency?
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#95190f]">
            Call emergency services now, then the family, then tell us. Do not fill in this form
            first. You will never be criticised for calling emergency services, and you do not need
            anyone&rsquo;s permission.
          </p>
          <a
            href="tel:112"
            className="tap-target mt-4 inline-flex items-center gap-2 rounded-[10px] bg-danger px-6 text-base font-semibold text-white hover:brightness-110"
          >
            <Phone className="h-5 w-5" aria-hidden="true" />
            Call emergency services
          </a>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Report an issue to the nurse"
          description="For anything that is not an emergency but needs somebody to know now."
        />
        <form onSubmit={onSubmit} className="space-y-5 px-5 py-4" noValidate>
          {formError ? (
            <Alert tone="danger" title="Not sent">
              {formError}
            </Alert>
          ) : null}

          <Field label="Which patient?" name="seniorId" error={errors.seniorId} required>
            {({ id, invalid }) => (
              <Select
                id={id}
                invalid={invalid}
                value={seniorId}
                onChange={(event) => setSeniorId(event.target.value)}
                required
              >
                {patients.length === 0 ? <option value="">No patients assigned</option> : null}
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="What kind of issue?" name="type" error={errors.type} required>
            {({ id, invalid }) => (
              <Select
                id={id}
                invalid={invalid}
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {INCIDENT_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {label(INCIDENT_TYPE_LABELS, option)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <fieldset>
            <legend className="text-sm font-semibold text-ink-800">
              How urgent does it feel to you?
            </legend>
            <p className="mt-1 text-sm text-ink-500">
              Your judgement decides how fast we respond. A nurse confirms the severity afterwards
              — you are not expected to get this exactly right.
            </p>
            <div className="mt-3 space-y-2">
              <ChoiceCard
                name="severity"
                value="HIGH"
                checked={severity === 'HIGH'}
                onChange={setSeverity}
                title="Urgent — someone should respond within minutes"
                description="A fall, a sudden change, or something you are genuinely worried about."
              />
              <ChoiceCard
                name="severity"
                value="MEDIUM"
                checked={severity === 'MEDIUM'}
                onChange={setSeverity}
                title="Needs attention today"
                description="Something has changed and the nurse should look at it within the hour."
              />
              <ChoiceCard
                name="severity"
                value="LOW"
                checked={severity === 'LOW'}
                onChange={setSeverity}
                title="Worth recording"
                description="Not urgent, but the care team should know."
              />
            </div>
          </fieldset>

          <Field
            label="In a few words, what happened?"
            name="title"
            error={errors.title}
            required
          >
            {({ id, invalid }) => (
              <Textarea
                id={id}
                name="title"
                rows={2}
                invalid={invalid}
                placeholder="e.g. Slipped in the bathroom, did not fall fully"
                required
              />
            )}
          </Field>

          <Field
            label="Tell us exactly what you saw"
            name="description"
            error={errors.description}
            required
            hint="What happened, what they said, what you did. Write what you observed, not what you think it means — the nurse decides that."
          >
            {({ id, invalid }) => (
              <Textarea id={id} name="description" rows={5} invalid={invalid} required />
            )}
          </Field>

          <Button type="submit" size="xl" fullWidth loading={submitting} variant="danger">
            Send to the nurse supervisor
          </Button>

          <p className="text-sm leading-relaxed text-ink-500">
            You will get a reference number. The nurse supervisor is alerted immediately, and for
            anything urgent they are asked to respond within fifteen minutes.
          </p>
        </form>
      </Card>
    </>
  );
}
