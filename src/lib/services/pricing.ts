/**
 * Pricing estimator.
 *
 * The public site never advertises an invented price. It shows "starting from" figures
 * that ops maintains on the CarePackage/Service records, and this calculator turns a
 * family's inputs into an *estimate* that is explicitly labelled as indicative and
 * subject to the home assessment. Every rate comes from the database — nothing is
 * hard-coded here except the shape of the arithmetic.
 */

export type PricingRate = {
  serviceId: string;
  name: string;
  unit: string;
  basePricePaise: number;
  serviceClass: string;
};

export type EstimateInput = {
  /** Caregiver support hours per day, 0 when not needed. */
  caregiverHoursPerDay: number;
  /** Days per week a caregiver attends. */
  caregiverDaysPerWeek: number;
  /** Nurse review visits per month. */
  nurseVisitsPerMonth: number;
  /** Whether a one-time home assessment is included. */
  includeAssessment: boolean;
  /** Additional service ids the family selected. */
  additionalServiceIds: string[];
  /** Coordination tier — the NRI plan sells coordination as the primary product. */
  coordinationTier: 'NONE' | 'STANDARD' | 'DEDICATED';
};

export type EstimateLine = {
  label: string;
  detail: string;
  amountPaise: number;
  recurring: boolean;
};

export type Estimate = {
  lines: EstimateLine[];
  monthlyPaise: number;
  oneTimePaise: number;
  /** Estimates are a band, not a number — a single figure reads as a quote. */
  monthlyLowPaise: number;
  monthlyHighPaise: number;
  assumptions: string[];
};

const WEEKS_PER_MONTH = 4.33;
/** Estimates are shown as ±12% because the real figure depends on the assessment. */
const BAND = 0.12;

export function estimate(input: EstimateInput, rates: PricingRate[]): Estimate {
  const byId = new Map(rates.map((r) => [r.serviceId, r]));
  const bySlugLike = (needle: string) =>
    rates.find((r) => r.name.toLowerCase().includes(needle.toLowerCase()));

  const lines: EstimateLine[] = [];
  const assumptions: string[] = [];

  const attendantRate = bySlugLike('attendant');
  if (input.caregiverHoursPerDay > 0 && input.caregiverDaysPerWeek > 0 && attendantRate) {
    const hoursPerMonth = Math.round(
      input.caregiverHoursPerDay * input.caregiverDaysPerWeek * WEEKS_PER_MONTH,
    );
    const perHour =
      attendantRate.unit === 'HOUR'
        ? attendantRate.basePricePaise
        : Math.round(attendantRate.basePricePaise / 8); // shift rates are quoted per 8h
    lines.push({
      label: 'Caregiver / attendant support',
      detail: `${input.caregiverHoursPerDay}h × ${input.caregiverDaysPerWeek} days/week ≈ ${hoursPerMonth}h per month`,
      amountPaise: hoursPerMonth * perHour,
      recurring: true,
    });
    assumptions.push('A month is taken as 4.33 weeks.');
  }

  const nurseRate = bySlugLike('nurse');
  if (input.nurseVisitsPerMonth > 0 && nurseRate) {
    lines.push({
      label: 'Nurse review visits',
      detail: `${input.nurseVisitsPerMonth} visit${input.nurseVisitsPerMonth > 1 ? 's' : ''} per month`,
      amountPaise: input.nurseVisitsPerMonth * nurseRate.basePricePaise,
      recurring: true,
    });
  }

  if (input.coordinationTier !== 'NONE') {
    const coordination = bySlugLike('coordination');
    if (coordination) {
      const multiplier = input.coordinationTier === 'DEDICATED' ? 2 : 1;
      lines.push({
        label:
          input.coordinationTier === 'DEDICATED'
            ? 'Dedicated care coordinator'
            : 'Care coordination',
        detail:
          input.coordinationTier === 'DEDICATED'
            ? 'Named coordinator, family reporting and appointment management'
            : 'Shared coordinator, scheduling and family updates',
        amountPaise: coordination.basePricePaise * multiplier,
        recurring: true,
      });
    }
  }

  for (const id of input.additionalServiceIds) {
    const service = byId.get(id);
    if (!service) continue;
    lines.push({
      label: service.name,
      detail: `Charged per ${service.unit.toLowerCase()}`,
      amountPaise: service.basePricePaise,
      recurring: service.unit === 'MONTH',
    });
  }

  if (input.includeAssessment) {
    const assessment = bySlugLike('assessment');
    if (assessment) {
      lines.push({
        label: 'Home care assessment',
        detail: 'One-time visit by a nurse or care coordinator',
        amountPaise: assessment.basePricePaise,
        recurring: false,
      });
    }
  }

  const monthlyPaise = lines.filter((l) => l.recurring).reduce((sum, l) => sum + l.amountPaise, 0);
  const oneTimePaise = lines.filter((l) => !l.recurring).reduce((sum, l) => sum + l.amountPaise, 0);

  assumptions.push('Rates are the current indicative rates held by our operations team.');
  assumptions.push('The final plan and price are confirmed after the home assessment.');

  return {
    lines,
    monthlyPaise,
    oneTimePaise,
    monthlyLowPaise: Math.round(monthlyPaise * (1 - BAND)),
    monthlyHighPaise: Math.round(monthlyPaise * (1 + BAND)),
    assumptions,
  };
}
