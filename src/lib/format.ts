import { VITAL_META, type VitalType } from './constants';

const IST = 'Asia/Kolkata';

/**
 * Everything user-facing is rendered in a fixed timezone by default, because the
 * business operates in Mumbai. NRI families see the same instant additionally rendered
 * in their own timezone (see `formatInTimezone`), never instead of IST — a family abroad
 * still needs to know when the caregiver arrives *local to their parent*.
 */
export function formatDateTime(value: Date | string | null | undefined, tz = IST): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  }).format(date);
}

export function formatDate(value: Date | string | null | undefined, tz = IST): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: tz,
  }).format(date);
}

export function formatTime(value: Date | string | null | undefined, tz = IST): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  }).format(date);
}

export function formatDayLabel(value: Date | string, tz = IST): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: tz,
  }).format(date);
}

export function formatInTimezone(value: Date | string, tz: string): string {
  return formatDateTime(value, tz);
}

export function relativeTime(value: Date | string, now = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMs = date.getTime() - now.getTime();
  const absMin = Math.round(Math.abs(diffMs) / 60000);
  const rtf = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' });
  if (absMin < 60) return rtf.format(Math.round(diffMs / 60000), 'minute');
  if (absMin < 60 * 24) return rtf.format(Math.round(diffMs / 3600000), 'hour');
  return rtf.format(Math.round(diffMs / 86400000), 'day');
}

/** Money is stored as integer paise everywhere. Never format from a float. */
export function formatMoney(paise: number, opts: { showDecimals?: boolean } = {}): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: opts.showDecimals ? 2 : 0,
    maximumFractionDigits: opts.showDecimals ? 2 : 0,
  }).format(rupees);
}

export function formatCompactMoney(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)} Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)} L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;
  return formatMoney(paise);
}

export function formatVital(
  type: string,
  primary: number,
  secondary?: number | null,
): string {
  const meta = VITAL_META[type as VitalType];
  if (!meta) return String(primary);
  if (type === 'BLOOD_PRESSURE' && secondary != null) {
    return `${primary.toFixed(0)}/${secondary.toFixed(0)} ${meta.unit}`;
  }
  return `${primary.toFixed(meta.decimals)} ${meta.unit}`;
}

export function formatPhone(value: string | null | undefined): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return value;
}

/** Displays a partially masked phone number where the full value isn't needed. */
export function maskPhone(value: string | null | undefined): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `••••• ${digits.slice(-4)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function ageFromDob(dob: Date | null | undefined, fallback?: number | null): number | null {
  if (!dob) return fallback ?? null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}
