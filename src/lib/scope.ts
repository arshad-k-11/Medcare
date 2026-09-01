import { prisma } from './db';
import type { SessionUser } from './session';

/**
 * Row-level scoping: *which* patients a given user may touch.
 *
 * Capability checks (rbac.ts) say a nurse may read patients. This module says which
 * patients. Every route that accepts a `seniorId` from the client must run one of these,
 * because an id in a request body is an assertion by the caller, not an authorisation.
 */

export type SeniorScope =
  /** Internal staff see every patient. */
  | { kind: 'ALL' }
  /** A concrete id list, already filtered for this user. */
  | { kind: 'IDS'; ids: string[] };

export async function seniorScopeFor(user: SessionUser): Promise<SeniorScope> {
  switch (user.role) {
    case 'ADMIN':
    case 'OPS_MANAGER':
      return { kind: 'ALL' };

    case 'NURSE': {
      // A nurse sees patients they supervise plus patients they have visits or
      // assessments for — cover has to work when a colleague is on leave.
      const [supervised, viaVisits, viaAssessments] = await Promise.all([
        prisma.senior.findMany({
          where: { supervisingNurseId: user.nurseProfileId ?? '' },
          select: { id: true },
        }),
        prisma.visit.findMany({
          where: { nurseId: user.nurseProfileId ?? '' },
          select: { seniorId: true },
          distinct: ['seniorId'],
        }),
        prisma.assessment.findMany({
          where: { nurseId: user.nurseProfileId ?? '' },
          select: { seniorId: true },
          distinct: ['seniorId'],
        }),
      ]);
      return {
        kind: 'IDS',
        ids: unique([
          ...supervised.map((s) => s.id),
          ...viaVisits.map((v) => v.seniorId),
          ...viaAssessments.map((a) => a.seniorId),
        ]),
      };
    }

    case 'CAREGIVER': {
      const assignments = await prisma.caregiverAssignment.findMany({
        where: {
          caregiverId: user.caregiverProfileId ?? '',
          status: { in: ['ACTIVE', 'PROPOSED', 'NEEDS_REPLACEMENT'] },
        },
        select: { seniorId: true },
      });
      const visits = await prisma.visit.findMany({
        where: { caregiverId: user.caregiverProfileId ?? '' },
        select: { seniorId: true },
        distinct: ['seniorId'],
      });
      return {
        kind: 'IDS',
        ids: unique([...assignments.map((a) => a.seniorId), ...visits.map((v) => v.seniorId)]),
      };
    }

    case 'FAMILY': {
      const links = await prisma.seniorFamilyLink.findMany({
        where: { familyProfileId: user.familyProfileId ?? '' },
        select: { seniorId: true },
      });
      return { kind: 'IDS', ids: links.map((l) => l.seniorId) };
    }

    case 'SENIOR':
      return { kind: 'IDS', ids: user.seniorId ? [user.seniorId] : [] };

    default:
      // Referral partners never get patient-record access, only their own referrals.
      return { kind: 'IDS', ids: [] };
  }
}

/** Prisma `where` fragment that constrains a query to the user's patients. */
export async function seniorWhere(user: SessionUser): Promise<{ id?: { in: string[] } }> {
  const scope = await seniorScopeFor(user);
  return scope.kind === 'ALL' ? {} : { id: { in: scope.ids } };
}

/** Same, for models that reference a senior by foreign key. */
export async function seniorIdWhere(
  user: SessionUser,
): Promise<{ seniorId?: { in: string[] } }> {
  const scope = await seniorScopeFor(user);
  return scope.kind === 'ALL' ? {} : { seniorId: { in: scope.ids } };
}

export async function canAccessSenior(user: SessionUser, seniorId: string): Promise<boolean> {
  const scope = await seniorScopeFor(user);
  return scope.kind === 'ALL' || scope.ids.includes(seniorId);
}

/**
 * Whether this user may see clinical detail (notes marked internal, full vitals history).
 * A family member can be linked without clinical visibility — for example a relative who
 * only handles payments.
 */
export async function canViewClinical(user: SessionUser, seniorId: string): Promise<boolean> {
  if (['ADMIN', 'OPS_MANAGER', 'NURSE'].includes(user.role)) return true;
  if (user.role === 'SENIOR') return user.seniorId === seniorId;
  if (user.role === 'FAMILY') {
    const link = await prisma.seniorFamilyLink.findFirst({
      where: { seniorId, familyProfileId: user.familyProfileId ?? '' },
      select: { canViewClinical: true },
    });
    return link?.canViewClinical ?? false;
  }
  // Caregivers see care instructions, not the full clinical record.
  return false;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
