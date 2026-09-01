import { DEFAULT_VITAL_THRESHOLDS, VITAL_META, type VitalType } from '../constants';

/**
 * Vitals review flagging.
 *
 * This is NOT diagnosis. A reading outside the configured band is flagged
 * REQUIRES_REVIEW so a nurse looks at it — the platform never asserts what a reading
 * means, and the UI copy is held to the same rule. Thresholds are configurable globally
 * and per senior, because "normal" for an 81-year-old with hypertension is not the
 * textbook range.
 */

export type ThresholdRow = {
  type: string;
  lowValue: number | null;
  highValue: number | null;
  lowSecondary: number | null;
  highSecondary: number | null;
};

export type FlagResult = {
  flag: 'NORMAL' | 'REQUIRES_REVIEW';
  /** Neutral, factual description — never an interpretation. */
  explanation: string | null;
};

export function flagVital(
  type: string,
  primary: number,
  secondary: number | null | undefined,
  thresholds: ThresholdRow[],
): FlagResult {
  const specific = thresholds.find((t) => t.type === type);
  const fallback = DEFAULT_VITAL_THRESHOLDS[type as VitalType];
  const meta = VITAL_META[type as VitalType];

  const low = specific?.lowValue ?? fallback?.low ?? null;
  const high = specific?.highValue ?? fallback?.high ?? null;
  const lowSecondary = specific?.lowSecondary ?? fallback?.lowSecondary ?? null;
  const highSecondary = specific?.highSecondary ?? fallback?.highSecondary ?? null;

  const unit = meta?.unit ?? '';
  const outside: string[] = [];

  if (low != null && primary < low) outside.push(`below the expected range (under ${low} ${unit})`);
  if (high != null && primary > high) outside.push(`above the expected range (over ${high} ${unit})`);

  if (secondary != null) {
    if (lowSecondary != null && secondary < lowSecondary)
      outside.push(`diastolic below ${lowSecondary} ${unit}`);
    if (highSecondary != null && secondary > highSecondary)
      outside.push(`diastolic above ${highSecondary} ${unit}`);
  }

  if (outside.length === 0) return { flag: 'NORMAL', explanation: null };

  return {
    flag: 'REQUIRES_REVIEW',
    explanation: `Recorded reading is ${outside.join(' and ')}. Flagged for a nurse to review.`,
  };
}

export type TrendPoint = { at: string; value: number; secondary?: number | null };

/**
 * Direction over the series. Reported as a plain observation ("readings are higher than
 * two weeks ago"), which the nurse interprets.
 */
export function trend(points: TrendPoint[]): 'UP' | 'DOWN' | 'STEADY' | 'INSUFFICIENT' {
  if (points.length < 4) return 'INSUFFICIENT';
  const half = Math.floor(points.length / 2);
  const mean = (arr: TrendPoint[]) => arr.reduce((s, p) => s + p.value, 0) / arr.length;
  const earlier = mean(points.slice(0, half));
  const later = mean(points.slice(half));
  if (earlier === 0) return 'STEADY';
  const change = (later - earlier) / earlier;
  if (change > 0.06) return 'UP';
  if (change < -0.06) return 'DOWN';
  return 'STEADY';
}
