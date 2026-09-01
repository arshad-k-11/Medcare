import { prisma } from '@/lib/db';
import { enforceRateLimit, handler, ok, parseBody } from '@/lib/api';
import { pricingEstimateSchema } from '@/lib/validation/business';
import { estimate } from '@/lib/services/pricing';

/**
 * POST /api/pricing/estimate
 *
 * Rates come from the Service table, so the estimate reflects whatever ops currently
 * holds — the page cannot show a stale hard-coded figure, and a rate change takes effect
 * immediately. The response is a band with the working shown, never a single number, so
 * it cannot be mistaken for a quote.
 */
export const POST = handler(async (request) => {
  await enforceRateLimit('read', null, request);
  const input = await parseBody(request, pricingEstimateSchema);

  const services = await prisma.service.findMany({
    where: { isActive: true, basePricePaise: { gt: 0 } },
    select: {
      id: true,
      name: true,
      unit: true,
      basePricePaise: true,
      serviceClass: true,
    },
  });

  const result = estimate(
    input,
    services.map((service) => ({
      serviceId: service.id,
      name: service.name,
      unit: service.unit,
      basePricePaise: service.basePricePaise,
      serviceClass: service.serviceClass,
    })),
  );

  return ok(result);
});
