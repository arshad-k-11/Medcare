'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, CardHeader, Field, Input, Select, Textarea } from '@/components/ui';
import {
  GENDERS,
  GENDER_LABELS,
  LIVING_ARRANGEMENTS,
  LIVING_ARRANGEMENT_LABELS,
  MOBILITY_LABELS,
  MOBILITY_LEVELS,
  RELATIONSHIPS,
  RELATIONSHIP_LABELS,
  label,
} from '@/lib/constants';

export function AddSeniorForm({
  areas,
}: {
  areas: { id: string; name: string; isActive: boolean }[];
}) {
  const router = useRouter();
  const [conditions, setConditions] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  function addCondition() {
    const value = draft.trim();
    if (!value || conditions.includes(value)) {
      setDraft('');
      return;
    }
    setConditions((current) => [...current, value].slice(0, 20));
    setDraft('');
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          ageYears: form.get('ageYears') || undefined,
          gender: form.get('gender') || undefined,
          addressLine: form.get('addressLine') || undefined,
          area: form.get('area'),
          pincode: form.get('pincode') || undefined,
          livingArrangement: form.get('livingArrangement') || undefined,
          mobility: form.get('mobility') || undefined,
          conditions,
          languages: String(form.get('languages') ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          emergencyContactName: form.get('emergencyContactName') || undefined,
          emergencyContactPhone: form.get('emergencyContactPhone') || undefined,
          relationship: form.get('relationship') || undefined,
          notes: form.get('notes') || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'That could not be saved.');
        return;
      }
      setDone(body.message);
      router.refresh();
    } catch {
      setFormError('We could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="p-6">
        <Alert tone="success" title="Added">
          <p>{done}</p>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/app/family')}>
          Back to the dashboard
        </Button>
      </Card>
    );
  }

  const activeAreas = areas.filter((area) => area.isActive);
  const inactiveAreas = areas.filter((area) => !area.isActive);

  return (
    <Card>
      <CardHeader title="Their details" />
      <form onSubmit={onSubmit} className="space-y-4 px-5 py-4" noValidate>
        {formError ? (
          <Alert tone="danger" title="Could not save">
            {formError}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="firstName" error={errors.firstName} required>
            {({ id, invalid }) => <Input id={id} name="firstName" invalid={invalid} required />}
          </Field>
          <Field label="Last name" name="lastName" error={errors.lastName} required>
            {({ id, invalid }) => <Input id={id} name="lastName" invalid={invalid} required />}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Age" name="ageYears" error={errors.ageYears}>
            {({ id, invalid }) => (
              <Input id={id} name="ageYears" type="number" min={40} max={120} invalid={invalid} />
            )}
          </Field>
          <Field label="Gender" name="gender" error={errors.gender}>
            {({ id, invalid }) => (
              <Select id={id} name="gender" invalid={invalid} defaultValue="UNDISCLOSED">
                {GENDERS.map((option) => (
                  <option key={option} value={option}>
                    {label(GENDER_LABELS, option)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Your relationship" name="relationship" error={errors.relationship}>
            {({ id, invalid }) => (
              <Select id={id} name="relationship" invalid={invalid} defaultValue="">
                <option value="">Select</option>
                {RELATIONSHIPS.map((option) => (
                  <option key={option} value={option}>
                    {label(RELATIONSHIP_LABELS, option)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Address" name="addressLine" error={errors.addressLine}>
          {({ id, invalid }) => <Input id={id} name="addressLine" invalid={invalid} />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Area" name="area" error={errors.area} required>
            {({ id, invalid }) => (
              <Select id={id} name="area" invalid={invalid} defaultValue="" required>
                <option value="">Select an area</option>
                <optgroup label="Areas we serve">
                  {activeAreas.map((area) => (
                    <option key={area.id} value={area.name}>
                      {area.name}
                    </option>
                  ))}
                </optgroup>
                {inactiveAreas.length ? (
                  <optgroup label="Not yet served">
                    {inactiveAreas.map((area) => (
                      <option key={area.id} value={area.name}>
                        {area.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <option value="Elsewhere in Mumbai">Elsewhere in Mumbai</option>
              </Select>
            )}
          </Field>
          <Field label="Pincode" name="pincode" error={errors.pincode}>
            {({ id, invalid }) => (
              <Input id={id} name="pincode" inputMode="numeric" maxLength={6} invalid={invalid} />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Living arrangement" name="livingArrangement" error={errors.livingArrangement}>
            {({ id, invalid }) => (
              <Select id={id} name="livingArrangement" invalid={invalid} defaultValue="">
                <option value="">Select</option>
                {LIVING_ARRANGEMENTS.map((option) => (
                  <option key={option} value={option}>
                    {label(LIVING_ARRANGEMENT_LABELS, option)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Mobility" name="mobility" error={errors.mobility}>
            {({ id, invalid }) => (
              <Select id={id} name="mobility" invalid={invalid} defaultValue="">
                <option value="">Select</option>
                {MOBILITY_LEVELS.map((option) => (
                  <option key={option} value={option}>
                    {label(MOBILITY_LABELS, option)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div>
          <label htmlFor="condition-draft" className="block text-sm font-semibold text-ink-800">
            Conditions, in your own words
            <span className="mt-1 block font-normal text-ink-500">
              Optional. A nurse records the clinical detail properly at the assessment.
            </span>
          </label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="condition-draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCondition();
                }
              }}
              placeholder="e.g. diabetes"
            />
            <Button type="button" variant="outline" onClick={addCondition}>
              Add
            </Button>
          </div>
          {conditions.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {conditions.map((condition) => (
                <li key={condition}>
                  <button
                    type="button"
                    onClick={() =>
                      setConditions((current) => current.filter((value) => value !== condition))
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-100"
                  >
                    {condition}
                    <span aria-hidden="true">×</span>
                    <span className="sr-only">Remove {condition}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Field
          label="Languages they speak"
          name="languages"
          hint="Separate with commas. This strongly affects which caregiver we assign."
        >
          {({ id }) => <Input id={id} name="languages" placeholder="Marathi, Hindi, English" />}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Emergency contact name" name="emergencyContactName">
            {({ id }) => <Input id={id} name="emergencyContactName" />}
          </Field>
          <Field label="Emergency contact phone" name="emergencyContactPhone">
            {({ id }) => <Input id={id} name="emergencyContactPhone" type="tel" />}
          </Field>
        </div>

        <Field
          label="Anything else we should know"
          name="notes"
          hint="Household preferences, access to the building, who else is around."
        >
          {({ id }) => <Textarea id={id} name="notes" rows={3} />}
        </Field>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Add and request an assessment
        </Button>
      </form>
    </Card>
  );
}
