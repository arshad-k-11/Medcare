'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  ChoiceCard,
  Checkbox,
  Field,
  Input,
  Label,
  Select,
  Steps,
  Textarea,
} from '@/components/ui';
import {
  BUDGET_BANDS,
  BUDGET_BAND_LABELS,
  CARE_RECIPIENTS,
  CARE_RECIPIENT_LABELS,
  CONTACT_CHANNELS,
  CONTACT_CHANNEL_LABELS,
  GENDERS,
  GENDER_LABELS,
  LIVING_ARRANGEMENTS,
  LIVING_ARRANGEMENT_LABELS,
  MOBILITY_LABELS,
  MOBILITY_LEVELS,
  RELATIONSHIPS,
  RELATIONSHIP_LABELS,
  SITUATIONS,
  SITUATION_LABELS,
  URGENCIES,
  URGENCY_LABELS,
  label,
  type Journey,
  type Situation,
} from '@/lib/constants';
import { formatMoney } from '@/lib/format';
import {
  intakeStep1,
  intakeStep2,
  intakeStep3,
  intakeStep4,
  intakeStep5,
  intakeStep6,
  intakeStep7,
} from '@/lib/validation/intake';

const STEP_LABELS = [
  'Who needs care',
  'Situation',
  'About them',
  'Urgency',
  'Your details',
  'Recommendation',
  'Book',
];

/** The step schemas, in order, so validation is a lookup rather than a switch. */
const STEP_SCHEMAS = [
  intakeStep1,
  intakeStep2,
  intakeStep3,
  intakeStep4,
  intakeStep5,
  intakeStep6,
  intakeStep7,
];

export type PackageOption = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  durationLabel: string;
  billingCycle: string;
  priceFromPaise: number;
  isComingSoon: boolean;
  outcomes: string[];
};

type FormState = {
  careRecipient: string;
  situations: Situation[];
  situationOther: string;
  seniorFirstName: string;
  seniorLastName: string;
  ageYears: string;
  gender: string;
  area: string;
  livingArrangement: string;
  mobility: string;
  conditions: string[];
  conditionDraft: string;
  currentCaregiverSituation: string;
  urgency: string;
  contactName: string;
  relationship: string;
  contactPhone: string;
  contactEmail: string;
  contactCity: string;
  contactCountry: string;
  preferredChannel: string;
  consentToContact: boolean;
  selectedPackageSlug: string;
  budgetBand: string;
  preferredAssessmentDate: string;
  preferredAssessmentSlot: string;
  additionalNotes: string;
};

const INITIAL: FormState = {
  careRecipient: '',
  situations: [],
  situationOther: '',
  seniorFirstName: '',
  seniorLastName: '',
  ageYears: '',
  gender: 'UNDISCLOSED',
  area: '',
  livingArrangement: '',
  mobility: '',
  conditions: [],
  conditionDraft: '',
  currentCaregiverSituation: 'NONE',
  urgency: '',
  contactName: '',
  relationship: '',
  contactPhone: '',
  contactEmail: '',
  contactCity: '',
  contactCountry: 'India',
  preferredChannel: 'PHONE',
  consentToContact: false,
  selectedPackageSlug: '',
  budgetBand: '',
  preferredAssessmentDate: '',
  preferredAssessmentSlot: 'FLEXIBLE',
  additionalNotes: '',
};

const STORAGE_KEY = 'medcare_intake_draft';

/**
 * The seven-step care assessment funnel.
 *
 * Design decisions that matter here:
 *  * The CTA never asks for payment or an account. It asks what is happening.
 *  * Progress is saved to sessionStorage on every change, because a family filling this in
 *    at a hospital on a phone will lose the tab, and losing their answers loses the lead.
 *  * Each step validates against the same zod schema the API uses, so the client cannot
 *    show a green tick on something the server will reject.
 *  * Step 3 asks for conditions as free text chips. It deliberately does not offer a
 *    diagnosis picker — the platform is not diagnosing, and a family's phrasing is often
 *    more accurate than a forced category.
 *  * The recommendation in step 6 is explained, not asserted, and the family can override it.
 */
