import { prisma } from '@/lib/db';
import { seniorScopeFor } from '@/lib/scope';
import type { SessionUser } from '@/lib/session';
import { todayRange } from './family';

/**
 * Data access for the nurse supervisor surface.
 *
 * A nurse's dashboard is a work queue, not a summary: the useful question is "what needs me
 * today", not "how are things generally". Everything here is ordered by what is waiting.
 */

/** Prisma where fragment scoping to the patients this nurse covers. */
async function scopeWhere(user: SessionUser) {
  const scope = await seniorScopeFor(user);
  return scope.kind === 'ALL' ? {} : { seniorId: { in: scope.ids } };
}

export async function nurseOverview(user: SessionUser) {
  const where = await scopeWhere(user);
  const { start, end } = todayRange();
  const scope = await seniorScopeFor(user);
  const seniorWhere = scope.kind === 'ALL' ? {} : { id: { in: scope.ids } };

  const [
    activePatients,
    notesToReview,
    vitalsToReview,
    openEscalations,
    openIncidents,
    missedVisits,
    todayVisits,
    upcomingReviews,
    plansDueReview,
  ] = await Promise.all([
    prisma.senior.count({ where: { ...seniorWhere, status: 'ACTIVE' } }),
    prisma.careNote.count({ where: { ...where, requiresReview: true, reviewedAt: null } }),
    prisma.vital.count({ where: { ...where, flag: 'REQUIRES_REVIEW', reviewedAt: null } }),
    prisma.escalation.count({ where: { ...where, closedAt: null } }),
    prisma.incident.count({ where: { ...where, status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    prisma.visit.count({
      where: {
        ...where,
        status: 'MISSED',
        scheduledStart: { gte: new Date(Date.now() - 7 * 86_400_000) },
      },
    }),
    prisma.visit.count({ where: { ...where, scheduledStart: { gte: start, lt: end } } }),
    prisma.visit.findMany({
      where: {
        nurseId: user.nurseProfileId ?? '',
        kind: 'NURSE_REVIEW',
        status: 'SCHEDULED',
        scheduledStart: { gte: new Date() },
      },
      orderBy: { scheduledStart: 'asc' },
      take: 5,
      include: { senior: { select: { id: true, firstName: true, lastName: true, area: true } } },
    }),
    prisma.carePlan.findMany({
      where: {
        ...(scope.kind === 'ALL' ? {} : { seniorId: { in: scope.ids } }),
        status: 'ACTIVE',
        reviewDate: { lte: new Date(Date.now() + 7 * 86_400_000) },
      },
      orderBy: { reviewDate: 'asc' },
      take: 5,
      include: { senior: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);

  return {
    activePatients,
    notesToReview,
    vitalsToReview,
    openEscalations,
    openIncidents,
    missedVisits,
    todayVisits,
    upcomingReviews,
    plansDueReview,
  };
}

/** The review queue: notes and readings waiting for a professional to look at them. */
export async function reviewQueue(user: SessionUser) {
  const where = await scopeWhere(user);

  const [notes, vitals] = await Promise.all([
    prisma.careNote.findMany({
      where: { ...where, requiresReview: true, reviewedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { name: true } },
        senior: { select: { id: true, firstName: true, lastName: true, area: true } },
      },
    }),
    prisma.vital.findMany({
      where: { ...where, flag: 'REQUIRES_REVIEW', reviewedAt: null },
      orderBy: { measuredAt: 'asc' },
      include: {
        recordedBy: { select: { name: true } },
        senior: { select: { id: true, firstName: true, lastName: true, area: true } },
      },
    }),
  ]);

  return { notes, vitals };
}

/** Everything a nurse needs on one patient, in one query set. */
export async function nursePatientDetail(seniorId: string) {
  const [senior, plan, visits, notes, vitals, medications, appointments, incidents, documents] =
    await Promise.all([
      prisma.senior.findUnique({
        where: { id: seniorId },
        include: {
          serviceArea: { select: { name: true } },
          supervisingNurse: { select: { user: { select: { name: true } } } },
          familyLinks: {
            include: {
              familyProfile: {
                include: { user: { select: { name: true, phone: true, email: true } } },
              },
            },
          },
          assignments: {
            where: { status: { in: ['ACTIVE', 'NEEDS_REPLACEMENT'] } },
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
        },
      }),
      prisma.carePlan.findFirst({
        where: { seniorId, status: 'ACTIVE' },
        orderBy: { version: 'desc' },
        include: {
          package: { select: { name: true } },
          services: { include: { service: { select: { name: true, serviceClass: true } } } },
          versions: { orderBy: { version: 'desc' } },
        },
      }),
      prisma.visit.findMany({
        where: { seniorId },
        orderBy: { scheduledStart: 'desc' },
        take: 20,
        include: {
          caregiver: { select: { user: { select: { name: true } } } },
          nurse: { select: { user: { select: { name: true } } } },
          tasks: { select: { id: true, label: true, status: true, note: true } },
        },
      }),
      prisma.careNote.findMany({
        where: { seniorId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { author: { select: { name: true } } },
      }),
      prisma.vital.findMany({
        where: { seniorId },
        orderBy: { measuredAt: 'desc' },
        take: 60,
        include: { recordedBy: { select: { name: true } } },
      }),
      prisma.medication.findMany({
        where: { seniorId },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        include: {
          enteredBy: { select: { name: true } },
          reminders: {
            where: { dueAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
            orderBy: { dueAt: 'desc' },
          },
        },
      }),
      prisma.appointment.findMany({
        where: { seniorId },
        orderBy: { scheduledAt: 'desc' },
        take: 10,
      }),
      prisma.incident.findMany({
        where: { seniorId },
        orderBy: { reportedAt: 'desc' },
        take: 10,
        include: { reportedBy: { select: { name: true } } },
      }),
      prisma.document.findMany({
        where: { seniorId, archivedAt: null },
        orderBy: { uploadedAt: 'desc' },
        include: { uploadedBy: { select: { name: true } } },
      }),
    ]);

  return { senior, plan, visits, notes, vitals, medications, appointments, incidents, documents };
}
