import { prisma } from '@/lib/db';
import {
  ApiError,
  enforceRateLimit,
  handler,
  ok,
  parseBody,
  requireCapability,
  type RouteContext,
} from '@/lib/api';
import { updateSeniorSchema } from '@/lib/validation/care';
import { canAccessSenior, canViewClinical } from '@/lib/scope';
import { audit } from '@/lib/audit';
import { writeList } from '@/lib/json-list';

/**
 * GET /api/patients/:id
 *
 * The response shape depends on what the caller is entitled to see. A caregiver gets care
 * instructions; a family member without clinical visibility gets demographics and schedule
 * but not the clinical record. Filtering here rather than in each consumer means a new
 * consumer cannot accidentally over-fetch.
 */
export const GET = handler<RouteContext<{ id: string }>>(async (_request, { params }) => {
  const user = await requireCapability('patient:read');
  const { id } = await params;

  if (!(await canAccessSenior(user, id))) {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'patient.read.denied',
      entity: 'Senior',
      entityId: id,
      outcome: 'DENIED',
    });
    throw new ApiError('NOT_FOUND', 'That patient could not be found.');
  }

  const clinical = await canViewClinical(user, id);

  const senior = await prisma.senior.findUnique({
    where: { id },
    include: {
      serviceArea: { select: { name: true, zone: true } },
      supervisingNurse: { select: { id: true, user: { select: { name: true } } } },
      assignments: {
        where: { status: { in: ['ACTIVE', 'PROPOSED', 'NEEDS_REPLACEMENT'] } },
        include: {
          caregiver: {
            select: {
              id: true,
              verificationStatus: true,
              languages: true,
              user: { select: { name: true } },
            },
          },
        },
      },
      carePlans: {
        where: { status: 'ACTIVE' },
        orderBy: { version: 'desc' },
        take: 1,
        include: { package: { select: { name: true, slug: true } } },
      },
      // Clinical collections are only fetched for callers entitled to them.
      ...(clinical
        ? {
            vitals: { orderBy: { measuredAt: 'desc' as const }, take: 30 },
            medications: { where: { isActive: true } },
            incidents: { orderBy: { reportedAt: 'desc' as const }, take: 10 },
          }
        : {}),
    },
  });

  if (!senior) throw new ApiError('NOT_FOUND', 'That patient could not be found.');

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'patient.read',
    entity: 'Senior',
    entityId: id,
    seniorId: id,
    metadata: { clinicalIncluded: clinical },
  });

  return ok({ senior, clinicalIncluded: clinical });
});

/** PATCH /api/patients/:id — staff-only updates to the patient record. */
export const PATCH = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('patient:update');
  await enforceRateLimit('write', user.id, request);
  const { id } = await params;
  const input = await parseBody(request, updateSeniorSchema);

  if (!(await canAccessSenior(user, id))) {
    throw new ApiError('NOT_FOUND', 'That patient could not be found.');
  }

  await prisma.senior.update({
    where: { id },
    data: {
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      ...(input.ageYears != null ? { ageYears: input.ageYears } : {}),
      ...(input.gender ? { gender: input.gender } : {}),
      ...(input.addressLine !== undefined ? { addressLine: input.addressLine ?? null } : {}),
      ...(input.area ? { area: input.area } : {}),
      ...(input.pincode !== undefined ? { pincode: input.pincode ?? null } : {}),
      ...(input.livingArrangement ? { livingArrangement: input.livingArrangement } : {}),
      ...(input.mobility ? { mobility: input.mobility } : {}),
      ...(input.conditions ? { conditions: writeList(input.conditions) } : {}),
      ...(input.allergies !== undefined ? { allergies: input.allergies ?? null } : {}),
      ...(input.languages ? { languages: writeList(input.languages) } : {}),
      ...(input.emergencyContactName !== undefined
        ? { emergencyContactName: input.emergencyContactName ?? null }
        : {}),
      ...(input.emergencyContactPhone !== undefined
        ? { emergencyContactPhone: input.emergencyContactPhone ?? null }
        : {}),
      ...(input.hospitalPreference !== undefined
        ? { hospitalPreference: input.hospitalPreference ?? null }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.supervisingNurseId !== undefined
        ? { supervisingNurseId: input.supervisingNurseId }
        : {}),
      ...(input.serviceAreaId !== undefined ? { serviceAreaId: input.serviceAreaId } : {}),
    },
  });

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'patient.updated',
    entity: 'Senior',
    entityId: id,
    seniorId: id,
    metadata: { fields: Object.keys(input) },
  });

  return ok({ ok: true });
});
