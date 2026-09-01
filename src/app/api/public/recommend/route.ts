import { z } from 'zod';
import { prisma } from '@/lib/db';
import { enforceRateLimit, handler, ok, parseBody } from '@/lib/api';
import { recommendPackage } from '@/lib/services/recommendation';
import { JOURNEYS, SITUATIONS, URGENCIES, type Situation, type Urgency } from '@/lib/constants';

const schema = z
  .object({
    situations: z.array(z.enum(SITUATIONS)).max(10).default([]),
    urgency: z.enum(URGENCIES).default('EXPLORING'),
    journey: z.enum(JOURNEYS).default('FAMILY_LOCAL'),
    livingArrangement: z.string().trim().max(40).optional(),
    mobility: z.string().trim().max(40).optional(),
    conditionCount: z.coerce.number().int().min(0).max(50).default(0),
  })
  .strict();

/**
 * POST /api/public/recommend
 *
 * Powers step 6 of the intake funnel. Runs the same transparent rule set the API uses at
 * submission, and filters the result against what is actually published — so a plan taken
 * offline in the admin console stops being recommended immediately, without a deploy.
 */
export const POST = handler(async (request) => {
  await enforceRateLimit('read', null, request);
  const input = await parseBody(request, schema);

  const recommendation = recommendPackage({
    situations: input.situations as Situation[],
    urgency: input.urgency as Urgency,
    journey: input.journey,
    livingArrangement: input.livingArrangement,
    mobility: input.mobility,
    conditionCount: input.conditionCount,
  });

  const published = await prisma.carePackage.findMany({
    where: { isPublished: true },
    select: { slug: true, isComingSoon: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  });
  const publishedSlugs = new Set(published.map((pkg) => pkg.slug));

  // If the rules picked something unpublished, fall back to the first published plan
  // rather than recommending a page that does not exist.
  const slug = publishedSlugs.has(recommendation.slug)
    ? recommendation.slug
    : (published[0]?.slug ?? recommendation.slug);

  return ok({
    slug,
    reasons: recommendation.reasons,
    alternatives: recommendation.alternatives.filter((alt) => publishedSlugs.has(alt)),
  });
});
