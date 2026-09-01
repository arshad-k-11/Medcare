import { prisma } from '@/lib/db';
import { ApiError, handler, ok, parseQuery, requireCapability } from '@/lib/api';
import { availableCaregiversQuery } from '@/lib/validation/care';
import { rankCandidates, matchBand, type CandidateInput } from '@/lib/services/matching';
import { readList } from '@/lib/json-list';
import { audit } from '@/lib/audit';

/**
 * GET /api/caregivers/available — the replacement matching engine (Workflow C).
 *
 * Returns every caregiver ranked for a specific patient and window, each with the reasons
 * they scored and the concerns against them. Two things this deliberately does NOT do:
 *
 *  1. It does not auto-assign. A person reviews the list and decides, because the factors
 *     that matter most to a family — whether their mother will accept this person — are not
 *     in the database.
 *  2. It does not hide ineligible candidates. They are returned marked ineligible with the
 *     reason, so ops can see that the shortlist is thin rather than being shown a
 *     comfortable-looking list of three.
 */
export const GET = handler(async (request) => {
  const user = await requireCapability('assignment:read');
  const query = parseQuery(request, availableCaregiversQuery);

  const senior = await prisma.senior.findUnique({
    where: { id: query.seniorId },
    include: {
      serviceArea: { select: { name: true, zone: true } },
      carePlans: {
        where: { status: 'ACTIVE' },
        take: 1,
        orderBy: { version: 'desc' },
        include: { services: { include: { service: { select: { requiredSkills: true } } } } },
      },
      assignments: {
        where: { status: { in: ['ACTIVE', 'NEEDS_REPLACEMENT'] } },
        select: { shiftPattern: true, caregiverId: true },
      },
    },
  });

  if (!senior) throw new ApiError('NOT_FOUND', 'That patient could not be found.');

  const from = query.from ? new Date(query.from) : new Date();
  const to = query.to ? new Date(query.to) : new Date(from.getTime() + 7 * 86_400_000);
  const shiftPattern =
    query.shiftPattern ?? senior.assignments[0]?.shiftPattern ?? 'DAY';

  // Skills the active care plan actually needs.
  const requiredSkills = [
    ...new Set(
      (senior.carePlans[0]?.services ?? []).flatMap((row) =>
        readList(row.service.requiredSkills),
      ),
    ),
  ];
  const languages = readList(senior.languages);

  const caregivers = await prisma.caregiverProfile.findMany({
    include: {
      user: { select: { name: true } },
      assignments: {
        where: { status: { in: ['ACTIVE', 'PROPOSED'] } },
        select: { id: true, seniorId: true, shiftPattern: true },
      },
      leaveRequests: {
        where: {
          status: 'APPROVED',
          fromDate: { lte: to },
          toDate: { gte: from },
        },
        select: { id: true },
      },
      visits: {
        where: {
          scheduledStart: { lt: to },
          scheduledEnd: { gt: from },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        },
        select: { id: true },
      },
    },
  });

  const candidates: CandidateInput[] = caregivers
    // Exclude anyone already assigned to this patient — they are not a replacement.
    .filter((caregiver) => !senior.assignments.some((a) => a.caregiverId === caregiver.id))
    .map((caregiver) => ({
      id: caregiver.id,
      name: caregiver.user.name,
      status: caregiver.status,
      verificationStatus: caregiver.verificationStatus,
      preferredAreas: caregiver.preferredAreas,
      skills: caregiver.skills,
      languages: caregiver.languages,
      experienceYears: caregiver.experienceYears,
      performanceScore: caregiver.performanceScore,
      maxConcurrentPatients: caregiver.maxConcurrentPatients,
      activeAssignmentCount: new Set(caregiver.assignments.map((a) => a.seniorId)).size,
      currentShiftPatterns: [...new Set(caregiver.assignments.map((a) => a.shiftPattern))],
      isFreeInWindow: caregiver.visits.length === 0,
      onApprovedLeave: caregiver.leaveRequests.length > 0,
    }));

  const ranked = rankCandidates(candidates, {
    area: senior.serviceArea?.name ?? senior.area,
    zone: senior.serviceArea?.zone ?? null,
    requiredSkills,
    languages,
    shiftPattern,
  });

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'caregiver.match.run',
    entity: 'Senior',
    entityId: senior.id,
    seniorId: senior.id,
    metadata: {
      candidates: ranked.length,
      eligible: ranked.filter((row) => row.eligible).length,
      shiftPattern,
    },
  });

  return ok({
    requirement: {
      area: senior.serviceArea?.name ?? senior.area,
      zone: senior.serviceArea?.zone ?? null,
      requiredSkills,
      languages,
      shiftPattern,
      from: from.toISOString(),
      to: to.toISOString(),
    },
    candidates: ranked.map((candidate) => ({ ...candidate, band: matchBand(candidate.score) })),
  });
});
