'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from '@/components/ui';

/**
 * Adds a medical appointment.
 *
 * Families ask for this constantly — they know about the follow-up, we do not, and the
 * appointment nobody entered is the appointment nobody attends. So it is a form on the
 * family surface rather than something only ops can do.
 */
export function AppointmentForm({
  seniorId,
  seniorName,
}: {
  seniorId: string;
  seniorName: string;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [transport, setTransport] = useState(false);
  const [companion, setCompanion] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const date = String(form.get('date') ?? '');
    const time = String(form.get('time') ?? '');

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorId,
          title: form.get('title'),
          doctorName: form.get('doctorName') || undefined,
          facility: form.get('facility') || undefined,
          specialty: form.get('specialty') || undefined,
          scheduledAt: new Date(`${date}T${time || '10:00'}:00`).toISOString(),
          durationMinutes: Number(form.get('durationMinutes') ?? 60),
          purpose: form.get('purpose') || undefined,
          transportRequired: transport,
          companionRequired: companion,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'We could not save this. Please try again.');
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="p-5">
        <Alert tone="success" title="Appointment added">
          <p>
            It is now on {seniorName}&rsquo;s calendar and visible to the care team. If you asked for
            transport or an escort, your coordinator will confirm the arrangements.
          </p>
        </Alert>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setDone(false)}>
          Add another
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Add an appointment"
        description="We will coordinate transport, an escort and a written outcome."
      />
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-4" noValidate>
        {formError ? (
          <Alert tone="danger" title="Could not save">
            {formError}
          </Alert>
        ) : null}

        <Field label="What is it?" name="title" error={errors.title} required>
          {({ id, invalid }) => (
            <Input
              id={id}
              name="title"
              invalid={invalid}
              placeholder="e.g. Orthopaedic follow-up"
              required
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" name="date" error={errors.scheduledAt} required>
            {({ id, invalid }) => (
              <Input id={id} name="date" type="date" invalid={invalid} required />
            )}
          </Field>
          <Field label="Time" name="time" error={errors.time}>
            {({ id, invalid }) => (
              <Input id={id} name="time" type="time" invalid={invalid} defaultValue="10:00" />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Doctor" name="doctorName" error={errors.doctorName}>
            {({ id, invalid }) => <Input id={id} name="doctorName" invalid={invalid} />}
          </Field>
          <Field label="Clinic or hospital" name="facility" error={errors.facility}>
            {({ id, invalid }) => <Input id={id} name="facility" invalid={invalid} />}
          </Field>
        </div>

        <Field label="How long will it take?" name="durationMinutes" error={errors.durationMinutes}>
          {({ id, invalid }) => (
            <Select id={id} name="durationMinutes" invalid={invalid} defaultValue="60">
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="240">Half a day</option>
            </Select>
          )}
        </Field>

        <Field
          label="Anything the caregiver should know"
          name="purpose"
          error={errors.purpose}
          hint="Papers to take, whether it is a fasting test, who else is coming."
        >
          {({ id, invalid }) => <Textarea id={id} name="purpose" invalid={invalid} rows={3} />}
        </Field>

        <div className="space-y-2 rounded-card border border-[color:var(--border)] bg-sand-50 p-4">
          <Checkbox
            label="Transport needed"
            checked={transport}
            onChange={(event) => setTransport(event.target.checked)}
          />
          <Checkbox
            label="A caregiver should go with them"
            description="Available on plans that include appointment escorts; otherwise billed separately."
            checked={companion}
            onChange={(event) => setCompanion(event.target.checked)}
          />
        </div>

        <Button type="submit" fullWidth loading={submitting}>
          Add appointment
        </Button>
      </form>
    </Card>
  );
}
