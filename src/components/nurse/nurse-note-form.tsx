'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardHeader, Checkbox, Field, Select, Textarea } from '@/components/ui';

/**
 * Adds a nurse note to a patient's record.
 *
 * `visibleToFamily` defaults to true. Internal-only is a deliberate exception a nurse has
 * to choose, not the default — a record that is mostly hidden from the family stops being a
 * record the family can trust.
 */
export function NurseNoteForm({ seniorId }: { seniorId: string }) {
  const router = useRouter();
  const [visibleToFamily, setVisibleToFamily] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const formElement = event.currentTarget;

    try {
      const response = await fetch('/api/care-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorId,
          type: form.get('type'),
          body: form.get('body'),
          visibleToFamily,
          requiresReview: false,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? 'That could not be saved. Please try again.');
        return;
      }
      setDone(true);
      formElement.reset();
      router.refresh();
      setTimeout(() => setDone(false), 4000);
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Add a note" description="Goes into the care record immediately." />
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-4" noValidate>
        {error ? (
          <Alert tone="danger" title="Not saved">
            {error}
          </Alert>
        ) : null}
        {done ? <Alert tone="success">Note saved to the care record.</Alert> : null}

        <Field label="Type" name="type">
          {({ id }) => (
            <Select id={id} name="type" defaultValue="NURSE_REVIEW">
              <option value="NURSE_REVIEW">Nurse review</option>
              <option value="CONCERN">Concern</option>
              <option value="FAMILY_COMMUNICATION">Family communication</option>
              <option value="CARE_PLAN_CHANGE">Care-plan change</option>
              <option value="DAILY">General note</option>
            </Select>
          )}
        </Field>

        <Field label="Note" name="body" required>
          {({ id }) => (
            <Textarea
              id={id}
              name="body"
              rows={5}
              required
              placeholder="What you observed, what you decided, and what happens next."
            />
          )}
        </Field>

        <Checkbox
          label="Visible to the family"
          description="Uncheck only for internal clinical discussion. Families should see the substance of their parent's care."
          checked={visibleToFamily}
          onChange={(event) => setVisibleToFamily(event.target.checked)}
        />

        <Button type="submit" fullWidth loading={submitting}>
          Save note
        </Button>
      </form>
    </Card>
  );
}
