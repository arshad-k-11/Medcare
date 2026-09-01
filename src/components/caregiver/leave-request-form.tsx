'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardHeader, Field, Input, Select, Textarea } from '@/components/ui';

export function LeaveRequestForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromDate: new Date(`${form.get('fromDate')}T00:00:00`).toISOString(),
          toDate: new Date(`${form.get('toDate')}T23:59:00`).toISOString(),
          reason: form.get('reason'),
          type: form.get('type'),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'That could not be sent. Please try again.');
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setFormError('No connection. Please call operations rather than waiting.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="p-5">
        <Alert tone="success" title="Request sent">
          <p>
            Operations have your request and will decide shortly. Keep working to your normal
            schedule until it is approved. If this is urgent, call them as well.
          </p>
        </Alert>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setDone(false)}>
          Request more time off
        </Button>
      </Card>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader title="Request time off" />
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-4" noValidate>
        {formError ? (
          <Alert tone="danger" title="Not sent">
            {formError}
          </Alert>
        ) : null}

        <Field label="Type" name="type" error={errors.type}>
          {({ id, invalid }) => (
            <Select id={id} name="type" invalid={invalid} defaultValue="PLANNED">
              <option value="PLANNED">Planned leave</option>
              <option value="SICK">Sick leave</option>
              <option value="EMERGENCY">Emergency</option>
            </Select>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From" name="fromDate" error={errors.fromDate} required>
            {({ id, invalid }) => (
              <Input id={id} name="fromDate" type="date" min={today} invalid={invalid} required />
            )}
          </Field>
          <Field label="To" name="toDate" error={errors.toDate} required>
            {({ id, invalid }) => (
              <Input id={id} name="toDate" type="date" min={today} invalid={invalid} required />
            )}
          </Field>
        </div>

        <Field
          label="Reason"
          name="reason"
          error={errors.reason}
          required
          hint="Enough for operations to plan cover. You do not need to share medical detail."
        >
          {({ id, invalid }) => (
            <Textarea id={id} name="reason" rows={3} invalid={invalid} required />
          )}
        </Field>

        <Button type="submit" fullWidth loading={submitting}>
          Send request
        </Button>
      </form>
    </Card>
  );
}
