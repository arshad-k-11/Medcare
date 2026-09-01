'use client';

import { useState } from 'react';
import { Card, Textarea } from '@/components/ui';

/**
 * A senior asking for a call back.
 *
 * Everything about this component is sized for the person using it: a 20px+ label, a large
 * text area, one very large button, and a confirmation that says what will actually happen
 * ("somebody will telephone you") rather than "request submitted".
 *
 * It posts an escalation with the SENIOR_HELP_REQUEST trigger, which routes to operations
 * with a ten-minute target — a senior asking for help is not a support ticket.
 */
export function SeniorHelpRequest({ seniorId }: { seniorId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim();
    if (reason.length < 3) {
      setError('Please tell us a little about what you need.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/escalations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorId,
          trigger: 'SENIOR_HELP_REQUEST',
          reason,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.message ??
            'We could not send that. Please telephone us instead — the numbers are above.',
        );
        return;
      }
      setDone('We have your message. Somebody will telephone you shortly.');
    } catch {
      setError(
        'We could not send that. Please telephone us instead — the numbers are above.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="mt-4 border-[#b6dfc8] bg-[#f1faf5]">
        <div className="px-6 py-7">
          <p className="text-xl font-semibold text-[#0d6340]">{done}</p>
          <p className="mt-3 text-lg leading-relaxed text-[#0d6340]">
            If you feel unwell while you are waiting, please call for medical help.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <form onSubmit={onSubmit} className="px-6 py-6">
        {error ? (
          <p className="mb-4 rounded-card bg-[#fdf3f2] px-4 py-3 text-lg text-[#95190f]">{error}</p>
        ) : null}

        <label htmlFor="senior-help-reason" className="block text-xl font-semibold text-ink-900">
          What do you need?
        </label>
        <Textarea
          id="senior-help-reason"
          name="reason"
          rows={4}
          className="mt-3 text-lg"
          placeholder="For example: I have run out of my tablets."
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 flex min-h-[4rem] w-full items-center justify-center rounded-card bg-brand-700 px-6 text-xl font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Ask us to call me'}
        </button>
      </form>
    </Card>
  );
}