export function IntakeWizard({
  packages,
  areas,
  initialJourney,
  initialPackageSlug,
}: {
  packages: PackageOption[];
  areas: { id: string; name: string; isActive: boolean }[];
  initialJourney: Journey;
  initialPackageSlug?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    selectedPackageSlug: initialPackageSlug ?? '',
    contactCountry: initialJourney === 'NRI' ? '' : 'India',
    situations: initialJourney === 'NRI' ? ['NRI_SUPPORT'] : [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    slug: string;
    reasons: string[];
    alternatives: string[];
  } | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Restore a draft. A family interrupted at a hospital should not start again.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { form: FormState; step: number };
      if (parsed?.form) {
        setForm((current) => ({ ...current, ...parsed.form, consentToContact: false }));
        setStep(Math.min(parsed.step ?? 0, 6));
      }
    } catch {
      // A corrupt draft is not worth surfacing to the user.
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step }));
    } catch {
      // Private browsing can refuse writes; the wizard still works without a draft.
    }
  }, [form, step]);

  // Move focus to the step heading on change, so keyboard and screen-reader users are not
  // left at the bottom of the previous step.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  const journey: Journey = useMemo(() => {
    const country = form.contactCountry.trim().toLowerCase();
    if (country && country !== 'india') return 'NRI';
    if (form.situations.includes('NRI_SUPPORT')) return 'NRI';
    return initialJourney === 'PARTNER' ? 'PARTNER' : 'FAMILY_LOCAL';
  }, [form.contactCountry, form.situations, initialJourney]);

  /** Fetches the recommendation when the family reaches step 6. */
  async function loadRecommendation() {
    setLoadingRecommendation(true);
    try {
      const response = await fetch('/api/public/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situations: form.situations,
          urgency: form.urgency,
          journey,
          livingArrangement: form.livingArrangement,
          mobility: form.mobility,
          conditionCount: form.conditions.length,
        }),
      });
      if (!response.ok) throw new Error('recommendation failed');
      const body = await response.json();
      setRecommendation(body);
      if (!form.selectedPackageSlug) update('selectedPackageSlug', body.slug);
    } catch {
      // A failed recommendation must not block the funnel — the family can still choose.
      setRecommendation(null);
    } finally {
      setLoadingRecommendation(false);
    }
  }

  function validateCurrentStep(): boolean {
    const schema = STEP_SCHEMAS[step];
    const payload = buildStepPayload(step, form);
    const result = schema.safeParse(payload);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    setErrors(fieldErrors);
    return false;
  }

  async function next() {
    if (!validateCurrentStep()) return;
    if (step === 4) {
      setStep(5);
      await loadRecommendation();
      return;
    }
    if (step === 6) {
      await submit();
      return;
    }
    setStep((current) => Math.min(current + 1, 6));
  }

  function back() {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careRecipient: form.careRecipient,
          situations: form.situations,
          situationOther: form.situationOther || undefined,
          seniorFirstName: form.seniorFirstName,
          seniorLastName: form.seniorLastName,
          ageYears: Number(form.ageYears),
          gender: form.gender,
          area: form.area,
          livingArrangement: form.livingArrangement,
          mobility: form.mobility,
          conditions: form.conditions,
          currentCaregiverSituation: form.currentCaregiverSituation,
          urgency: form.urgency,
          contactName: form.contactName,
          relationship: form.relationship,
          contactPhone: form.contactPhone,
          contactEmail: form.contactEmail || undefined,
          contactCity: form.contactCity || undefined,
          contactCountry: form.contactCountry || 'India',
          preferredChannel: form.preferredChannel,
          consentToContact: true,
          selectedPackageSlug: form.selectedPackageSlug || undefined,
          budgetBand: form.budgetBand || undefined,
          preferredAssessmentDate: form.preferredAssessmentDate || undefined,
          preferredAssessmentSlot: form.preferredAssessmentSlot,
          additionalNotes: form.additionalNotes || undefined,
          journey,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setSubmitError(
          body?.error?.message ??
            'We could not submit this just now. Please try again, or call us instead.',
        );
        // Send them back to the earliest step with an error so they can see it.
        const firstErrorStep = findStepForErrors(body?.error?.fields ?? {});
        if (firstErrorStep != null && firstErrorStep !== step) setStep(firstErrorStep);
        return;
      }
      sessionStorage.removeItem(STORAGE_KEY);
      router.push(`/get-assessment/complete/${body.reference}`);
    } catch {
      setSubmitError(
        'We could not reach the server. Please check your connection, or call us and we will take the details over the phone.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const activeAreas = areas.filter((area) => area.isActive);
  const inactiveAreas = areas.filter((area) => !area.isActive);
  const chosenAreaInactive = inactiveAreas.some((area) => area.name === form.area);
  const recommendedPackage = packages.find(
    (pkg) => pkg.slug === (form.selectedPackageSlug || recommendation?.slug),
  );

  return (
    <div>
      <Steps steps={STEP_LABELS} current={step} className="mb-6" />

      <Card className="p-6 sm:p-8">
        {/* aria-live so the step change is announced, not just visually replaced. */}
        <div aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Step {step + 1} of 7
          </p>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-2xl font-semibold text-ink-900 outline-none"
          >
            {STEP_HEADINGS[step].title}
          </h2>
          <p className="mt-2 text-[0.9375rem] text-ink-600">{STEP_HEADINGS[step].description}</p>
        </div>

        {submitError ? (
          <Alert tone="danger" title="We could not submit this" className="mt-6">
            {submitError}
          </Alert>
        ) : null}

        <div className="mt-7">
          {/* ---------------- Step 1 — who needs care ---------------- */}
          {step === 0 ? (
            <fieldset>
              <legend className="sr-only">Who needs care?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {CARE_RECIPIENTS.map((option) => (
                  <ChoiceCard
                    key={option}
                    name="careRecipient"
                    value={option}
                    checked={form.careRecipient === option}
                    onChange={(value) => update('careRecipient', value)}
                    title={label(CARE_RECIPIENT_LABELS, option)}
                  />
                ))}
              </div>
              {errors.careRecipient ? (
                <p className="mt-3 text-sm font-medium text-danger">{errors.careRecipient}</p>
              ) : null}
            </fieldset>
          ) : null}

          {/* ---------------- Step 2 — situation ---------------- */}
          {step === 1 ? (
            <fieldset>
              <legend className="sr-only">What is the current situation?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {SITUATIONS.map((option) => (
                  <ChoiceCard
                    key={option}
                    type="checkbox"
                    name="situations"
                    value={option}
                    checked={form.situations.includes(option)}
                    onChange={(value) => {
                      const situation = value as Situation;
                      update(
                        'situations',
                        form.situations.includes(situation)
                          ? form.situations.filter((s) => s !== situation)
                          : [...form.situations, situation],
                      );
                    }}
                    title={label(SITUATION_LABELS, option)}
                  />
                ))}
              </div>
              {errors.situations ? (
                <p className="mt-3 text-sm font-medium text-danger">{errors.situations}</p>
              ) : null}

              {form.situations.includes('OTHER') ? (
                <Field
                  label="Tell us briefly what else is happening"
                  name="situationOther"
                  error={errors.situationOther}
                  className="mt-5"
                >
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      invalid={invalid}
                      value={form.situationOther}
                      onChange={(event) => update('situationOther', event.target.value)}
                    />
                  )}
                </Field>
              ) : null}
            </fieldset>
          ) : null}

          {/* ---------------- Step 3 — patient details ---------------- */}
          {step === 2 ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  name="seniorFirstName"
                  error={errors.seniorFirstName}
                  required
                >
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      invalid={invalid}
                      value={form.seniorFirstName}
                      onChange={(event) => update('seniorFirstName', event.target.value)}
                    />
                  )}
                </Field>
                <Field
                  label="Last name"
                  name="seniorLastName"
                  error={errors.seniorLastName}
                  required
                >
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      invalid={invalid}
                      value={form.seniorLastName}
                      onChange={(event) => update('seniorLastName', event.target.value)}
                    />
                  )}
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Age" name="ageYears" error={errors.ageYears} required>
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min={40}
                      max={120}
                      invalid={invalid}
                      value={form.ageYears}
                      onChange={(event) => update('ageYears', event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Gender" name="gender" error={errors.gender}>
                  {({ id, invalid }) => (
                    <Select
                      id={id}
                      invalid={invalid}
                      value={form.gender}
                      onChange={(event) => update('gender', event.target.value)}
                    >
                      {GENDERS.map((option) => (
                        <option key={option} value={option}>
                          {label(GENDER_LABELS, option)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>

              <Field
                label="Area in Mumbai"
                name="area"
                error={errors.area}
                required
                hint="We will tell you honestly if we do not cover it yet."
              >
                {({ id, invalid }) => (
                  <Select
                    id={id}
                    invalid={invalid}
                    value={form.area}
                    onChange={(event) => update('area', event.target.value)}
                  >
                    <option value="">Select an area</option>
                    <optgroup label="Areas we currently serve">
                      {activeAreas.map((area) => (
                        <option key={area.id} value={area.name}>
                          {area.name}
                        </option>
                      ))}
                    </optgroup>
                    {inactiveAreas.length ? (
                      <optgroup label="Not yet served — you can still enquire">
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

              {chosenAreaInactive || form.area === 'Elsewhere in Mumbai' ? (
                <Alert tone="warning" title="We may not cover this area yet">
                  <p>
                    Please continue anyway. We keep a waitlist by locality and a coordinator will
                    tell you honestly on the call whether we can help now or later, rather than
                    stretching cover we cannot sustain.
                  </p>
                </Alert>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Living arrangement"
                  name="livingArrangement"
                  error={errors.livingArrangement}
                  required
                >
                  {({ id, invalid }) => (
                    <Select
                      id={id}
                      invalid={invalid}
                      value={form.livingArrangement}
                      onChange={(event) => update('livingArrangement', event.target.value)}
                    >
                      <option value="">Select</option>
                      {LIVING_ARRANGEMENTS.map((option) => (
                        <option key={option} value={option}>
                          {label(LIVING_ARRANGEMENT_LABELS, option)}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Mobility" name="mobility" error={errors.mobility} required>
                  {({ id, invalid }) => (
                    <Select
                      id={id}
                      invalid={invalid}
                      value={form.mobility}
                      onChange={(event) => update('mobility', event.target.value)}
                    >
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

              {/* Free text rather than a diagnosis picker: we are not diagnosing, and a
                  family's own words are usually more accurate than a forced category. */}
              <div>
                <Label htmlFor="condition-input" hint="Add them one at a time. Optional.">
                  Relevant conditions, in your own words
                </Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="condition-input"
                    value={form.conditionDraft}
                    placeholder="e.g. diabetes, recent hip surgery"
                    onChange={(event) => update('conditionDraft', event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCondition();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addCondition}>
                    Add
                  </Button>
                </div>
                {form.conditions.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {form.conditions.map((condition) => (
                      <li key={condition}>
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              'conditions',
                              form.conditions.filter((c) => c !== condition),
                            )
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
                <p className="mt-2 text-xs text-ink-500">
                  Please do not upload reports here. We collect medical documents securely after the
                  assessment is booked.
                </p>
              </div>

              <Field
                label="Current caregiver situation"
                name="currentCaregiverSituation"
                error={errors.currentCaregiverSituation}
              >
                {({ id, invalid }) => (
                  <Select
                    id={id}
                    invalid={invalid}
                    value={form.currentCaregiverSituation}
                    onChange={(event) => update('currentCaregiverSituation', event.target.value)}
                  >
                    <option value="NONE">No help at present</option>
                    <option value="FAMILY_ONLY">Family manages everything</option>
                    <option value="PART_TIME_HELP">Part-time help</option>
                    <option value="FULL_TIME_ATTENDANT">Full-time attendant</option>
                    <option value="AGENCY">Through an agency</option>
                    <option value="OTHER">Something else</option>
                  </Select>
                )}
              </Field>
            </div>
          ) : null}

          {/* ---------------- Step 4 — urgency ---------------- */}
          {step === 3 ? (
            <fieldset>
              <legend className="sr-only">How soon is support needed?</legend>
              <div className="space-y-3">
                {URGENCIES.map((option) => (
                  <ChoiceCard
                    key={option}
                    name="urgency"
                    value={option}
                    checked={form.urgency === option}
                    onChange={(value) => update('urgency', value)}
                    title={label(URGENCY_LABELS, option)}
                    description={URGENCY_HINTS[option]}
                  />
                ))}
              </div>
              {errors.urgency ? (
                <p className="mt-3 text-sm font-medium text-danger">{errors.urgency}</p>
              ) : null}
            </fieldset>
          ) : null}

          {/* ---------------- Step 5 — family details ---------------- */}
          {step === 4 ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" name="contactName" error={errors.contactName} required>
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      invalid={invalid}
                      autoComplete="name"
                      value={form.contactName}
                      onChange={(event) => update('contactName', event.target.value)}
                    />
                  )}
                </Field>
                <Field
                  label="Your relationship to them"
                  name="relationship"
                  error={errors.relationship}
                  required
                >
                  {({ id, invalid }) => (
                    <Select
                      id={id}
                      invalid={invalid}
                      value={form.relationship}
                      onChange={(event) => update('relationship', event.target.value)}
                    >
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

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Phone"
                  name="contactPhone"
                  error={errors.contactPhone}
                  required
                  hint="Include your country code if you are outside India."
                >
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      type="tel"
                      invalid={invalid}
                      autoComplete="tel"
                      value={form.contactPhone}
                      onChange={(event) => update('contactPhone', event.target.value)}
                    />
                  )}
                </Field>
                <Field
                  label="Email"
                  name="contactEmail"
                  error={errors.contactEmail}
                  hint="Optional, but useful for written care reports."
                >
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      type="email"
                      invalid={invalid}
                      autoComplete="email"
                      value={form.contactEmail}
                      onChange={(event) => update('contactEmail', event.target.value)}
                    />
                  )}
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your city" name="contactCity" error={errors.contactCity}>
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      invalid={invalid}
                      value={form.contactCity}
                      placeholder="e.g. Mumbai, Toronto, London"
                      onChange={(event) => update('contactCity', event.target.value)}
                    />
                  )}
                </Field>
                <Field label="Your country" name="contactCountry" error={errors.contactCountry}>
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      invalid={invalid}
                      value={form.contactCountry}
                      placeholder="India"
                      onChange={(event) => update('contactCountry', event.target.value)}
                    />
                  )}
                </Field>
              </div>

              <Field
                label="How should we contact you?"
                name="preferredChannel"
                error={errors.preferredChannel}
              >
                {({ id, invalid }) => (
                  <Select
                    id={id}
                    invalid={invalid}
                    value={form.preferredChannel}
                    onChange={(event) => update('preferredChannel', event.target.value)}
                  >
                    {CONTACT_CHANNELS.map((option) => (
                      <option key={option} value={option}>
                        {label(CONTACT_CHANNEL_LABELS, option)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              {journey === 'NRI' ? (
                <Alert tone="info" title="We will work to your timezone">
                  <p>
                    We have noted that you are outside India. A coordinator will call at a time that
                    works where you are, and the assessment itself happens in Mumbai — you do not
                    need to be present.
                  </p>
                </Alert>
              ) : null}

              <div className="rounded-card border border-[color:var(--border)] bg-sand-50 p-4">
                <Checkbox
                  label="You may contact me about this enquiry"
                  description="We use these details only to arrange the assessment and discuss care. We do not sell your information, and we do not use health information for marketing."
                  checked={form.consentToContact}
                  onChange={(event) => update('consentToContact', event.target.checked)}
                />
                {errors.consentToContact ? (
                  <p className="mt-2 text-sm font-medium text-danger">{errors.consentToContact}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ---------------- Step 6 — recommendation ---------------- */}
          {step === 5 ? (
            <div>
              {loadingRecommendation ? (
                <div className="flex items-center gap-3 rounded-card border border-[color:var(--border)] p-6 text-sm text-ink-600">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Working out which plan usually fits this situation…
                </div>
              ) : (
                <>
                  {recommendation ? (
                    <Alert tone="brand" title="Based on what you told us">
                      <ul className="mt-1 space-y-1.5">
                        {recommendation.reasons.map((reason) => (
                          <li key={reason} className="flex gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-sm">
                        This is a starting point, not a decision. The assessment confirms it, and you
                        can pick something different below.
                      </p>
                    </Alert>
                  ) : null}

                  <fieldset className="mt-6">
                    <legend className="text-sm font-semibold text-ink-800">
                      Which plan would you like us to discuss?
                    </legend>
                    <div className="mt-3 space-y-3">
                      {packages.map((pkg) => (
                        <ChoiceCard
                          key={pkg.slug}
                          name="selectedPackageSlug"
                          value={pkg.slug}
                          checked={form.selectedPackageSlug === pkg.slug}
                          onChange={(value) => update('selectedPackageSlug', value)}
                          title={
                            <span className="flex flex-wrap items-center gap-2">
                              {pkg.name}
                              {recommendation?.slug === pkg.slug ? (
                                <span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">
                                  Recommended
                                </span>
                              ) : null}
                              {pkg.isComingSoon ? (
                                <span className="rounded-full bg-[#fdf3e4] px-2 py-0.5 text-xs font-semibold text-[#8a4c05]">
                                  Coming soon
                                </span>
                              ) : null}
                            </span>
                          }
                          description={
                            <span>
                              {pkg.tagline}
                              <span className="mt-1 block text-xs text-ink-500">
                                {pkg.durationLabel}
                                {pkg.priceFromPaise && !pkg.isComingSoon
                                  ? ` · from ${formatMoney(pkg.priceFromPaise)}${
                                      pkg.billingCycle === 'MONTHLY' ? ' / month' : ''
                                    }`
                                  : ' · price discussed after the assessment'}
                              </span>
                            </span>
                          }
                        />
                      ))}
                      <ChoiceCard
                        name="selectedPackageSlug"
                        value=""
                        checked={form.selectedPackageSlug === ''}
                        onChange={() => update('selectedPackageSlug', '')}
                        title="I would rather the coordinator advise me"
                        description="Perfectly reasonable. Most families are not sure at this stage."
                      />
                    </div>
                  </fieldset>

                  {recommendedPackage?.isComingSoon ? (
                    <Alert tone="warning" title="This plan is not open yet" className="mt-5">
                      <p>
                        We are still completing caregiver training for this plan and will not run it
                        until we can staff it properly in your area. Continue anyway — we will tell
                        you honestly what we can offer now and put you on the list for when it opens.
                      </p>
                    </Alert>
                  ) : null}

                  <Field
                    label="Rough monthly budget"
                    name="budgetBand"
                    error={errors.budgetBand}
                    hint="Optional. It helps us propose something realistic rather than wasting your time."
                    className="mt-6"
                  >
                    {({ id, invalid }) => (
                      <Select
                        id={id}
                        invalid={invalid}
                        value={form.budgetBand}
                        onChange={(event) => update('budgetBand', event.target.value)}
                      >
                        <option value="">Prefer not to say</option>
                        {BUDGET_BANDS.map((option) => (
                          <option key={option} value={option}>
                            {label(BUDGET_BAND_LABELS, option)}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </>
              )}
            </div>
          ) : null}

          {/* ---------------- Step 7 — book ---------------- */}
          {step === 6 ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Preferred date"
                  name="preferredAssessmentDate"
                  error={errors.preferredAssessmentDate}
                  hint="We will confirm the exact time by phone."
                >
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      type="date"
                      invalid={invalid}
                      min={new Date().toISOString().slice(0, 10)}
                      value={form.preferredAssessmentDate}
                      onChange={(event) => update('preferredAssessmentDate', event.target.value)}
                    />
                  )}
                </Field>
                <Field
                  label="Preferred time of day"
                  name="preferredAssessmentSlot"
                  error={errors.preferredAssessmentSlot}
                >
                  {({ id, invalid }) => (
                    <Select
                      id={id}
                      invalid={invalid}
                      value={form.preferredAssessmentSlot}
                      onChange={(event) => update('preferredAssessmentSlot', event.target.value)}
                    >
                      <option value="FLEXIBLE">Flexible</option>
                      <option value="MORNING">Morning</option>
                      <option value="AFTERNOON">Afternoon</option>
                      <option value="EVENING">Evening</option>
                    </Select>
                  )}
                </Field>
              </div>

              <Field
                label="Anything else we should know"
                name="additionalNotes"
                error={errors.additionalNotes}
                hint="Language preference, access to the building, a family member who should be present."
              >
                {({ id, invalid }) => (
                  <Textarea
                    id={id}
                    invalid={invalid}
                    rows={4}
                    value={form.additionalNotes}
                    onChange={(event) => update('additionalNotes', event.target.value)}
                  />
                )}
              </Field>

              {/* Summary, so nobody submits something they have not seen. */}
              <div className="rounded-card border border-[color:var(--border)] bg-sand-50 p-5">
                <h3 className="text-sm font-semibold text-ink-900">What you are sending us</h3>
                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <SummaryRow term="For" value={label(CARE_RECIPIENT_LABELS, form.careRecipient)} />
                  <SummaryRow
                    term="Their name"
                    value={`${form.seniorFirstName} ${form.seniorLastName}`.trim() || '—'}
                  />
                  <SummaryRow term="Age" value={form.ageYears || '—'} />
                  <SummaryRow term="Area" value={form.area || '—'} />
                  <SummaryRow term="Urgency" value={label(URGENCY_LABELS, form.urgency)} />
                  <SummaryRow
                    term="Plan to discuss"
                    value={recommendedPackage?.name ?? 'Coordinator to advise'}
                  />
                  <SummaryRow term="We contact" value={form.contactName || '—'} />
                  <SummaryRow
                    term="By"
                    value={label(CONTACT_CHANNEL_LABELS, form.preferredChannel)}
                  />
                </dl>
              </div>

              <p className="text-sm leading-relaxed text-ink-600">
                Submitting this creates a free assessment request. There is no payment, no card
                details, and no obligation to buy anything. A care coordinator will contact you,
                usually within{' '}
                <strong className="font-semibold text-ink-900">
                  {form.urgency === 'TODAY'
                    ? 'two hours during operating hours'
                    : form.urgency === 'WITHIN_24H'
                      ? 'four hours during operating hours'
                      : 'one working day'}
                </strong>
                .
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] pt-6">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={back} disabled={submitting}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>
          ) : (
            <span className="text-sm text-ink-500">Takes about three minutes</span>
          )}

          <Button type="button" size="lg" onClick={next} loading={submitting}>
            {step === 6 ? 'Submit my assessment request' : 'Continue'}
            {step === 6 ? null : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
      </Card>
    </div>
  );

  function addCondition() {
    const value = form.conditionDraft.trim();
    if (!value) return;
    if (form.conditions.includes(value)) {
      update('conditionDraft', '');
      return;
    }
    setForm((current) => ({
      ...current,
      conditions: [...current.conditions, value].slice(0, 20),
      conditionDraft: '',
    }));
  }
}

const STEP_HEADINGS = [
  {
    title: 'Who needs care?',
    description: 'We ask because the person receiving care and the person arranging it are usually different.',
  },
  {
    title: 'What is happening at the moment?',
    description: 'Choose everything that applies. This is what shapes the plan we suggest.',
  },
  {
    title: 'Tell us a little about them',
    description: 'Enough to judge what kind of support is realistic. Nothing medical is required yet.',
  },
  {
    title: 'How soon is support needed?',
    description: 'This decides how quickly we call you back, so please be honest rather than polite.',
  },
  {
    title: 'How do we reach you?',
    description: 'You are the person we will talk to about the plan, the schedule and the billing.',
  },
  {
    title: 'What we would usually suggest',
    description: 'A starting point based on your answers. You can choose something else.',
  },
  {
    title: 'Book the free assessment',
    description: 'No payment, no card details, and no obligation to buy anything afterwards.',
  },
];

const URGENCY_HINTS: Record<string, string> = {
  TODAY: 'A discharge today, or nobody available to care for them tonight. We aim to call within two hours during operating hours.',
  WITHIN_24H: 'Something has changed and support is needed tomorrow. We aim to call within four hours.',
  FEW_DAYS: 'You have a few days to arrange things properly.',
  WITHIN_WEEK: 'Planning ahead for something you know is coming.',
  EXPLORING: 'Understanding the options before anything is urgent. This is a good time to call us.',
};

function SummaryRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-500">{term}:</dt>
      <dd className="font-medium text-ink-900">{value}</dd>
    </div>
  );
}

/** Maps the current form onto the shape the step's schema expects. */
function buildStepPayload(step: number, form: FormState): Record<string, unknown> {
  switch (step) {
    case 0:
      return { careRecipient: form.careRecipient };
    case 1:
      return {
        situations: form.situations,
        situationOther: form.situationOther || undefined,
      };
    case 2:
      return {
        seniorFirstName: form.seniorFirstName,
        seniorLastName: form.seniorLastName,
        ageYears: form.ageYears,
        gender: form.gender,
        area: form.area,
        livingArrangement: form.livingArrangement,
        mobility: form.mobility,
        conditions: form.conditions,
        currentCaregiverSituation: form.currentCaregiverSituation,
      };
    case 3:
      return { urgency: form.urgency };
    case 4:
      return {
        contactName: form.contactName,
        relationship: form.relationship,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail || undefined,
        contactCity: form.contactCity || undefined,
        contactCountry: form.contactCountry || 'India',
        preferredChannel: form.preferredChannel,
        consentToContact: form.consentToContact,
      };
    case 5:
      return {
        selectedPackageSlug: form.selectedPackageSlug || undefined,
        budgetBand: form.budgetBand || undefined,
      };
    default:
      return {
        preferredAssessmentDate: form.preferredAssessmentDate || undefined,
        preferredAssessmentSlot: form.preferredAssessmentSlot,
        additionalNotes: form.additionalNotes || undefined,
      };
  }
}

/** Which step owns a given field, so a server rejection lands the user in the right place. */
const FIELD_STEPS: Record<string, number> = {
  careRecipient: 0,
  situations: 1,
  situationOther: 1,
  seniorFirstName: 2,
  seniorLastName: 2,
  ageYears: 2,
  gender: 2,
  area: 2,
  livingArrangement: 2,
  mobility: 2,
  conditions: 2,
  currentCaregiverSituation: 2,
  urgency: 3,
  contactName: 4,
  relationship: 4,
  contactPhone: 4,
  contactEmail: 4,
  contactCity: 4,
  contactCountry: 4,
  preferredChannel: 4,
  consentToContact: 4,
  selectedPackageSlug: 5,
  budgetBand: 5,
  preferredAssessmentDate: 6,
  preferredAssessmentSlot: 6,
  additionalNotes: 6,
};

function findStepForErrors(fields: Record<string, string>): number | null {
  const steps = Object.keys(fields)
    .map((field) => FIELD_STEPS[field])
    .filter((value): value is number => value != null);
  return steps.length ? Math.min(...steps) : null;
}
