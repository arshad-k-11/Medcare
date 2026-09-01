import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  ApiError,
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
import { createSeniorSchema } from '@/lib/validation/care';
import { paginationQuery } from '@/lib/validation/common';
import { seniorWhere } from '@/lib/scope';
import { audit } from '@/lib/audit';
import { notifyInternal } from '@/lib/integrations/notifications';
import { writeList } from '@/lib/json-list';
import { log } from '@/lib/log';
import { SENIOR_STATUSES } from '@/lib/constants';

const listQuery = paginationQuery.extend({
  status: z.enum(SENIOR_STATUSES).optional(),
  area: z.string().optional(),
});

/** GET /api/patients — scoped to the caller's patients. */
export const GET = handler(async (request) => {
  const user = await requireCapability('patient:read');
  const query = parseQuery(request, listQuery);
  const { page, pageSize, skip, take } = pagination(query);

  const scope = await seniorWhere(user);
  const where = {
    ...scope,
    ...(query.status ? { status: query.status } : {}),
    ...(query.area ? { area: { contains: query.area } } : {}),
    ...(query.q
      ? {
          OR: [
            { firstName: { contains: query.q } },
            { lastName: { contains: query.q } },
            { area: { contains: query.q } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.senior.findMany({
      where,
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }],
      skip,
      take,
      include: {
        serviceArea: { select: { name: true } },
        supervisingNurse: { select: { user: { select: { name: true } } } },
        assignments: {
          where: { status: { in: ['ACTIVE', 'NEEDS_REPLACEMENT'] } },
          include: { caregiver: { select: { user: { select: { name: true } } } } },
        },
      },
    }),
    prisma.senior.count({ where }),
  ]);

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'patient.list.read',
    entity: 'Senior',
    metadata: { count: data.length },
  });

  return ok(paginated(data, total, page, pageSize));
});

/**
 * POST /api/patients
 *
 * A family adds the person they are arranging care for; ops adds a patient taken by phone.
 *
 * When a family creates the record, the link is created with them as primary contact and
 * payer, and consent is attributed to them by name — because the senior has not used the
 * app and somebody has to be on record as having agreed on their behalf.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('patient:create');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, createSeniorSchema);

  if (user.role === 'FAMILY' && !user.familyProfileId) {
    throw new ApiError(
      'FORBIDDEN',
      'Your account is not set up as a family profile yet. Please contact us.',
    );
  }

  const serviceArea = await prisma.serviceArea.findFirst({
    where: { name: input.area },
    select: { id: true, isActive: true, name: true },
  });

  const senior = await prisma.senior.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      ageYears: input.ageYears ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      addressLine: input.addressLine ?? null,
      area: input.area,
      pincode: input.pincode ?? null,
      serviceAreaId: serviceArea?.id ?? null,
      livingArrangement: input.livingArrangement ?? null,
      mobility: input.mobility ?? null,
      conditions: writeList(input.conditions),
      allergies: input.allergies ?? null,
      languages: writeList(input.languages),
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      hospitalPreference: input.hospitalPreference ?? null,
      notes: input.notes ?? null,
      status: 'PROSPECT',
      consentCapturedAt: new Date(),
      consentCapturedBy: `${user.name} (${(input.relationship ?? user.role).toLowerCase()})`,
      ...(user.role === 'FAMILY' && user.familyProfileId
        ? {
            familyLinks: {
              create: {
                familyProfileId: user.familyProfileId,
                relationship: input.relationship ?? 'OTHER',
                isPrimaryContact: true,
                isPrimaryPayer: true,
                canViewClinical: true,
              },
            },
          }
        : {}),
    },
    select: { id: true, firstName: true, lastName: true, area: true },
  });

  await notifyInternal({
    type: 'SYSTEM',
    title: 'A new patient record has been created',
    body: `${senior.firstName} ${senior.lastName} in ${senior.area}, added by ${user.name}. ${
      serviceArea && !serviceArea.isActive
        ? 'This area is not currently served — please tell the family honestly.'
        : 'An assessment needs to be arranged.'
    }`,
    severity: serviceArea && !serviceArea.isActive ? 'WARNING' : 'INFO',
    href: `/app/admin/patients/${senior.id}`,
    seniorId: senior.id,
  }).catch((error) => log.warn('patient.notify.failed', { error: String(error) }));

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'patient.created',
    entity: 'Senior',
    entityId: senior.id,
    seniorId: senior.id,
    metadata: { area: input.area, areaServed: serviceArea?.isActive ?? false },
  });

  return created({
    id: senior.id,
    areaServed: serviceArea?.isActive ?? false,
    message:
      serviceArea && !serviceArea.isActive
        ? 'Added. We do not currently serve that area, so a coordinator will call to tell you honestly what we can and cannot do.'
        : 'Added. A coordinator will contact you to arrange the free assessment.',
  });
});
