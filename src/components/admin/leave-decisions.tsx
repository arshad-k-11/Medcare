'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Input } from '@/components/ui';

/**
 * Approving or rejecting leave.
 *
 * Approving is the consequential action: it flags the caregiver's assignments as needing
 * replacement and marks affected visits at risk, which is what surfaces the cover problem
 * to operations now rather than on the morning of the visit. The confirmation says how many
 * visits were affected so the decision-maker sees the cost immediately.
 */
export function LeaveDecisions({
  requests,
}: {
  requests: {
    id: string;
    name: string;
    fromDate: string;
    toDate: string;
    type: string;
    reason: string;
  }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function decide(id: string, status: 'APPROVED' | 'REJECTED', note: string) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, decisionNote: note || undefined }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? 'That could not be saved.');
        return;
      }
      setNotice(
        status === 'APPROVED'
          ? `Approved. ${body.affectedAssignments} assignment(s) flagged for cover and ${body.affectedVisits} visit(s) marked at risk.`
          : 'Rejected, and the staff member has been told.',
      );
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-5 py-4">
      {error ? (
        <Alert tone="danger" title="Not saved" className="mb-4">
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert tone="success" className="mb-4">
          {notice}
        </Alert>
      ) : null}

      <ul className="space-y-4">
        {requests.map((request) => (
          <li key={request.id} className="rounded-card border border-[color:var(--border)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink-900">{request.name}</p>
                <p className="text-sm text-ink-600">
                  {request.type} · {request.fromDate} – {request.toDate}
                </p>
                <p className="mt-1 text-sm text-ink-700">{request.reason}</p>
              </div>
            </div>

            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const note = String(new FormData(event.currentTarget).get('note') ?? '');
                const action = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
                void decide(request.id, action?.value === 'REJECTED' ? 'REJECTED' : 'APPROVED', note);
              }}
            >
              <div className="min-w-[14rem] flex-1">
                <label
                  htmlFor={`note-${request.id}`}
                  className="text-xs font-semibold uppercase tracking-wide text-ink-500"
                >
                  Note (optional)
                </label>
                <Input id={`note-${request.id}`} name="note" className="mt-1" />
              </div>
              <Button type="submit" name="decision" value="APPROVED" loading={busy === request.id}>
                Approve
              </Button>
              <Button
                type="submit"
                name="decision"
                value="REJECTED"
                variant="outline"
                disabled={busy === request.id}
              >
                Reject
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
