/**
 * The schema stores multi-value fields (languages, skills, pincodes, goals) as JSON
 * strings rather than native array columns, so the same schema runs on PostgreSQL and on
 * the SQLite demo database. These helpers are the only place that encoding is known.
 */

export function readList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function writeList(values: readonly string[] | null | undefined): string {
  return JSON.stringify(values ? [...values] : []);
}

export function readJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/** How many of `needles` appear in `haystack`, case-insensitively. */
export function overlapCount(haystack: string[], needles: string[]): number {
  const set = new Set(haystack.map((h) => h.toLowerCase().trim()));
  return needles.filter((n) => set.has(n.toLowerCase().trim())).length;
}
