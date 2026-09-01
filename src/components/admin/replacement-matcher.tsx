'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, TriangleAlert } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Progress,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui';
import { MATCH_WEIGHTS } from '@/lib/services/matching';
import { SHIFT_PATTERNS, SHIFT_PATTERN_LABELS, label, titleise } from '@/lib/constants';

type Candidate = {
  candidateId: string;
  name: string;
  score: number;
  band: 'STRONG' | 'GOOD' | 'POSSIBLE';
  reasons: string[];
  concerns: string[];
  eligible: boolean;
};

type Requirement = {
  area: string;
  zone: string | null;
  requiredSkills: string[];
  languages: string[];
  shiftPattern: string;
};

/**
 * The caregiver replacement matcher (Workflow C).
 *
 * Two things this UI insists on, because they are the difference between a real
 * differentiator and a marketing claim:
 *
 *  1. It shows the *reasoning*, not just a score. Ops has to tell a family why this person,
 *     and a number with no explanation cannot be defended to anybody.
 *  2. It shows ineligible candidates with the reason they are ineligible, rather than
 *     hiding them. A comfortable-looking shortlist of three when there is really only one
 *     option is how an operations team walks into a problem.
 *
 * Assigning requires a written reason, which the family then receives verbatim.
 */
export function ReplacementMatcher({
  seniorId,
  seniorName,
  currentAssignment,
}: {
  seniorId: string;
  seniorName: string;
  currentAssignment: {
    id: string;
    caregiverName: string;
    shiftPattern: string;
    shiftStart: string | null;
    shiftEnd: string | null;
    status: string;
  } | null;
}) {
  const router = useRouter();
  const [shiftPattern, setShiftPattern] = useState(currentAssignment?.shiftPattern ?? 'DAY');
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const query = new URLSearchParams({ seniorId, shiftPattern });
    fetch(`/api/caregivers/available?${query.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error?.message ?? 'match failed');
        setCandidates(body.candidates);
        setRequirement(body.requirement);
      })
      .catch((cause) => {
        if (cause instanceof Error && cause.name === 'AbortError') return;
        setError('We could not run the match just now. Please try again.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [seniorId, shiftPattern]);

  async function assign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    setAssigning(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/caregiver-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorId,
          caregiverId: selected.candidateId,
          role: currentAssignment ? 'REPLACEMENT' : 'PRIMARY',
          shiftPattern,
          shiftStart: currentAssignment?.shiftStart ?? undefined,
          shiftEnd: currentAssignment?.shiftEnd ?? undefined,
          replacedAssignmentId: currentAssignment?.id,
          replacementReason: currentAssignment ? String(form.get('reason')) : undefined,
          matchScore: selected.score,
          matchExplanation: selected.reasons.join(' · '),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(
          body?.error?.fields
            ? Object.values(body.error.fields).join(' ')
            : (body?.error?.message ?? 'That could not be assigned.'),
        );
        return;
      }
      setDone(body.message);
      setSelected(null);
      router.refresh();
    } catch {
      setError('We could not reach the server. Please try again.');
    } finally {
      setAssigning(false);
    }
  }

  if (done) {
    return (
      <Card className="p-6">
        <Alert tone="success" title="Assigned">
          <p>{done}</p>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => setDone(null)}>
          Run the match again
        </Button>
      </Card>
    );
  }

  const eligible = candidates?.filter((candidate) => candidate.eligible) ?? [];
  const ineligible = candidates?.filter((candidate) => !candidate.eligible) ?? [];

  return (
    <div className="space-y-5">
      {error ? (
        <Alert tone="danger" title="Something went wrong">
          {error}
        </Alert>
      ) : null}

      {currentAssignment ? (
        <Alert
          tone={currentAssignment.status === 'NEEDS_REPLACEMENT' ? 'warning' : 'info'}
          title={
            currentAssignment.status === 'NEEDS_REPLACEMENT'
              ? `${currentAssignment.caregiverName} is unavailable`
              : `Currently assigned: ${currentAssignment.caregiverName}`
          }
        >
          <p>
            Assigning someone here will end the current assignment, move every future visit to the
            new caregiver, and tell the family who is coming and why.
          </p>
        </Alert>
      ) : (
        <Alert tone="info" title={`${seniorName} has no caregiver assigned`}>
          <p>Nobody is currently scheduled to visit this patient.</p>
        </Alert>
      )}

      <Card>
        <CardHeader
          title="What we are matching against"
          description="Taken from the patient record and the active care plan."
        />
        <div className="space-y-4 px-5 py-4">
          <Field label="Shift pattern needed" name="shiftPattern">
            {({ id }) => (
              <Select
                id={id}
                value={shiftPattern}
                onChange={(event) => setShiftPattern(event.target.value)}
              >
                {SHIFT_PATTERNS.map((option) => (
                  <option key={option} value={option}>
                    {label(SHIFT_PATTERN_LABELS, option)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {requirement ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">Area</dt>
                <dd className="mt-1 text-ink-800">{requirement.area}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Languages wanted
                </dt>
                <dd className="mt-1 text-ink-800">
                  {requirement.languages.join(', ') || 'None recorded'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Skills the plan needs
                </dt>
                <dd className="mt-1 text-ink-800">
                  {requirement.requiredSkills.map(titleise).join(', ') || 'None recorded'}
                </dd>
              </div>
            </dl>
          ) : null}

          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-brand-800">
              How the score is calculated
            </summary>
            <ul className="mt-2 space-y-1 text-ink-600">
              {Object.entries(MATCH_WEIGHTS).map(([factor, weight]) => (
                <li key={factor}>
                  {titleise(factor)} — {weight} points
                </li>
              ))}
            </ul>
            <p className="mt-2 text-ink-600">
              The score ranks candidates; it does not decide. Whether a senior will accept this
              person is not in the database, so a human makes the call.
            </p>
          </details>
        </div>
      </Card>

      {loading ? (
        <Card>
          <div className="flex items-center justify-center gap-3 px-5 py-10 text-sm text-ink-600">
            <Spinner className="h-5 w-5" />
            Running the match…
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader
              title="Available candidates"
              description="Ranked, with the reasons behind each score."
              action={<Badge tone={eligible.length ? 'success' : 'danger'}>{eligible.length}</Badge>}
            />
            {eligible.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {eligible.map((candidate) => (
                  <li key={candidate.candidateId} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ink-900">{candidate.name}</p>
                          <Badge
                            tone={
                              candidate.band === 'STRONG'
                                ? 'success'
                                : candidate.band === 'GOOD'
                                  ? 'brand'
                                  : 'neutral'
                            }
                          >
                            {candidate.band === 'STRONG'
                              ? 'Strong match'
                              : candidate.band === 'GOOD'
                                ? 'Good match'
                                : 'Possible'}
                          </Badge>
                        </div>

                        <Progress
                          className="mt-2 max-w-xs"
                          value={candidate.score}
                          label={`Match score ${candidate.score}/100`}
                          tone={
                            candidate.band === 'STRONG'
                              ? 'success'
                              : candidate.band === 'GOOD'
                                ? 'brand'
                                : 'warning'
                          }
                        />

                        {candidate.reasons.length ? (
                          <ul className="mt-3 space-y-1 text-sm">
                            {candidate.reasons.map((reason) => (
                              <li key={reason} className="flex gap-2 text-ink-700">
                                <Check
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                                  aria-hidden="true"
                                />
                                {reason}
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {candidate.concerns.length ? (
                          <ul className="mt-2 space-y-1 text-sm">
                            {candidate.concerns.map((concern) => (
                              <li key={concern} className="flex gap-2 text-warning">
                                <TriangleAlert
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                  aria-hidden="true"
                                />
                                {concern}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>

                      <Button
                        size="sm"
                        variant={selected?.candidateId === candidate.candidateId ? 'secondary' : 'primary'}
                        onClick={() =>
                          setSelected(
                            selected?.candidateId === candidate.candidateId ? null : candidate,
                          )
                        }
                        className="shrink-0"
                      >
                        {selected?.candidateId === candidate.candidateId ? 'Selected' : 'Select'}
                      </Button>
                    </div>

                    {selected?.candidateId === candidate.candidateId ? (
                      <form
                        onSubmit={assign}
                        className="mt-4 space-y-3 rounded-card border border-brand-200 bg-brand-50 p-4"
                      >
                        {currentAssignment ? (
                          <Field
                            label="Why is the caregiver changing?"
                            name="reason"
                            required
                            hint="The family receives this wording. “Operational reasons” is not an acceptable answer to give a family."
                          >
                            {({ id }) => (
                              <Textarea
                                id={id}
                                name="reason"
                                rows={2}
                                required
                                placeholder="e.g. Kavita is on approved emergency leave for seven days."
                              />
                            )}
                          </Field>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Button type="submit" loading={assigning}>
                            Assign {candidate.name}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
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
                title="No eligible caregiver for this patient and shift"
                description="Widen the shift pattern, or tell the family honestly that cover will take longer. Do not assign somebody who is on leave or already at capacity."
              />
            )}
          </Card>

          {/* Shown, not hidden: ops needs to know the shortlist is thin. */}
          {ineligible.length ? (
            <Card>
              <CardHeader
                title="Not available"
                description="Shown so you can see how thin the pool actually is."
              />
              <ul className="divide-y divide-[color:var(--border)]">
                {ineligible.map((candidate) => (
                  <li key={candidate.candidateId} className="px-5 py-3">
                    <p className="text-sm font-medium text-ink-700">{candidate.name}</p>
                    <ul className="mt-1 space-y-0.5 text-sm text-ink-500">
                      {candidate.concerns.map((concern) => (
                        <li key={concern}>{concern}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
