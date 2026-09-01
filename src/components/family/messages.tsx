'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardHeader, Field, Select, Textarea } from '@/components/ui';
import { ROLE_LABELS, type Role } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderRole: string;
};

/**
 * A message thread.
 *
 * The sender's role is shown next to their name, because a family reading "we will keep
 * offering it and record whether it was needed" needs to know whether that came from a
 * nurse or from an operations coordinator. It changes how they read it.
 */
export function MessageThreadView({
  threadId,
  subject,
  seniorName,
  currentUserId,
  messages,
}: {
  threadId: string;
  subject: string;
  seniorName: string | null;
  currentUserId: string;
  messages: Message[];
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const body = String(new FormData(event.currentTarget).get('body') ?? '').trim();
    if (body.length < 3) return;

    const formElement = event.currentTarget;
    setSending(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, body }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error?.message ?? 'That could not be sent.');
        return;
      }
      formElement.reset();
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader title={subject} description={seniorName ? `About ${seniorName}` : undefined} />

      <ol className="max-h-[28rem] space-y-4 overflow-y-auto px-5 py-4">
        {messages.map((message) => {
          const mine = message.senderId === currentUserId;
          return (
            <li key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-card px-4 py-3',
                  mine ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-900',
                )}
              >
                <p className={cn('text-xs font-semibold', mine ? 'text-brand-100' : 'text-ink-600')}>
                  {message.senderName}
                  {!mine ? ` · ${ROLE_LABELS[message.senderRole as Role] ?? message.senderRole}` : ''}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">
                  {message.body}
                </p>
                <p className={cn('mt-1.5 text-xs', mine ? 'text-brand-200' : 'text-ink-500')}>
                  {message.createdAt}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <form onSubmit={send} className="space-y-3 border-t border-[color:var(--border)] px-5 py-4">
        {error ? (
          <Alert tone="danger" title="Not sent">
            {error}
          </Alert>
        ) : null}
        <label htmlFor="message-body" className="sr-only">
          Your message
        </label>
        <Textarea id="message-body" name="body" rows={3} placeholder="Write a reply…" required />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink-500">
            Replies come during operating hours. For anything urgent, please call.
          </p>
          <Button type="submit" loading={sending}>
            Send
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Starts a new conversation, which automatically includes the care team. */
export function NewThreadForm({ seniors }: { seniors: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.get('subject'),
          body: form.get('body'),
          seniorId: form.get('seniorId') || undefined,
          category: form.get('category'),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? 'That could not be sent.');
        return;
      }
      setOpen(false);
      router.push(`/app/family/messages?thread=${body.threadId}`);
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" fullWidth onClick={() => setOpen(true)}>
        Start a new conversation
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader title="New conversation" description="Reaches the nurse and the operations team." />
      <form onSubmit={submit} className="space-y-4 px-5 py-4">
        {error ? (
          <Alert tone="danger" title="Not sent">
            {error}
          </Alert>
        ) : null}

        <Field label="Subject" name="subject" required>
          {({ id }) => (
            <input
              id={id}
              name="subject"
              required
              className="tap-target block w-full rounded-[10px] border border-ink-300 bg-white px-3.5 text-[0.9375rem]"
            />
          )}
        </Field>

        {seniors.length ? (
          <Field label="About" name="seniorId">
            {({ id }) => (
              <Select id={id} name="seniorId" defaultValue={seniors[0]?.id ?? ''}>
                {seniors.map((senior) => (
                  <option key={senior.id} value={senior.id}>
                    {senior.name}
                  </option>
                ))}
                <option value="">Something else</option>
              </Select>
            )}
          </Field>
        ) : null}

        <Field label="Category" name="category">
          {({ id }) => (
            <Select id={id} name="category" defaultValue="CARE">
              <option value="CARE">About the care</option>
              <option value="BILLING">Billing</option>
              <option value="GENERAL">Something else</option>
            </Select>
          )}
        </Field>

        <Field label="Message" name="body" required>
          {({ id }) => <Textarea id={id} name="body" rows={4} required />}
        </Field>

        <div className="flex gap-2">
          <Button type="submit" loading={sending}>
            Send
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
