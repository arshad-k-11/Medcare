'use client';

import { useEffect, useState, useTransition } from 'react';
import { Alert, Button, ButtonLink, Card, Checkbox, Label, Select, Spinner } from '@/components/ui';
import { formatMoney } from '@/lib/format';

type Estimate = {
  lines: { label: string; detail: string; amountPaise: number; recurring: boolean }[];
  monthlyPaise: number;
  oneTimePaise: number;
  monthlyLowPaise: number;
  monthlyHighPaise: number;
  assumptions: string[];
};

type OptionalService = {
  id: string;
  name: string;
  unit: string;
  basePricePaise: number;
};

/**
 * Pricing estimator.
 *
 * The arithmetic runs on the server against the rates held in the database, so the page
 * cannot show a stale hard-coded rate, and the ops team changing a rate changes the
 * estimate immediately. The result is presented as a band with the working shown, because
 * a single confident number reads as a quote and this cannot be one.
 */
export function PricingCalculator({ optionalServices }: { optionalServices: OptionalService[] }) {
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [nurseVisits, setNurseVisits] = useState(1);
  const [coordination, setCoordination] = useState<'NONE' | 'STANDARD' | 'DEDICATED'>('STANDARD');
  const [includeAssessment, setIncludeAssessment] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      startTransition(() => {
        fetch('/api/pricing/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            caregiverHoursPerDay: hoursPerDay,
            caregiverDaysPerWeek: daysPerWeek,
            nurseVisitsPerMonth: nurseVisits,
            includeAssessment,
            additionalServiceIds: selectedServices,
            coordinationTier: coordination,
          }),
        })
          .then(async (response) => {
            if (!response.ok) throw new Error('estimate failed');
            setEstimate(await response.json());
            setError(null);
          })
          .catch((cause) => {
            if (cause instanceof Error && cause.name === 'AbortError') return;
            setError('We could not calculate an estimate just now. Our rate card is below.');
          });
      });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [hoursPerDay, daysPerWeek, nurseVisits, coordination, includeAssessment, selectedServices]);

  function toggleService(id: string) {
    setSelectedServices((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="p-6">
        <h3 className="font-semibold text-ink-900">What do you think is needed?</h3>
        <p className="mt-1 text-sm text-ink-600">
          Rough is fine. The assessment exists to correct this.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <Label htmlFor="hours">Caregiver support per day</Label>
            <Select
              id="hours"
              className="mt-1.5"
              value={hoursPerDay}
              onChange={(event) => setHoursPerDay(Number(event.target.value))}
            >
              <option value={0}>Not needed</option>
              <option value={2}>2 hours</option>
              <option value={4}>4 hours</option>
              <option value={6}>6 hours</option>
              <option value={8}>8 hours</option>
              <option value={12}>12 hours (full shift)</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="days">Days per week</Label>
            <Select
              id="days"
              className="mt-1.5"
              value={daysPerWeek}
              onChange={(event) => setDaysPerWeek(Number(event.target.value))}
              disabled={hoursPerDay === 0}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <option key={day} value={day}>
                  {day} {day === 1 ? 'day' : 'days'}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="nurse" hint="A nurse reviews notes and readings and updates the plan.">
              Nurse review visits per month
            </Label>
            <Select
              id="nurse"
              className="mt-1.5"
              value={nurseVisits}
              onChange={(event) => setNurseVisits(Number(event.target.value))}
            >
              {[0, 1, 2, 4].map((count) => (
                <option key={count} value={count}>
                  {count === 0 ? 'None' : `${count} per month`}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="coordination">Care coordination</Label>
            <Select
              id="coordination"
              className="mt-1.5"
              value={coordination}
              onChange={(event) =>
                setCoordination(event.target.value as 'NONE' | 'STANDARD' | 'DEDICATED')
              }
            >
              <option value="NONE">None — I will manage scheduling myself</option>
              <option value="STANDARD">Shared coordinator</option>
              <option value="DEDICATED">Dedicated coordinator (usual for NRI families)</option>
            </Select>
          </div>

          <Checkbox
            label="Include the one-time home assessment"
            checked={includeAssessment}
            onChange={(event) => setIncludeAssessment(event.target.checked)}
          />

          {optionalServices.length ? (
            <fieldset>
              <legend className="text-sm font-semibold text-ink-800">Additional services</legend>
              <div className="mt-2 space-y-2">
                {optionalServices.map((service) => (
                  <Checkbox
                    key={service.id}
                    label={`${service.name} — ${formatMoney(service.basePricePaise)} / ${service.unit.toLowerCase()}`}
                    checked={selectedServices.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                  />
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>
      </Card>

      <Card className="p-6" aria-live="polite">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink-900">Your indicative estimate</h3>
          {pending ? <Spinner className="h-4 w-4 text-ink-400" /> : null}
        </div>

        {error ? (
          <Alert tone="warning" className="mt-4">
            {error}
          </Alert>
        ) : null}

        {estimate && estimate.lines.length > 0 ? (
          <>
            <div className="mt-5 rounded-card bg-sand-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Estimated monthly range
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-ink-900">
                {formatMoney(estimate.monthlyLowPaise)} – {formatMoney(estimate.monthlyHighPaise)}
              </p>
              {estimate.oneTimePaise > 0 ? (
                <p className="mt-2 text-sm text-ink-600">
                  Plus {formatMoney(estimate.oneTimePaise)} one time
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                How that is made up
              </p>
              <ul className="mt-3 divide-y divide-[color:var(--border)]">
                {estimate.lines.map((line) => (
                  <li key={line.label} className="flex items-start justify-between gap-4 py-2.5">
                    <span className="text-sm">
                      <span className="block font-medium text-ink-900">{line.label}</span>
                      <span className="block text-ink-500">{line.detail}</span>
                    </span>
                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink-800">
                      {formatMoney(line.amountPaise)}
                      <span className="ml-1 text-xs font-normal text-ink-500">
                        {line.recurring ? '/mo' : 'once'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 rounded-card border border-[color:var(--border)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                What this assumes
              </p>
              <ul className="mt-2 space-y-1 text-sm text-ink-600">
                {estimate.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
                <li>Excludes any applicable tax, which your written plan will state.</li>
              </ul>
            </div>

            <ButtonLink href="/get-assessment" size="lg" fullWidth className="mt-6">
              Get the real plan and price
            </ButtonLink>
          </>
        ) : (
          <div className="mt-6 rounded-card border border-dashed border-ink-200 p-8 text-center">
            <p className="text-sm text-ink-600">
              Choose at least one service on the left and an estimate will appear here.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setHoursPerDay(4);
                setDaysPerWeek(4);
                setNurseVisits(1);
                setCoordination('STANDARD');
              }}
            >
              Use a typical starting plan
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
