import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Wordmark } from '@/components/marketing/site-chrome';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-sand-100">
      <header className="border-b border-[color:var(--border)] bg-[color:var(--page-bg)]">
        <div className="container-wide flex items-center justify-between px-5 py-3 sm:px-8">
          <Wordmark />
          <Link
            href="/"
            className="text-sm font-medium text-ink-600 hover:text-brand-700 hover:underline"
          >
            Back to the website
          </Link>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="border-t border-[color:var(--border)] bg-[color:var(--page-bg)] px-5 py-6 sm:px-8">
        <div className="container-wide flex flex-col gap-3 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
            Health information is treated as sensitive. Access is limited by role and by patient.
          </p>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-brand-700">
              Privacy notice
            </Link>
            <Link href="/legal/terms" className="hover:text-brand-700">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
