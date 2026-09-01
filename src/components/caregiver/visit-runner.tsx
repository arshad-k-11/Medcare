'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LogIn, LogOut, Pill, X } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { formatTime, formatVital } from '@/lib/format';
import { VITAL_META, VITAL_TYPES, type VitalType } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Task = {
  id: string;
  label: string;
  instructions: string | null;
  status: string;
  note: string | null;
};

type Reminder = {
  id: string;
  dueAt: string;
  status: string;
  medicationName: string;
  dose: string;
  instructions: string | null;
};

export type VisitRunnerProps = {
  visitId: string;
  seniorId: string;
  seniorName: string;
  status: string;
  checkedInAt: string | null;
  tasks: Task[];
  reminders: Reminder[];
  /** Vitals the care plan asks for on this visit. */
  requestedVitals: string[];
};

/**
 * The screen a caregiver works from during a visit.
 *
 * Structured as a sequence — check in, work the tasks, record what was asked for, check
 * out — because that is the order the work happens in, and a caregiver should never have to
 * hunt for the next control. Everything is optimistic where it is safe to be, and every
 * failure is surfaced in words rather than a silent no-op.
 */
export function VisitRunner(props: VisitRunnerProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(props.tasks);
  const [reminders, setReminders] = useState(props.reminders);
  const [checkedInAt, setCheckedInAt] = useState(props.checkedInAt);
  const [status, setStatus] = useState(props.status);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [refusalFor, setRefusalFor] = useState<string | null>(null);

  const isActive = status === 'IN_PROGRESS';
  const isComplete = status === 'COMPLETED';

  async function call(path: string, body: unknown): Promise<Record<string, unknown> | null> {
    setError(null);
    try {
      const response = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error?.message ?? 'That did not work. Please try again.');
        return null;
      }
      return payload;
    } catch {
      setError(
        'No connection. Your last action was not saved — try again when you have signal, or call your supervisor.',
      );
      return null;
    }
  }

  async function checkIn() {
    // Location is best-effort: a refusal or a failure must not block the visit.
    const position = await requestPosition();
    const payload = await call(`/api/visits/${props.visitId}/check-in`, {
      ...(position
        ? {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMetres: Math.round(position.coords.accuracy),
          }
        : {}),
    });
    if (!payload) return;
    setCheckedInAt(String(payload.checkInAt));
    setStatus('IN_PROGRESS');
    setNotice(
      payload.locationVerified
        ? 'Checked in, and your location matched this address.'
        : position
          ? 'Checked in. Your location did not match our record for this address, which is fine — it is noted for the supervisor.'
          : 'Checked in without location. That is fine, the visit is recorded either way.',
    );
    startTransition(() => router.refresh());
  }

  async function setTaskStatus(taskId: string, nextStatus: string, note?: string) {
    const previous = tasks;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus, note: note ?? task.note } : task,
      ),
    );

    const response = await fetch(`/api/visits/${props.visitId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus, note }),
    }).catch(() => null);

    if (!response || !response.ok) {
      // Roll the optimistic update back rather than showing a tick for something unsaved.
      setTasks(previous);
      const payload = await response?.json().catch(() => null);
      setError(payload?.error?.message ?? 'That task could not be saved. Please try again.');
      return;
    }
    setRefusalFor(null);
  }

  async function recordReminder(reminderId: string, nextStatus: string) {
    const payload = await call(`/api/medication-reminders/${reminderId}/confirm`, {
      status: nextStatus,
    });
    if (!payload) return;
    setReminders((current) =>
      current.map((reminder) =>
        reminder.id === reminderId ? { ...reminder, status: nextStatus } : reminder,
      ),
    );
    if (payload.message) setNotice(String(payload.message));
  }

  async function checkOut(summary: string) {
    const payload = await call(`/api/visits/${props.visitId}/check-out`, { summary });
    if (!payload) return;
    setStatus('COMPLETED');
    setNotice('Visit completed. The family has been told.');
    startTransition(() => router.refresh());
  }

  const doneCount = tasks.filter((task) => task.status === 'DONE').length;
  const pendingCount = tasks.filter((task) => task.status === 'PENDING').length;

  return (
    <div className="space-y-5">
      {error ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert tone="info" title="Saved">
          {notice}
        </Alert>
      ) : null}

      {/* Step 1 — check in */}
      {!checkedInAt ? (
        <Card className="border-brand-300">
          <div className="px-5 py-6 text-center">
            <h2 className="text-lg font-semibold text-ink-900">Ready to start?</h2>
            <p className="mx-auto mt-2 max-w-md text-[0.9375rem] text-ink-600">
              Check in when you arrive. We will ask your phone for its location to confirm the
              address — you can refuse, and the visit will still be recorded.
            </p>
            <Button size="xl" fullWidth className="mt-5" onClick={checkIn} loading={pending}>
              <LogIn className="h-5 w-5" aria-hidden="true" />
              Check in
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-3 px-5 py-3">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white"
              aria-hidden="true"
            >
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
            <div>
              <p className="font-semibold text-ink-900">
                Checked in at {formatTime(checkedInAt)}
              </p>
              <p className="text-sm text-ink-500">
                {isComplete ? 'Visit completed' : 'Visit in progress'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2 — tasks */}
      {checkedInAt ? (
        <Card>
          <CardHeader
            title="Care tasks"
            description={`${doneCount} of ${tasks.length} done${pendingCount ? ` · ${pendingCount} still to do` : ''}`}
          />
          <ul className="divide-y divide-[color:var(--border)]">
            {tasks.map((task) => (
              <li key={task.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'font-medium',
                        task.status === 'DONE'
                          ? 'text-ink-500 line-through'
                          : task.status === 'REFUSED'
                            ? 'text-warning'
                            : 'text-ink-900',
                      )}
                    >
                      {task.label}
                    </p>
                    {task.instructions ? (
                      <p className="mt-1 text-sm leading-relaxed text-ink-600">
                        {task.instructions}
                      </p>
                    ) : null}
                    {task.note ? (
                      <p className="mt-1 text-sm italic text-ink-600">{task.note}</p>
                    ) : null}
                  </div>
                </div>

                {!isComplete ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={task.status === 'DONE' ? 'success' : 'outline'}
                      onClick={() => setTaskStatus(task.id, 'DONE')}
                      disabled={!isActive}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      Done
                    </Button>
                    <Button
                      size="sm"
                      variant={task.status === 'REFUSED' ? 'danger' : 'outline'}
                      onClick={() => setRefusalFor(refusalFor === task.id ? null : task.id)}
                      disabled={!isActive}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Declined
                    </Button>
                    <Button
                      size="sm"
                      variant={task.status === 'NOT_APPLICABLE' ? 'secondary' : 'ghost'}
                      onClick={() => setTaskStatus(task.id, 'NOT_APPLICABLE')}
                      disabled={!isActive}
                    >
                      Not needed
                    </Button>
                  </div>
                ) : null}

                {/* A refusal always needs a reason — the nurse cannot act on "she said no". */}
                {refusalFor === task.id ? (
                  <form
                    className="mt-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const note = String(new FormData(event.currentTarget).get('note') ?? '');
                      if (note.trim().length < 3) return;
                      void setTaskStatus(task.id, 'REFUSED', note);
                    }}
                  >
                    <Field
                      label="What did they say, or what stopped it?"
                      name={`refusal-${task.id}`}
                      required
                      hint="The nurse uses this to change the approach, so please write what actually happened."
                    >
                      {({ id }) => (
                        <Textarea
                          id={id}
                          name="note"
                          rows={2}
                          placeholder="e.g. Said she was tired and would prefer a bath tomorrow."
                          required
                        />
                      )}
                    </Field>
                    <div className="mt-2 flex gap-2">
                      <Button type="submit" size="sm">
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setRefusalFor(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Step 3 — medication reminders */}
      {checkedInAt && reminders.length ? (
        <Card>
          <CardHeader
            title="Medication reminders"
            description="Remind and record only. Never change a dose or give anything not on this list."
          />
          <ul className="divide-y divide-[color:var(--border)]">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <Pill className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-900">
                      {reminder.medicationName} {reminder.dose}
                    </p>
                    <p className="text-sm text-ink-600">Due {formatTime(reminder.dueAt)}</p>
                    {reminder.instructions ? (
                      <p className="mt-1 text-sm text-ink-600">{reminder.instructions}</p>
                    ) : null}
                  </div>
                </div>
                {reminder.status === 'PENDING' && isActive ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => recordReminder(reminder.id, 'CONFIRMED')}>
                      Taken
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => recordReminder(reminder.id, 'SKIPPED')}
                    >
                      Not needed
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => recordReminder(reminder.id, 'MISSED')}
                    >
                      Missed
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-medium text-ink-600">
                    Recorded as {reminder.status.toLowerCase()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Step 4 — vitals */}
      {checkedInAt && props.requestedVitals.length && !isComplete ? (
        <VitalsRecorder
          seniorId={props.seniorId}
          visitId={props.visitId}
          types={props.requestedVitals}
          onRecorded={(message) => setNotice(message)}
        />
      ) : null}

      {/* Step 5 — note and check out */}
      {checkedInAt && !isComplete ? (
        <Card>
          <CardHeader
            title="Finish the visit"
            description="A short note about how it went. The family reads this."
          />
          <form
            className="space-y-4 px-5 py-4"
            onSubmit={(event) => {
              event.preventDefault();
              const summary = String(new FormData(event.currentTarget).get('summary') ?? '');
              void checkOut(summary);
            }}
          >
            <Field
              label="How was the visit?"
              name="summary"
              hint="Plain language. Mood, appetite, anything different from usual."
            >
              {({ id }) => (
                <Textarea
                  id={id}
                  name="summary"
                  rows={4}
                  placeholder="e.g. Comfortable morning. Walked the corridor twice with the walker. Ate a full breakfast."
                />
              )}
            </Field>

            {pendingCount > 0 ? (
              <Alert tone="warning" title={`${pendingCount} task${pendingCount === 1 ? '' : 's'} still marked pending`}>
                <p>
                  That is fine — record what actually happened rather than ticking things off. The
                  nurse would rather see an honest incomplete visit than a tidy one.
                </p>
              </Alert>
            ) : null}

            <Button type="submit" size="xl" fullWidth loading={pending}>
              <LogOut className="h-5 w-5" aria-hidden="true" />
              Check out and finish
            </Button>
          </form>
        </Card>
      ) : null}

      {isComplete ? (
        <Alert tone="success" title="Visit completed">
          <p>
            Thank you. The family has been told, and the nurse will see your notes. If you remember
            something afterwards, report it rather than leaving it — it is never too late.
          </p>
        </Alert>
      ) : null}
    </div>
  );
}

/**
 * Records the readings the care plan asked for.
 *
 * The response message comes from the server verbatim, including the wording used when a
 * reading is outside the configured range. That wording tells the caregiver not to
 * interpret it, and it must not be paraphrased on the client.
 */
function VitalsRecorder({
  seniorId,
  visitId,
  types,
  onRecorded,
}: {
  seniorId: string;
  visitId: string;
  types: string[];
  onRecorded: (message: string) => void;
}) {
  const [type, setType] = useState(types[0] ?? 'BLOOD_PRESSURE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string[]>([]);
  const meta = VITAL_META[type as VitalType];
  const isBloodPressure = type === 'BLOOD_PRESSURE';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const form = new FormData(event.currentTarget);
    const primary = Number(form.get('value'));
    const secondary = form.get('secondary') ? Number(form.get('secondary')) : undefined;

    try {
      const response = await fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorId,
          visitId,
          type,
          valueNumber: primary,
          valueSecondary: secondary,
          context: form.get('context') || undefined,
          measuredAt: new Date().toISOString(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(
          payload?.error?.fields
            ? Object.values(payload.error.fields).join(' ')
            : (payload?.error?.message ?? 'That reading could not be saved.'),
        );
        return;
      }
      setRecorded((current) => [
        ...current,
        formatVital(type, primary, secondary ?? null),
      ]);
      onRecorded(String(payload.message));
      event.currentTarget.reset();
    } catch {
      setError('No connection. The reading was not saved — please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Record readings"
        description="Write down exactly what the device shows. Do not interpret it."
      />
      <form className="space-y-4 px-5 py-4" onSubmit={onSubmit}>
        {error ? (
          <Alert tone="danger" title="Not saved">
            {error}
          </Alert>
        ) : null}

        {recorded.length ? (
          <p className="text-sm text-success">Recorded this visit: {recorded.join(' · ')}</p>
        ) : null}

        <Field label="What are you recording?" name="type">
          {({ id }) => (
            <Select id={id} value={type} onChange={(event) => setType(event.target.value)}>
              {(types.length ? types : VITAL_TYPES).map((option) => (
                <option key={option} value={option}>
                  {VITAL_META[option as VitalType]?.label ?? option}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={isBloodPressure ? `Systolic (${meta?.unit})` : `Reading (${meta?.unit ?? ''})`}
            name="value"
            required
          >
            {({ id }) => (
              <Input
                id={id}
                name="value"
                type="number"
                inputMode="decimal"
                step="any"
                required
                className="text-lg"
              />
            )}
          </Field>
          {isBloodPressure ? (
            <Field label={`Diastolic (${meta?.unit})`} name="secondary" required>
              {({ id }) => (
                <Input
                  id={id}
                  name="secondary"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required
                  className="text-lg"
                />
              )}
            </Field>
          ) : null}
        </div>

        <Field
          label="When was it taken?"
          name="context"
          hint="A reading after climbing stairs is not comparable to one at rest."
        >
          {({ id }) => (
            <Select id={id} name="context" defaultValue="RESTING">
              <option value="RESTING">At rest</option>
              <option value="FASTING">Fasting</option>
              <option value="POST_MEAL">After a meal</option>
              <option value="POST_ACTIVITY">After activity</option>
            </Select>
          )}
        </Field>

        <Button type="submit" fullWidth loading={saving}>
          Save reading
        </Button>
      </form>
    </Card>
  );
}

/** Asks for a location fix, resolving to null on refusal, timeout or lack of support. */
function requestPosition(): Promise<GeolocationPosition | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  });
}
