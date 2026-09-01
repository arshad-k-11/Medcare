import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getSessionUser } from '@/lib/session';
import { surfaceFor } from '@/components/app-shell/nav-config';

/**
 * Every authenticated route passes through here, so the session check happens once rather
 * than being repeated (and eventually forgotten) in each page.
 *
 * `data-surface` is set on <html> from the role, which is what raises the base font size
 * and the minimum tap target on the senior and caregiver surfaces without those pages
 * having to opt in individually.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const surface = surfaceFor(user.role);

  return (
    <>
      {surface !== 'default' ? (
        <script
          // Set before paint, so a senior never sees the default size flash first.
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.dataset.surface=${JSON.stringify(surface)};`,
          }}
        />
      ) : null}
      <AppShell user={user}>{children}</AppShell>
    </>
  );
}
