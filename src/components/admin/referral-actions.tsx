'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Field, Select, Textarea } from '@/components/ui';

/**
 * Moving a referral along.
 *
 * Declining requires a reason, and the partner receives it. A partner who never learns why
 * a referral was declined stops referring — and rightly so, because from their side it
 * looks like the patient was dropped.
 */
export function ReferralActions({
  referralId,
  status,
  areaServed,
}: {
  referralId: string;
  status: string;
  areaServed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/referrals/${referralId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: form.get('status'),
          statusNote: form.get('statusNote') || undefined,
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
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Update status
        </Button>
        {!areaServed && status === 'SUBMITTED' ? (
          <span className="self-center text-sm text-danger">
            We do not staff this area — decline honestly today.
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 space-y-4 rounded-card border border-[color:var(--border)] bg-sand-50 p-4"
    >
      {error ? (
        <Alert tone="danger" title="Not saved">
          {error}
        </Alert>
      ) : null}

      <Field label="Status" name="status">
        {({ id }) => (
          <Select
            id={id}
            name="status"
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value)}
          >
            <option value="SUBMITTED">Submitted</option>
            <option value="CONTACTED">Contacted the family</option>
            <option value="ASSESSMENT">Assessment arranged</option>
            <option value="CONVERTED">Converted to a patient</option>
            <option value="DECLINED">Declined</option>
            <option value="LOST">Lost</option>
          </Select>
        )}
      </Field>

      <Field
        label={nextStatus === 'DECLINED' ? 'Why are we declining?' : 'Note for the partner'}
        name="statusNote"
        required={nextStatus === 'DECLINED'}
        hint="The partner sees this. Be specific enough that they understand and keep referring."
      >
        {({ id }) => (
          <Textarea
            id={id}
            name="statusNote"
            rows={3}
            required={nextStatus === 'DECLINED'}
            defaultValue={
              nextStatus === 'DECLINED' && !areaServed
                ? 'We do not currently staff this area, so we cannot take this referral. We have told the family directly and offered the waitlist.'
                : ''
            }
          />
        )}
      </Field>

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={busy}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
