/**
 * Accessible UI primitives.
 *
 * Kept in one module because they are small, share the same token vocabulary, and are
 * imported together everywhere. Rules that hold across all of them:
 *   * every interactive element meets the 44px minimum target (56px on senior surfaces,
 *     driven by the --tap-target token rather than per-component sizes);
 *   * status is never colour-only — pills carry a word and, where it matters, an icon;
 *   * disabled states explain themselves through `title`/`aria-describedby`, not silence.
 */
import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 tap-target';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900',
  secondary: 'bg-ink-900 text-white hover:bg-ink-800',
  outline: 'border border-ink-300 bg-white text-ink-900 hover:border-ink-400 hover:bg-ink-50',
  ghost: 'text-ink-700 hover:bg-ink-100',
  danger: 'bg-danger text-white hover:brightness-110',
  success: 'bg-success text-white hover:brightness-110',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-[0.9375rem]',
  lg: 'px-6 py-3 text-base',
  xl: 'px-7 py-4 text-lg',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({
  className,
  children,
  as: Tag = 'div',
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'article' | 'li' }) {
  return (
    <Tag
      className={cn(
        'rounded-card border border-[color:var(--border)] bg-[color:var(--surface)] shadow-soft',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('border-t border-[color:var(--border)] px-5 py-3', className)}>{children}</div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={cn(align === 'center' && 'mx-auto text-center', 'max-w-3xl', className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">{eyebrow}</p>
      ) : null}
      <h2 className="display-title mt-3 text-3xl text-ink-900 text-balance sm:text-4xl">{title}</h2>
      {description ? (
        <p className={cn('mt-4 text-lg leading-relaxed text-ink-600', align === 'center' && 'mx-auto')}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONE_STYLES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  success: 'bg-[#e8f5ee] text-[#0d6340] ring-[#b6dfc8]',
  warning: 'bg-[#fdf3e4] text-[#8a4c05] ring-[#f0d5aa]',
  danger: 'bg-[#fdecea] text-[#95190f] ring-[#f3c2bd]',
  info: 'bg-[#eaf1fd] text-[#12439c] ring-[#c2d6f7]',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  icon,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        TONE_STYLES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * Status indicator with a dot AND a label, so status never depends on colour alone.
 */
export function StatusPill({
  tone = 'neutral',
  label,
  className,
}: {
  tone?: Tone;
  label: string;
  className?: string;
}) {
  const dot: Record<Tone, string> = {
    neutral: 'bg-ink-400',
    brand: 'bg-brand-600',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        TONE_STYLES[tone],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot[tone])} aria-hidden="true" />
      {label}
    </span>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  icon,
}: {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  const border: Record<Tone, string> = {
    neutral: 'border-ink-200 bg-ink-50',
    brand: 'border-brand-200 bg-brand-50',
    success: 'border-[#b6dfc8] bg-[#f1faf5]',
    warning: 'border-[#f0d5aa] bg-[#fdf8ef]',
    danger: 'border-[#f3c2bd] bg-[#fdf3f2]',
    info: 'border-[#c2d6f7] bg-[#f2f6fe]',
  };
  return (
    <div
      className={cn('rounded-card border p-4', border[tone], className)}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <div className="flex gap-3">
        {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
        <div className="min-w-0 text-sm">
          {title ? <p className="font-semibold text-ink-900">{title}</p> : null}
          {children ? <div className={cn(title && 'mt-1', 'text-ink-700')}>{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

export function Label({
  htmlFor,
  children,
  hint,
  required,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-sm font-semibold text-ink-800', className)}>
      {children}
      {required ? (
        <span className="ml-1 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
      {hint ? <span className="mt-1 block font-normal text-ink-500">{hint}</span> : null}
    </label>
  );
}

const CONTROL_BASE =
  'block w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-[0.9375rem] text-ink-900 placeholder:text-ink-400 disabled:bg-ink-50 disabled:text-ink-500';

export type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
};

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        CONTROL_BASE,
        'tap-target',
        invalid ? 'border-danger' : 'border-ink-300',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(CONTROL_BASE, invalid ? 'border-danger' : 'border-ink-300', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        CONTROL_BASE,
        'tap-target appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'%23657283\'%3E%3Cpath d=\'M6 8l4 4 4-4\' stroke=\'%23657283\' stroke-width=\'1.6\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat pr-10',
        invalid ? 'border-danger' : 'border-ink-300',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
});

export function FieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
      <span aria-hidden="true">⚠</span>
      <span>{children}</span>
    </p>
  );
}

/** Label + control + error, wired together with the right aria attributes. */
export function Field({
  label,
  name,
  error,
  hint,
  required,
  className,
  children,
}: FieldProps & { children: (props: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode }) {
  const id = `field-${name}`;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id} hint={hint} required={required}>
        {label}
      </Label>
      <div className="mt-1.5">
        {children({ id, describedBy: errorId, invalid: Boolean(error) })}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

/**
 * Large tappable choice card, used throughout the intake wizard and the senior UI.
 * Radio semantics are preserved — the visual is a card, the control is still an input.
 */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  type = 'radio',
  disabled,
  className,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  type?: 'radio' | 'checkbox';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-card border p-4 transition-colors',
        checked
          ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
          : 'border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/40',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700"
      />
      <span className="min-w-0">
        <span className="block font-semibold text-ink-900">{title}</span>
        {description ? <span className="mt-1 block text-sm text-ink-600">{description}</span> : null}
      </span>
    </label>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <label className={cn('flex items-start gap-3 text-sm', className)}>
      <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700" {...props} />
      <span>
        <span className="font-medium text-ink-800">{label}</span>
        {description ? <span className="mt-0.5 block text-ink-600">{description}</span> : null}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Data display
// ---------------------------------------------------------------------------

export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
  className?: string;
}) {
  const accent: Record<Tone, string> = {
    neutral: 'text-ink-900',
    brand: 'text-brand-700',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    info: 'text-info',
  };
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={cn('mt-2 text-2xl font-semibold tabular-nums', accent[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          'block rounded-card border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-soft transition-colors hover:border-brand-300',
          className,
        )}
      >
        {body}
      </Link>
    );
  }
  return (
    <div
      className={cn(
        'rounded-card border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-soft',
        className,
      )}
    >
      {body}
    </div>
  );
}

export function DescriptionList({
  items,
  columns = 2,
  className,
}: {
  items: { label: string; value: React.ReactNode }[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">{item.label}</dt>
          <dd className="mt-1 text-[0.9375rem] text-ink-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Table({
  head,
  children,
  caption,
  className,
}: {
  head: React.ReactNode[];
  children: React.ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <div className="table-scroll">
      <table className={cn('w-full min-w-[40rem] border-collapse text-left text-sm', className)}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-[color:var(--border)]">
            {head.map((cell, index) => (
              <th
                key={index}
                scope="col"
                className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border)]">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn('px-3 py-3 align-top text-ink-800', className)}>
      {children}
    </td>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('px-6 py-12 text-center', className)}>
      {icon ? <div className="mx-auto mb-4 text-ink-300">{icon}</div> : null}
      <p className="text-base font-semibold text-ink-900">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-ink-100', className)}
      aria-hidden="true"
    />
  );
}

export function Progress({
  value,
  max = 100,
  label,
  tone = 'brand',
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: Tone;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill: Record<Tone, string> = {
    neutral: 'bg-ink-400',
    brand: 'bg-brand-600',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  };
  return (
    <div className={className}>
      {label ? (
        <div className="mb-1.5 flex items-baseline justify-between text-xs text-ink-600">
          <span>{label}</span>
          <span className="font-semibold tabular-nums">{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div className={cn('h-full rounded-full transition-all', fill[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
  };
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800',
        sizes[size],
        className,
      )}
      aria-hidden="true"
    >
      {letters}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export function Tabs({
  items,
  current,
  className,
}: {
  items: { href: string; label: string; count?: number }[];
  current: string;
  className?: string;
}) {
  return (
    <nav className={cn('no-scrollbar -mx-1 flex gap-1 overflow-x-auto', className)} aria-label="Sections">
      {items.map((item) => {
        const active = current === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'whitespace-nowrap rounded-[10px] px-3.5 py-2 text-sm font-semibold transition-colors',
              active ? 'bg-brand-700 text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
            )}
          >
            {item.label}
            {item.count != null ? (
              <span
                className={cn(
                  'ml-2 rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                  active ? 'bg-white/20' : 'bg-ink-100 text-ink-600',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  buildHref,
}: {
  page: number;
  totalPages: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) {
    return (
      <p className="px-5 py-3 text-xs text-ink-500">
        {total} {total === 1 ? 'record' : 'records'}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <p className="text-xs text-ink-500">
        Page {page} of {totalPages} · {total} records
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <ButtonLink href={buildHref(page - 1)} variant="outline" size="sm">
            Previous
          </ButtonLink>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {page < totalPages ? (
          <ButtonLink href={buildHref(page + 1)} variant="outline" size="sm">
            Next
          </ButtonLink>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumb?: { href: string; label: string }[];
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6', className)}>
      {breadcrumb?.length ? (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
            {breadcrumb.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                <Link href={crumb.href} className="hover:text-brand-700 hover:underline">
                  {crumb.label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
          {description ? <p className="mt-1.5 text-[0.9375rem] text-ink-600">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

/** Numbered step indicator for the intake wizard. */
export function Steps({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'todo';
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-bold',
                state === 'done' && 'bg-brand-700 text-white',
                state === 'active' && 'bg-brand-100 text-brand-800 ring-2 ring-brand-600',
                state === 'todo' && 'bg-ink-100 text-ink-500',
              )}
              aria-hidden="true"
            >
              {state === 'done' ? '✓' : index + 1}
            </span>
            <span
              className={cn(
                'hidden font-medium sm:inline',
                state === 'active' ? 'text-ink-900' : 'text-ink-500',
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span className="h-px w-4 bg-ink-200 sm:w-6" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
