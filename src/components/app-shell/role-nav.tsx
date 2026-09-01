'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { isActive, type NavItem } from './nav-config';

/** Resolves a Lucide icon by name, falling back to a neutral dot. */
function Icon({ name, className }: { name: string; className?: string }) {
  const Component = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    name
  ];
  if (!Component) return <Icons.Circle className={className} />;
  return <Component className={className} />;
}

export function RoleNav({
  items,
  variant = 'sidebar',
  className,
}: {
  items: NavItem[];
  variant?: 'sidebar' | 'horizontal';
  className?: string;
}) {
  const pathname = usePathname();

  if (variant === 'horizontal') {
    return (
      <nav aria-label="Sections" className={className}>
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-semibold transition-colors',
                active ? 'bg-brand-700 text-white' : 'text-ink-600 hover:bg-ink-100',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Main" className={className}>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn('h-[18px] w-[18px] shrink-0', active && 'text-brand-700')}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Bottom tab bar for the caregiver and senior surfaces.
 *
 * Both are used one-handed on a phone, often outdoors, sometimes by someone with reduced
 * dexterity or vision — so targets are large, labels are always visible (never icon-only),
 * and there are at most five tabs.
 */
export function MobileTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const tabs = items.filter((item) => item.mobile).slice(0, 5);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--border)] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex">
        {tabs.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'tap-target flex flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[0.6875rem] font-semibold leading-tight',
                  active ? 'text-brand-800' : 'text-ink-500',
                )}
              >
                <Icon name={item.icon} className="h-6 w-6" />
                <span>{item.label}</span>
                {active ? (
                  <span
                    className="absolute bottom-0 h-0.5 w-10 rounded-full bg-brand-700"
                    aria-hidden="true"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
