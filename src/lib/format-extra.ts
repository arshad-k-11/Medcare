/** Formatting helpers used by reporting screens. */

/** "2026-03" → "Mar 2026". */
export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
}
