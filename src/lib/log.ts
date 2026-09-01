/**
 * PHI-safe logging.
 *
 * This platform handles health information. Anything that reaches stdout may end up in a
 * log aggregator with a much wider audience than the application, so values under a
 * denylist of keys are replaced before they are ever serialised. Log identifiers and
 * shapes, not contents.
 */

const REDACT_KEYS = new Set([
  'password',
  'passwordhash',
  'passwordconfirm',
  'code',
  'codehash',
  'otp',
  'token',
  'tokenhash',
  'secret',
  'authorization',
  'cookie',
  'phone',
  'contactphone',
  'emergencycontactphone',
  'email',
  'contactemail',
  'addressline',
  'pincode',
  'conditions',
  'allergies',
  'medication',
  'medications',
  'dose',
  'body',
  'comment',
  'summary',
  'description',
  'notes',
  'note',
  'diagnosis',
  'valuenumber',
  'valuesecondary',
  'label',
  'firstname',
  'lastname',
  'name',
  'contactname',
  'patientname',
]);

export function redact(input: unknown, depth = 0): unknown {
  if (depth > 6) return '[deep]';
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map((v) => redact(v, depth + 1));
  if (input instanceof Date) return input.toISOString();
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = REDACT_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(value, depth + 1);
    }
    return out;
  }
  return input;
}

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;
  const line = {
    at: new Date().toISOString(),
    level,
    message,
    ...(context ? { context: redact(context) as Record<string, unknown> } : {}),
  };
  const serialised = JSON.stringify(line);
  if (level === 'error') console.error(serialised);
  else if (level === 'warn') console.warn(serialised);
  else console.log(serialised);
}

export const log = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),
};
