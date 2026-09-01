'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardHeader, ChoiceCard, Field, Select, Textarea } from '@/components/ui';

/**
 * The family's support and complaint route.
 *
 * A complaint and a rating go to the same endpoint but behave differently: a complaint
 * creates an ops notification immediately and stays open until resolved, because the
 * business measures resolution time and that clock has to start when the family speaks.
 */
export function SupportRequestForm({
  seniors,
  defaultSeniorId,
}: {
  seniors: { id: string; name: string }[];
  defaultSeniorId: string;
}) {
  const router = useRouter();
  const [type, setType] = useState('CALLBACK_REQUEST');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorId: form.get('seniorId') || undefined,
          type,
          rating: type === 'RATING' ? rating : undefined,
          subject: form.get('subject') || undefined,
          comment: form.get('comment') || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.fields
            ? Object.values(body.error.fields).join(' ')
            : (body?.error?.message ?? 'That could not be sent.'),
        );
        return;
      }
      setDone(body.message);
      router.refresh();
    } catch {
      setError('We could not reach the server. Please call us instead.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="p-6">
        <Alert tone="success" title="Received">
          <p>{done}</p>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => setDone(null)}>
          Send something else
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Tell us what you need" />
      <form onSubmit={onSubmit} className="space-y-5 px-5 py-4" noValidate>
        {error ? (
          <Alert tone="danger" title="Not sent">
            {error}
          </Alert>
        ) : null}

        <fieldset>
          <legend className="text-sm font-semibold text-ink-800">What is this about?</legend>
          <div className="mt-3 space-y-2">
            <ChoiceCard
              name="type"
              value="CALLBACK_REQUEST"
              checked={type === 'CALLBACK_REQUEST'}
              onChange={setType}
              title="Please call me"
              description="A coordinator will telephone you during operating hours."
            />
            <ChoiceCard
              name="type"
              value="COMPLAINT"
              checked={type === 'COMPLAINT'}
              onChange={setType}
              title="Something went wrong"
              description="Recorded as a complaint with a reference and tracked to resolution."
            />
            <ChoiceCard
              name="type"
              value="RATING"
              checked={type === 'RATING'}
              onChange={setType}
              title="Give feedback on the care"
              description="Ratings shape how we measure caregivers, so honest ones help."
            />
            <ChoiceCard
              name="type"
              value="SUGGESTION"
              checked={type === 'SUGGESTION'}
              onChange={setType}
              title="Suggest something"
            />
          </div>
        </fieldset>

        {seniors.length ? (
          <Field label="Which person is this about?" name="seniorId">
            {({ id }) => (
              <Select id={id} name="seniorId" defaultValue={defaultSeniorId}>
                <option value="">Not about a specific person</option>
                {seniors.map((senior) => (
                  <option key={senior.id} value={senior.id}>
                    {senior.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : null}

        {type === 'RATING' ? (
          <fieldset>
            <legend className="text-sm font-semibold text-ink-800">How has the care been?</legend>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-pressed={rating === value}
                  aria-label={`${value} out of 5`}
                  className={`tap-target flex-1 rounded-[10px] border text-lg font-semibold ${
                    rating === value
                      ? 'border-brand-600 bg-brand-50 text-brand-800'
                      : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-500">1 is poor, 5 is excellent.</p>
          </fieldset>
        ) : null}

        <Field label="Subject" name="subject" required={type === 'COMPLAINT'}>
          {({ id }) => <input id={id} name="subject" className="tap-target block w-full rounded-[10px] border border-ink-300 bg-white px-3.5 text-[0.9375rem]" />}
        </Field>

        <Field
          label={type === 'COMPLAINT' ? 'What happened?' : 'Anything you want to tell us'}
          name="comment"
          required={type === 'COMPLAINT'}
          hint={
            type === 'COMPLAINT'
              ? 'Dates, times and names help us investigate properly rather than guessing.'
              : undefined
          }
        >
          {({ id }) => <Textarea id={id} name="comment" rows={5} required={type === 'COMPLAINT'} />}
        </Field>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Send
        </Button>
      </form>
    </Card>
  );
}
