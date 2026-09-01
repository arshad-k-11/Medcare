import { prisma } from '@/lib/db';
import {
  created,
  enforceRateLimit,
  handler,
  ok,
  paginated,
  pagination,
  parseBody,
  parseQuery,
  requireCapability,
} from '@/lib/api';
import { createLeadSchema, listLeadsQuery } from '@/lib/validation/business';
import { audit } from '@/lib/audit';
import { reference } from '@/lib/utils';
import { writeList } from '@/lib/json-list';

/** GET /api/leads — the CRM list, filterable and paginated. */
export const GET = handler(async (request) => {
  await requireCapability('lead:read');
  const query = parseQuery(request, listLeadsQuery);
  const { page, pageSize, skip, take } = pagination(query);

  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.urgency ? { urgency: query.urgency } : {}),
    ...(query.journey ? { journey: query.journey } : {}),
    ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}),
    ...(query.q
      ? {
          OR: [
            { contactName: { contains: query.q } },
            { reference: { contains: query.q.toUpperCase() } },
            { contactPhone: { contains: query.q } },
            { area: { contains: query.q } },
          ],
        }
      : {}),
  };

  const orderBy = query.sort
    ? { [query.sort]: query.order ?? 'desc' }
    : { createdAt: 'desc' as const };

  const [data, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        owner: { select: { id: true, name: true } },
        source: { select: { key: true, label: true } },
        recommendedPackage: { select: { id: true, name: true, slug: true } },
        senior: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return ok(paginated(data, total, page, pageSize));
});

/**
 * POST /api/leads
 *
 * Manual lead entry, for enquiries that arrive by phone or in person. The web funnel uses
 * /api/intake instead, because that path also creates the patient, the family account and
 * the assessment request.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('lead:write');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, createLeadSchema);

  const source = input.sourceKey
    ? await prisma.leadSource.findUnique({ where: { key: input.sourceKey }, select: { id: true } })
    : null;

  const lead = await prisma.lead.create({
    data: {
      reference: reference('MC'),
      status: 'NEW',
      urgency: input.urgency,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail ?? null,
      relationship: input.relationship ?? null,
      contactCity: input.contactCity ?? null,
      contactCountry: input.contactCountry,
      careNeedSummary: input.careNeedSummary ?? null,
      situations: writeList(input.situations),
      area: input.area ?? null,
      budgetBand: input.budgetBand ?? null,
      journey: input.journey,
      sourceId: source?.id ?? null,
      recommendedPackageId: input.recommendedPackageId ?? null,
      // Whoever entered it owns it until it is reassigned. An unowned lead is an ignored lead.
      ownerUserId: user.id,
      notes: input.notes ?? null,
      activities: {
        create: {
          type: 'NOTE',
          summary: 'Lead entered manually.',
          toStatus: 'NEW',
          actorUserId: user.id,
        },
      },
    },
    select: { id: true, reference: true },
  });

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'lead.created',
    entity: 'Lead',
    entityId: lead.id,
    metadata: { reference: lead.reference, journey: input.journey, urgency: input.urgency },
  });

  return created({ id: lead.id, reference: lead.reference });
});
