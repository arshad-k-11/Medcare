import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { RESOURCE_ARTICLES } from '@/content/resources';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Sitemap.
 *
 * Public marketing and content routes only. Authenticated app routes, the intake funnel's
 * confirmation pages and the legal drafts are excluded — an indexed `/track/[ref]` page or
 * a crawled dashboard route is a privacy problem, not an SEO win.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/for-families`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/for-nri-families`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/for-partners`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/care-packages`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/caregiver-supervision`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/trust-and-safety`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/service-areas`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/careers`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/resources`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/get-assessment`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
  ];

  const articleRoutes: MetadataRoute.Sitemap = RESOURCE_ARTICLES.map((article) => ({
    url: `${SITE_URL}/resources/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Package pages come from the database so an unpublished plan is never advertised.
  let packageRoutes: MetadataRoute.Sitemap = [];
  try {
    const packages = await prisma.carePackage.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });
    packageRoutes = packages.map((pkg) => ({
      url: `${SITE_URL}/care-packages/${pkg.slug}`,
      lastModified: pkg.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.8,
    }));
  } catch {
    // A sitemap should degrade rather than 500 if the database is briefly unavailable.
  }

  return [...staticRoutes, ...packageRoutes, ...articleRoutes];
}
