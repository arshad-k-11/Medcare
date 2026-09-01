'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Checkbox, Field, Select, Textarea } from '@/components/ui';
import { SEVERITIES, SEVERITY_LABELS, label } from '@/lib/constants';

/**
 * Nurse and ops actions on an incident: confirm severity, record what was done, decide
 * whether the family is told, and close it.
 *
 * Closing requires a resolution — the API enforces it too, but asking here means the nurse
 * writes it while they still remember, rather than being blocked by an error afterwards.
 */
export function IncidentActions({
  incidentId,
  severity,
  status,
  familyNotified,
}: {
  incidentId: string;
  severity: string;
  status: string;
  familyNotified: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifyFamily, setNotifyFamily] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const nextStatus = String(form.get('status') ?? '');

    try {
      const response = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus || undefined,
          severity: form.get('severity') || undefined,
          actionsTaken: form.get('actionsTaken') || undefined,
          resolution: form.get('resolution') || undefined,
          notifyFamily: notifyFamily || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.fields
            ? Object.values(body.error.fields).join(' ')
            : (body?.error?.message ?? 'That could not be saved.'),
        );
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-3">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Update this incident
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4 rounded-card border border-[color:var(--border)] bg-sand-50 p-4">
      {error ? (
        <Alert tone="danger" title="Not saved">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Confirm severity"
          name="severity"
          hint="Your judgement replaces the reporter's. This is what makes it a clinical determination."
        >
          {({ id }) => (
            <Select id={id} name="severity" defaultValue={severity}>
              {SEVERITIES.map((option) => (
                <option key={option} value={option}>
                  {label(SEVERITY_LABELS, option)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Status" name="status">
          {({ id }) => (
            <Select id={id} name="status" defaultValue={status}>
              <option value="OPEN">Open</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="ACTION_TAKEN">Action taken</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </Select>
          )}
        </Field>
      </div>

      <Field label="What was done" name="actionsTaken">
        {({ id }) => <Textarea id={id} name="actionsTaken" rows={3} />}
      </Field>

      <Field
        label="Resolution"
        name="resolution"
        hint="Required to close. Write what actually resolved it, not that it was resolved."
      >
        {({ id }) => <Textarea id={id} name="resolution" rows={3} />}
      </Field>

      {!familyNotified ? (
        <Checkbox
          label="Tell the family about this incident"
          description="They receive the recorded facts and that a nurse is reviewing it — never an interpretation."
          checked={notifyFamily}
          onChange={(event) => setNotifyFamily(event.target.checked)}
        />
      ) : (
        <p className="text-sm text-ink-500">The family has already been told about this incident.</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={submitting}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
