import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Medcare';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Elder care coordination in Mumbai`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    'Professional elder-care coordination, home support, monitoring and regular family updates across Mumbai. Structured care plans, nurse supervision and visibility for families who cannot be there every day.',
  applicationName: SITE_NAME,
  keywords: [
    'elder care Mumbai',
    'home care for elderly parents',
    'post-hospital elderly care',
    'NRI parent care Mumbai',
    'senior citizen home care',
    'elder caregiver Mumbai',
  ],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
    url: SITE_URL,
    title: `${SITE_NAME} — Trusted care for your parents in Mumbai`,
    description:
      'Structured care plans, supervised caregivers and regular family updates across Mumbai.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Elder care coordination in Mumbai`,
    description:
      'Structured care plans, supervised caregivers and regular family updates across Mumbai.',
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: true, address: false, email: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Users must be able to zoom. Locking scale would break the product for its own audience.
  maximumScale: 5,
  themeColor: '#0f7d73',
};

/**
 * Accessibility preferences are read from a cookie on the server and applied as data-
 * attributes on <html>, so a senior who has chosen extra-large text never sees a flash of
 * the default size before hydration. The cookie is written by the accessibility menu and
 * mirrored onto the User record for signed-in users.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const textScale = store.get('mc_text_scale')?.value ?? 'normal';
  const contrast = store.get('mc_contrast')?.value ?? 'normal';
  const motion = store.get('mc_motion')?.value ?? 'normal';

  return (
    <html
      lang="en-IN"
      data-text-scale={['normal', 'large', 'xlarge'].includes(textScale) ? textScale : 'normal'}
      data-contrast={contrast === 'high' ? 'high' : 'normal'}
      data-motion={motion === 'reduced' ? 'reduced' : 'normal'}
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
