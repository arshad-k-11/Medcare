import type { Journey, Situation, Urgency } from '../constants';

/**
 * Package recommendation from intake answers.
 *
 * Deliberately a transparent rule set rather than a score nobody can explain: an ops
 * person has to be able to tell a family *why* a plan was suggested, and the business
 * needs to change the rules without an engineer. Package slugs are data, so the rules
 * degrade to the fallback if a package is renamed or unpublished.
 */

export type RecommendationInput = {
  situations: Situation[];
  urgency: Urgency;
  journey: Journey;
  livingArrangement?: string | null;
  mobility?: string | null;
  conditionCount?: number;
};

export type Recommendation = {
  slug: string;
  reasons: string[];
  alternatives: string[];
};

const FALLBACK = 'monthly-chronic-care-support';

export function recommendPackage(input: RecommendationInput): Recommendation {
  const has = (s: Situation) => input.situations.includes(s);
  const reasons: string[] = [];
  const alternatives = new Set<string>();

  // Post-discharge dominates: the clinical window is short and the need is immediate.
  if (has('POST_DISCHARGE')) {
    reasons.push('Recovery after a hospital stay needs structured support in the first two weeks.');
    if (input.urgency === 'TODAY' || input.urgency === 'WITHIN_24H') {
      reasons.push('You told us support is needed straight away, so we prioritise a same-day call.');
    }
    alternatives.add('monthly-chronic-care-support');
    if (has('MOBILITY_DIFFICULTY')) alternatives.add('fall-prevention-home-safety');
    return { slug: '14-day-post-discharge-recovery', reasons, alternatives: [...alternatives] };
  }

  // An NRI family's core problem is visibility and coordination, not hours of attendance.
  if (input.journey === 'NRI' || has('NRI_SUPPORT')) {
    reasons.push('With family outside Mumbai, a single coordinator and regular reporting matter most.');
    if (has('LIVING_ALONE')) reasons.push('Your parent living alone means scheduled visits and check-ins are built in.');
    alternatives.add('monthly-chronic-care-support');
    alternatives.add('fall-prevention-home-safety');
    return { slug: 'nri-parent-care-coordination', reasons, alternatives: [...alternatives] };
  }

  if (has('COGNITIVE_SUPPORT')) {
    reasons.push('Memory and cognitive support needs a consistent companion and a predictable routine.');
    alternatives.add('monthly-chronic-care-support');
    return { slug: 'companion-dementia-support', reasons, alternatives: [...alternatives] };
  }

  // A safety assessment is the cheapest useful first step when falls are the worry and
  // there is no ongoing clinical need.
  if (
    has('MOBILITY_DIFFICULTY') &&
    !has('CHRONIC_CONDITION') &&
    !has('MEDICATION_DIFFICULTY')
  ) {
    reasons.push('Mobility difficulty without an ongoing clinical need usually starts with a home safety review.');
    alternatives.add('monthly-chronic-care-support');
    return { slug: 'fall-prevention-home-safety', reasons, alternatives: [...alternatives] };
  }

  if (has('CHRONIC_CONDITION') || has('MEDICATION_DIFFICULTY') || (input.conditionCount ?? 0) > 0) {
    reasons.push('Ongoing conditions and medication routines are best handled by a monthly supported plan.');
    if (has('LIVING_ALONE')) reasons.push('Living alone adds regular check-ins to the plan.');
    alternatives.add('nri-parent-care-coordination');
    alternatives.add('fall-prevention-home-safety');
    return { slug: 'monthly-chronic-care-support', reasons, alternatives: [...alternatives] };
  }

  if (has('COMPANIONSHIP') || has('CAREGIVER_UNAVAILABLE') || has('LIVING_ALONE')) {
    reasons.push('Regular companionship and dependable attendance are the priority here.');
    alternatives.add('companion-dementia-support');
    return { slug: 'monthly-chronic-care-support', reasons, alternatives: [...alternatives] };
  }

  reasons.push('Based on what you told us, a monthly supported plan is the usual starting point.');
  reasons.push('A free assessment will confirm what is actually needed before anything is committed.');
  return { slug: FALLBACK, reasons, alternatives: ['fall-prevention-home-safety'] };
}

/** How soon ops should make first contact, used for the lead SLA badge. */
export function firstContactSlaHours(urgency: Urgency): number {
  switch (urgency) {
    case 'TODAY':
      return 2;
    case 'WITHIN_24H':
      return 4;
    case 'FEW_DAYS':
      return 12;
    case 'WITHIN_WEEK':
      return 24;
    default:
      return 48;
  }
}
