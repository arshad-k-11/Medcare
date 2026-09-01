import type { FaqItem } from '@/content/faq';

/**
 * Structured data.
 *
 * Only claims that are actually true go in here. In particular there is no
 * `aggregateRating` (the business has no verified public reviews yet), no `award`, and no
 * `hasCredential` — a fabricated rating in JSON-LD is both a search-engine violation and
 * exactly the kind of dishonesty this product cannot afford.
 */

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Medcare';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '';
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';

export function organisationSchema(serviceAreas: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'Elder-care coordination and home support in Mumbai: structured care plans, nurse-supervised caregivers and regular family updates.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Mumbai',
      addressRegion: 'Maharashtra',
      addressCountry: 'IN',
    },
    areaServed: serviceAreas.map((area) => ({
      '@type': 'City',
      name: `${area}, Mumbai`,
    })),
    ...(SUPPORT_PHONE || SUPPORT_EMAIL
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            ...(SUPPORT_PHONE ? { telephone: SUPPORT_PHONE } : {}),
            ...(SUPPORT_EMAIL ? { email: SUPPORT_EMAIL } : {}),
            availableLanguage: ['English', 'Hindi', 'Marathi'],
          },
        }
      : {}),
  };
}

export function serviceSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Elder care coordination and home support',
    provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    areaServed: { '@type': 'City', name: 'Mumbai' },
    audience: {
      '@type': 'Audience',
      audienceType: 'Families of older adults, post-discharge patients, NRI families',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      // No price is asserted here: the real figure depends on the assessment.
      availability: 'https://schema.org/LimitedAvailability',
      url: `${SITE_URL}/care-packages`,
    },
  };
}

export function faqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function packageSchema(pkg: {
  name: string;
  slug: string;
  summary: string;
  priceFromPaise: number;
  billingCycle: string;
  isComingSoon: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: pkg.name,
    description: pkg.summary,
    url: `${SITE_URL}/care-packages/${pkg.slug}`,
    provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    areaServed: { '@type': 'City', name: 'Mumbai' },
    ...(pkg.priceFromPaise && !pkg.isComingSoon
      ? {
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            // Marked as a lower bound, because it is one.
            priceSpecification: {
              '@type': 'PriceSpecification',
              minPrice: pkg.priceFromPaise / 100,
              priceCurrency: 'INR',
            },
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}

export function articleSchema(article: {
  title: string;
  description: string;
  slug: string;
  updatedAt: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: `${SITE_URL}/resources/${article.slug}`,
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}
