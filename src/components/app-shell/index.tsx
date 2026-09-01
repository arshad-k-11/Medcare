import Link from 'next/link';
import { Bell, LogOut } from 'lucide-react';
import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/session';
import { Avatar } from '@/components/ui';
import { Wordmark } from '@/components/marketing/site-chrome';
import { NAV } from './nav-config';
import { RoleNav, MobileTabBar } from './role-nav';
import { AccessibilityMenu } from './accessibility-menu';
import { ROLE_LABELS } from '@/lib/constants';

/**
 * Authenticated app shell.
 *
 * A sidebar on desktop, a bottom tab bar on mobile for the roles that live on a phone
 * (caregiver and senior), and a top bar everywhere. The unread notification count is read
 * server-side so the badge is correct on first paint rather than appearing a moment later.
 */
export async function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const unread = await prisma.notification.count({
    where: { userId: user.id, readAt: null, channel: 'IN_APP' },
  });

  const items = NAV[user.role] ?? [];
  const showMobileTabs = user.role === 'CAREGIVER' || user.role === 'SENIOR';

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[color:var(--border)] bg-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col">
          <div className="border-b border-[color:var(--border)] px-5 py-4">
            <Wordmark />
            <p className="mt-2 text-xs font-medium text-ink-500">{ROLE_LABELS[user.role]}</p>
          </div>

          <RoleNav items={items} className="flex-1 overflow-y-auto p-3" />

          <div className="border-t border-[color:var(--border)] p-3">
            <div className="flex items-center gap-3 rounded-[10px] px-2 py-2">
              <Avatar name={user.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
                <p className="truncate text-xs text-ink-500">{user.email ?? user.phone ?? ''}</p>
              </div>
            </div>
            <div className="mt-1 space-y-0.5">
              <Link
                href="/app/settings"
                className="block rounded-md px-2 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              >
                Settings
              </Link>
              <a
                href="/logout"
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </a>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[color:var(--page-bg)]/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="lg:hidden">
              <Wordmark />
            </div>

            {/* Desktop nav is in the sidebar; this space is for actions. */}
            <div className="hidden lg:block" />

            <div className="flex items-center gap-1">
              <AccessibilityMenu
                initial={{
                  textScale: user.textScale,
                  highContrast: user.highContrast,
                  reduceMotion: user.reduceMotion,
                }}
              />

              <Link
                href="/app/notifications"
                className="tap-target relative inline-flex items-center justify-center rounded-md px-2 text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.625rem] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
                <span className="sr-only">
                  Notifications{unread > 0 ? ` (${unread} unread)` : ''}
                </span>
              </Link>

              <a
                href="/logout"
                className="tap-target inline-flex items-center justify-center rounded-md px-2 text-ink-600 hover:bg-ink-100 hover:text-ink-900 lg:hidden"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Sign out</span>
              </a>
            </div>
          </div>

          {/* Mobile horizontal nav for the desk-based roles. */}
          {!showMobileTabs ? (
            <RoleNav
              items={items}
              variant="horizontal"
              className="no-scrollbar flex gap-1 overflow-x-auto border-t border-[color:var(--border)] px-4 py-2 lg:hidden"
            />
          ) : null}
        </header>

        <main
          id="main"
          className={`flex-1 px-4 py-6 sm:px-6 sm:py-8 ${showMobileTabs ? 'pb-24 lg:pb-8' : ''}`}
        >
          {children}
        </main>

        {showMobileTabs ? <MobileTabBar items={items} /> : null}
      </div>
    </div>
  );
}
