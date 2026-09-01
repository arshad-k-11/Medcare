/**
 * Shared helpers for the demo seed.
 *
 * All demo data is fabricated. No real person, hospital, doctor, review or certification
 * appears anywhere in the seed, and caregiver records deliberately carry a mix of
 * verification states so the UI never demonstrates a claim the business has not made.
 */

/** Shared across every demo account. Documented in the README; never used in production. */
export const DEMO_PASSWORD = 'Demo@12345';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fixed "now" so a single seed run produces an internally consistent timeline. */
export const NOW = new Date();

/** `at(-2, 9, 30)` = two days ago at 09:30 local time. */
export function at(daysOffset: number, hours = 9, minutes = 0): Date {
  const date = new Date(NOW.getTime() + daysOffset * DAY_MS);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** The schema stores multi-value fields as JSON strings for database portability. */
export function list(values: string[]): string {
  return JSON.stringify(values);
}
