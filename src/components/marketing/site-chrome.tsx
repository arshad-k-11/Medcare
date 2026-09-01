import Link from 'next/link';
import {
  ArrowRight,
  Mail,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { MobileNav } from './mobile-nav';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Medcare';
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '';
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';

export const PRIMARY_NAV = [
  { href: '/care-packages', label: 'Care plans' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/for-nri-families', label: 'For NRI families' },
  { href: '/for-partners', label: 'For hospitals & doctors' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/service-areas', label: 'Areas we serve' },
];

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label={`${SITE_NAME} home`}>
      <span className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-700 text-base font-bold text-white"
          aria-hidden="true"
        >
          M
        </span>
        <span className="text-lg font-semibold tracking-tight text-ink-900">{SITE_NAME}</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--page-bg)]/95 backdrop-blur">
      <div className="container-wide flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Wordmark />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100"
          >
            Sign in
          </Link>
          <ButtonLink href="/get-assessment" size="sm">
            Get a free care assessment
          </ButtonLink>
        </div>

        <MobileNav items={PRIMARY_NAV} />
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[color:var(--border)] bg-white">
      <div className="container-wide px-5 py-14 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-600">
              Elder-care coordination and home support in Mumbai. Structured care plans,
              nurse-supervised caregivers, and regular updates for families who cannot be there
              every day.
            </p>
            <div className="mt-5 space-y-2 text-sm">
              {SUPPORT_PHONE ? (
                <a
                  href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}
                  className="flex items-center gap-2 text-ink-700 hover:text-brand-700"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {SUPPORT_PHONE}
                </a>
              ) : null}
              {SUPPORT_EMAIL ? (
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-center gap-2 text-ink-700 hover:text-brand-700"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {SUPPORT_EMAIL}
                </a>
              ) : null}
            </div>
          </div>

          <FooterColumn
            title="Care plans"
            links={[
              { href: '/care-packages/14-day-post-discharge-recovery', label: 'Post-discharge recovery' },
              { href: '/care-packages/monthly-chronic-care-support', label: 'Chronic care support' },
              { href: '/care-packages/nri-parent-care-coordination', label: 'NRI parent coordination' },
              { href: '/care-packages/fall-prevention-home-safety', label: 'Fall prevention' },
              { href: '/care-packages/companion-dementia-support', label: 'Companion & dementia' },
            ]}
          />

          <FooterColumn
            title="Company"
            links={[
              { href: '/about', label: 'About us' },
              { href: '/caregiver-supervision', label: 'How supervision works' },
              { href: '/trust-and-safety', label: 'Trust & safety' },
              { href: '/service-areas', label: 'Areas we serve' },
              { href: '/careers', label: 'Work with us' },
              { href: '/contact', label: 'Contact' },
            ]}
          />

          <FooterColumn
            title="Resources"
            links={[
              { href: '/resources', label: 'Family guides' },
              { href: '/faq', label: 'Frequently asked questions' },
              { href: '/for-partners', label: 'Refer a patient' },
              { href: '/login', label: 'Sign in' },
              { href: '/get-assessment', label: 'Book an assessment' },
            ]}
          />
        </div>

        {/* Legal boundaries stated plainly, not buried. */}
        <div className="mt-12 rounded-card border border-[color:var(--border)] bg-sand-50 p-5">
          <p className="flex items-start gap-2 text-sm font-semibold text-ink-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
            What we are, and what we are not
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-ink-600">
            {SITE_NAME} provides non-medical caregiver support, nursing visits and care
            coordination at home. We are not a hospital, a clinic or an emergency service, and we
            do not diagnose conditions or prescribe medication. Our platform records medication
            entered by an authorised person and sends reminders; it does not change anything a
            doctor has prescribed. In a medical emergency, contact emergency services first.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-[color:var(--border)] pt-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {SITE_NAME}. All rights reserved.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/legal/terms" className="hover:text-brand-700">
              Terms of service
            </Link>
            <Link href="/legal/privacy" className="hover:text-brand-700">
              Privacy notice
            </Link>
            <Link href="/legal/medical-disclaimer" className="hover:text-brand-700">
              Medical disclaimer
            </Link>
            <Link href="/legal/consent" className="hover:text-brand-700">
              Consent & data use
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-ink-700 hover:text-brand-700 hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Emergency notice. Placed where someone in a hurry will actually see it, and worded so it
 * cannot be mistaken for us offering emergency response.
 */
export function EmergencyNotice({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-card border border-[#f0d5aa] bg-[#fdf8ef] px-4 py-3 text-sm text-[#6b3d05] ${className ?? ''}`}
      role="note"
    >
      <strong className="font-semibold">If this is a medical emergency,</strong> call emergency
      services or go to the nearest hospital first. We arrange planned care at home — we are not an
      emergency response service.
    </div>
  );
}

export function CtaBand({
  title,
  description,
  primaryHref = '/get-assessment',
  primaryLabel = 'Get a free care assessment',
  secondaryHref = '/care-packages',
  secondaryLabel = 'Explore care plans',
}: {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="section">
      <div className="container-page overflow-hidden rounded-[20px] bg-brand-900 px-6 py-12 text-white sm:px-12 sm:py-16">
        <div className="max-w-2xl">
          <h2 className="display-title text-3xl text-balance sm:text-4xl">{title}</h2>
          <p className="mt-4 text-lg leading-relaxed text-brand-100">{description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href={primaryHref}
              size="lg"
              className="bg-white text-brand-900 hover:bg-brand-50"
            >
              {primaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink
              href={secondaryHref}
              size="lg"
              variant="ghost"
              className="border border-white/30 text-white hover:bg-white/10"
            >
              {secondaryLabel}
            </ButtonLink>
          </div>
          <p className="mt-5 text-sm text-brand-200">
            The assessment is free and there is no obligation to buy anything afterwards.
          </p>
        </div>
      </div>
    </section>
  );
}
