import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Robots policy.
 *
 * Everything behind authentication is disallowed, along with the funnel's confirmation and
 * public status-tracking routes. Those routes are addressed by an unguessable reference
 * rather than a patient id, but a crawled or cached status page still leaks that a
 * particular family made an enquiry — so they stay out of the index entirely.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/app/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/logout',
          '/track/',
          '/get-assessment/complete/',
          '/legal/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
