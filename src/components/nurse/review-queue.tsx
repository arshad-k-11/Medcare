'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, FileText } from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, Textarea } from '@/components/ui';
import { formatDateTime, formatVital } from '@/lib/format';
import { CARE_NOTE_TYPE_LABELS, label } from '@/lib/constants';
import { relativeTime } from '@/lib/format';

type NoteItem = {
  id: string;
  type: string;
  body: string;
  createdAt: string;
  authorName: string;
  seniorId: string;
  seniorName: string;
  area: string;
};

type VitalItem = {
  id: string;
  type: string;
  valueNumber: number;
  valueSecondary: number | null;
  measuredAt: string;
  note: string | null;
  recordedByName: string;
  seniorId: string;
  seniorName: string;
  area: string;
};

/**
 * The nurse review queue.
 *
 * Oldest first, deliberately: a queue sorted by newest lets the oldest item rot, and the
 * oldest unreviewed flagged reading is exactly the one that matters.
 *
 * Reviewing is an explicit action with an optional clinical note, and the wording
 * throughout keeps the boundary: the platform flagged it, the nurse interprets it.
 */
export function ReviewQueue({ notes, vitals }: { notes: NoteItem[]; vitals: VitalItem[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<string | null>(null);

  async function review(kind: 'note' | 'vital', id: string, note?: string) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, note }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? 'That could not be saved. Please try again.');
        return;
      }
      setReviewed((current) => new Set(current).add(id));
      setOpenNote(null);
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const pendingVitals = vitals.filter((item) => !reviewed.has(item.id));
  const pendingNotes = notes.filter((item) => !reviewed.has(item.id));

  return (
    <div className="space-y-6">
      {error ? (
        <Alert tone="danger" title="Could not save">
          {error}
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Readings flagged for review"
          description="Outside the range configured for that patient. The platform has not interpreted these — that is your call."
          action={<Badge tone={pendingVitals.length ? 'warning' : 'success'}>{pendingVitals.length}</Badge>}
        />
        {pendingVitals.length ? (
          <ul className="divide-y divide-[color:var(--border)]">
            {pendingVitals.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                      <span className="text-lg font-semibold tabular-nums text-ink-900">
                        {formatVital(item.type, item.valueNumber, item.valueSecondary)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-600">
                      <Link
                        href={`/app/nurse/patients/${item.seniorId}`}
                        className="font-medium text-brand-800 hover:underline"
                      >
                        {item.seniorName}
                      </Link>{' '}
                      · {item.area}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500">
                      Recorded by {item.recordedByName} · {formatDateTime(item.measuredAt)} (
                      {relativeTime(item.measuredAt)})
                    </p>
                    {item.note ? (
                      <p className="mt-1.5 text-sm italic text-ink-600">“{item.note}”</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenNote(openNote === item.id ? null : item.id)}
                    >
                      Review with a note
                    </Button>
                    <Button
                      size="sm"
                      loading={busy === item.id}
                      onClick={() => review('vital', item.id)}
                    >
                      Mark reviewed
                    </Button>
                  </div>
                </div>

                {openNote === item.id ? (
                  <form
                    className="mt-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const note = String(new FormData(event.currentTarget).get('note') ?? '');
                      void review('vital', item.id, note);
                    }}
                  >
                    <Textarea
                      name="note"
                      rows={3}
                      placeholder="Your clinical note. This goes into the care record and the family timeline."
                      required
                    />
                    <div className="mt-2 flex gap-2">
                      <Button type="submit" size="sm" loading={busy === item.id}>
                        Save and mark reviewed
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setOpenNote(null)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No readings waiting"
            description="Every flagged reading in your caseload has been reviewed."
          />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Notes needing review"
          description="Concerns, refusals and missed tasks recorded by caregivers."
          action={<Badge tone={pendingNotes.length ? 'warning' : 'success'}>{pendingNotes.length}</Badge>}
        />
        {pendingNotes.length ? (
          <ul className="divide-y divide-[color:var(--border)]">
            {pendingNotes.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
                      <Badge tone="warning">{label(CARE_NOTE_TYPE_LABELS, item.type)}</Badge>
                      <Link
                        href={`/app/nurse/patients/${item.seniorId}`}
                        className="font-medium text-brand-800 hover:underline"
                      >
                        {item.seniorName}
                      </Link>
                    </div>
                    <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-800">
                      {item.body}
                    </p>
                    <p className="mt-1.5 text-sm text-ink-500">
                      {item.authorName} · {formatDateTime(item.createdAt)} (
                      {relativeTime(item.createdAt)})
                    </p>
                  </div>
                  <Button
                    size="sm"
                    loading={busy === item.id}
                    onClick={() => review('note', item.id)}
                    className="shrink-0"
                  >
                    Mark reviewed
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No notes waiting"
            description="Every note flagged for review in your caseload has been looked at."
          />
        )}
      </Card>
    </div>
  );
}
