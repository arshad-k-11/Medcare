'use client';

import { useEffect, useId, useState } from 'react';
import { Accessibility, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Prefs = {
  textScale: string;
  highContrast: boolean;
  reduceMotion: boolean;
};

/**
 * Accessibility controls.
 *
 * Applied optimistically to the document root so the change is instant, written to a cookie
 * so the *server* can apply it on the next render (no flash of the wrong size), and
 * persisted to the user record so it follows them to another device.
 *
 * This sits in the top bar of every authenticated page rather than buried in settings,
 * because the people who need it most are the least likely to go looking for it.
 */
export function AccessibilityMenu({ initial }: { initial: Prefs }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function apply(next: Prefs) {
    setPrefs(next);

    const root = document.documentElement;
    root.dataset.textScale = next.textScale;
    root.dataset.contrast = next.highContrast ? 'high' : 'normal';
    root.dataset.motion = next.reduceMotion ? 'reduced' : 'normal';

    // One year, lax, path-wide. Not sensitive, so no HttpOnly needed — and the client
    // needs to read it back if the page is served from a cache.
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `mc_text_scale=${next.textScale}; path=/; max-age=${maxAge}; samesite=lax`;
    document.cookie = `mc_contrast=${next.highContrast ? 'high' : 'normal'}; path=/; max-age=${maxAge}; samesite=lax`;
    document.cookie = `mc_motion=${next.reduceMotion ? 'reduced' : 'normal'}; path=/; max-age=${maxAge}; samesite=lax`;

    // Persist to the account so the preference follows the user to another device.
    void fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => {
      // The local change already applied; a failed sync is not worth interrupting for.
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="tap-target inline-flex items-center justify-center rounded-md px-2 text-ink-600 hover:bg-ink-100 hover:text-ink-900"
      >
        <Accessibility className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Display and accessibility options</span>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-full z-40 mt-2 w-72 rounded-card border border-[color:var(--border)] bg-white p-4 shadow-lift"
      >
        <h2 className="text-sm font-semibold text-ink-900">Display</h2>

        <fieldset className="mt-3">
          <legend className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Text size
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[
              { value: 'normal', label: 'Normal' },
              { value: 'large', label: 'Large' },
              { value: 'xlarge', label: 'Largest' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => apply({ ...prefs, textScale: option.value })}
                aria-pressed={prefs.textScale === option.value}
                className={cn(
                  'rounded-[10px] border px-2 py-2 text-sm font-semibold',
                  prefs.textScale === option.value
                    ? 'border-brand-600 bg-brand-50 text-brand-800'
                    : 'border-ink-200 text-ink-700 hover:bg-ink-50',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 space-y-1">
          <Toggle
            label="High contrast"
            description="Stronger borders and darker text"
            checked={prefs.highContrast}
            onChange={(checked) => apply({ ...prefs, highContrast: checked })}
          />
          <Toggle
            label="Reduce motion"
            description="Turn off animations and smooth scrolling"
            checked={prefs.reduceMotion}
            onChange={(checked) => apply({ ...prefs, reduceMotion: checked })}
          />
        </div>

        <p className="mt-4 border-t border-[color:var(--border)] pt-3 text-xs text-ink-500">
          Saved to your account, so it applies on any device you sign in from.
        </p>
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-[10px] px-2 py-2 text-left hover:bg-ink-50"
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
          checked ? 'border-brand-700 bg-brand-700 text-white' : 'border-ink-300 bg-white',
        )}
        aria-hidden="true"
      >
        {checked ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
      <span>
        <span className="block text-sm font-medium text-ink-900">{label}</span>
        <span className="block text-xs text-ink-500">{description}</span>
      </span>
    </button>
  );
}
