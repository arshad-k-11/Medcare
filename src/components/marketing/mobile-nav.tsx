'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { ButtonLink } from '@/components/ui';

/**
 * Mobile navigation.
 *
 * A disclosure rather than a full modal dialog: it does not trap focus away from the page,
 * but it does close on route change and on Escape, and the trigger keeps aria-expanded in
 * sync so screen-reader users know the state.
 */
export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="tap-target inline-flex items-center justify-center rounded-md px-2 text-ink-700 hover:bg-ink-100"
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute left-0 right-0 top-full border-b border-[color:var(--border)] bg-white shadow-lift"
      >
        <nav aria-label="Main" className="container-wide px-5 py-4 sm:px-8">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="tap-target flex items-center rounded-md px-3 text-[0.9375rem] font-medium text-ink-800 hover:bg-ink-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-[color:var(--border)] pt-4">
            <ButtonLink href="/get-assessment" fullWidth>
              Get a free care assessment
            </ButtonLink>
            <ButtonLink href="/login" variant="outline" fullWidth>
              Sign in
            </ButtonLink>
          </div>
        </nav>
      </div>
    </div>
  );
}
