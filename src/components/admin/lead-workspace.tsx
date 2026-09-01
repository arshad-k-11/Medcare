'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardHeader, Field, Input, Select, Textarea } from '@/components/ui';
import {
  BUDGET_BANDS,
  BUDGET_BAND_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  URGENCIES,
  URGENCY_LABELS,
  label,
} from '@/lib/constants';

/**
 * The CRM working panel for one enquiry: log what happened, move the stage, set a
 * follow-up.
 *
 * Logging a call is the primary action and sits first, because the thing ops does fifty
 * times a day should not be the thing buried under a settings form. Moving a lead to LOST
 * requires a reason, and the form says why: the lost reason is how the business decides
 * which areas to open.
 */
export function LeadWorkspace({
  leadId,
  status,
  urgency,
  budgetBand,
  ownerUserId,
  followUpAt,
  staff,
  packages,
  recommendedPackageId,
}: {
  leadId: string;
  status: string;
  urgency: string;
  budgetBand: string | null;
  ownerUserId: string | null;
  followUpAt: string | null;
  staff: { id: string; name: string }[];
  packages: { id: string; name: string }[];
  recommendedPackageId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState(status);

  async function logActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy('activity');
    const form = new FormData(event.currentTarget);
    const formElement = event.currentTarget;

    try {
      const response = await fetch(`/api/leads/${leadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.get('type'),
          summary: form.get('summary'),
          outcome: form.get('outcome') || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? 'That could not be saved.');
        return;
      }
      setNotice(
        body.advancedToContacted
          ? 'Logged, and the enquiry moved to Contacted.'
          : 'Logged against this enquiry.',
      );
      formElement.reset();
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function updateLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy('lead');
    const form = new FormData(event.currentTarget);

    const followUp = String(form.get('followUpAt') ?? '');
    const payload: Record<string, unknown> = {
      status: form.get('status') || undefined,
      urgency: form.get('urgency') || undefined,
      budgetBand: form.get('budgetBand') || undefined,
      ownerUserId: form.get('ownerUserId') || null,
      recommendedPackageId: form.get('recommendedPackageId') || null,
      followUpAt: followUp ? new Date(`${followUp}T10:00:00`).toISOString() : '',
      lostReason: form.get('lostReason') || undefined,
    };

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      setNotice('Enquiry updated.');
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy('task');
    const form = new FormData(event.currentTarget);
    const formElement = event.currentTarget;
    const date = String(form.get('dueDate') ?? '');
    const time = String(form.get('dueTime') ?? '11:00');

    try {
      const response = await fetch('/api/crm-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'),
          details: form.get('details') || undefined,
          dueAt: new Date(`${date}T${time}:00`).toISOString(),
          priority: form.get('priority'),
          leadId,
          assigneeUserId: form.get('assigneeUserId'),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? 'That could not be saved.');
        return;
      }
      setNotice('Follow-up scheduled.');
      formElement.reset();
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      {error ? (
        <Alert tone="danger" title="Not saved">
          {error}
        </Alert>
      ) : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card>
        <CardHeader title="Log what happened" description="Every call, message and note." />
        <form onSubmit={logActivity} className="space-y-4 px-5 py-4">
          <Field label="What was it?" name="type">
            {({ id }) => (
              <Select id={id} name="type" defaultValue="CALL">
                <option value="CALL">Phone call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
                <option value="NOTE">Internal note</option>
                <option value="ASSESSMENT">Assessment discussion</option>
              </Select>
            )}
          </Field>
          <Field label="What was said" name="summary" required>
            {({ id }) => (
              <Textarea
                id={id}
                name="summary"
                rows={3}
                required
                placeholder="e.g. Spoke to the daughter. Father discharged yesterday, needs support from Monday."
              />
            )}
          </Field>
          <Field label="Outcome" name="outcome" hint="Optional. What was agreed.">
            {({ id }) => <Input id={id} name="outcome" placeholder="e.g. Assessment booked for Thursday" />}
          </Field>
          <Button type="submit" fullWidth loading={busy === 'activity'}>
            Log it
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Update the enquiry" />
        <form onSubmit={updateLead} className="space-y-4 px-5 py-4">
          <Field label="Stage" name="status">
            {({ id }) => (
              <Select
                id={id}
                name="status"
                value={nextStatus}
                onChange={(event) => setNextStatus(event.target.value)}
              >
                {LEAD_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {label(LEAD_STATUS_LABELS, option)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {nextStatus === 'LOST' ? (
            <Field
              label="Why was it lost?"
              name="lostReason"
              required
              hint="This feeds the funnel report and tells us which areas to open next. Please be specific."
            >
              {({ id }) => (
                <Textarea
                  id={id}
                  name="lostReason"
                  rows={3}
                  required
                  placeholder="e.g. We do not serve Vashi yet. Told her honestly and offered the waitlist."
                />
              )}
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Urgency" name="urgency">
              {({ id }) => (
                <Select id={id} name="urgency" defaultValue={urgency}>
                  {URGENCIES.map((option) => (
                    <option key={option} value={option}>
                      {label(URGENCY_LABELS, option)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Budget band" name="budgetBand">
              {({ id }) => (
                <Select id={id} name="budgetBand" defaultValue={budgetBand ?? ''}>
                  <option value="">Not known</option>
                  {BUDGET_BANDS.map((option) => (
                    <option key={option} value={option}>
                      {label(BUDGET_BAND_LABELS, option)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field label="Owner" name="ownerUserId" hint="An unowned enquiry is an ignored enquiry.">
            {({ id }) => (
              <Select id={id} name="ownerUserId" defaultValue={ownerUserId ?? ''}>
                <option value="">Unassigned</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Plan being discussed" name="recommendedPackageId">
            {({ id }) => (
              <Select id={id} name="recommendedPackageId" defaultValue={recommendedPackageId ?? ''}>
                <option value="">Not decided</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Next follow-up" name="followUpAt">
            {({ id }) => (
              <Input
                id={id}
                name="followUpAt"
                type="date"
                defaultValue={followUpAt ? followUpAt.slice(0, 10) : ''}
              />
            )}
          </Field>

          <Button type="submit" variant="outline" fullWidth loading={busy === 'lead'}>
            Save changes
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Schedule a follow-up" description="A task with a time and an owner." />
        <form onSubmit={addTask} className="space-y-4 px-5 py-4">
          <Field label="What needs doing?" name="title" required>
            {({ id }) => (
              <Input
                id={id}
                name="title"
                required
                placeholder="e.g. Call the family at 11:00 to confirm the assessment"
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" name="dueDate" required>
              {({ id }) => <Input id={id} name="dueDate" type="date" min={today} required />}
            </Field>
            <Field label="Time" name="dueTime">
              {({ id }) => <Input id={id} name="dueTime" type="time" defaultValue="11:00" />}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assign to" name="assigneeUserId" required>
              {({ id }) => (
                <Select id={id} name="assigneeUserId" defaultValue={ownerUserId ?? ''} required>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Priority" name="priority">
              {({ id }) => (
                <Select id={id} name="priority" defaultValue="NORMAL">
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                </Select>
              )}
            </Field>
          </div>
          <Field label="Details" name="details">
            {({ id }) => <Textarea id={id} name="details" rows={2} />}
          </Field>
          <Button type="submit" variant="outline" fullWidth loading={busy === 'task'}>
            Schedule it
          </Button>
        </form>
      </Card>
    </div>
  );
}
