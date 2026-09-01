import { prisma } from '@/lib/db';
import { buildTimeline, type TimelineEntry } from '@/lib/services/timeline';
import type { SessionUser } from '@/lib/session';

/**
 * Data access for the family and senior surfaces.
 *
 * Kept out of the page components so the visibility rules live in one place: a family sees
 * notes marked `visibleToFamily`, and nothing else. Getting that filter wrong in one page
 * out of six is exactly the kind of leak that this separation prevents.
 */

/** Start and end of "today" in the business timezone (IST), as UTC instants. */
export function todayRange(now = new Date()): { start: Date; end: Date } {
  const istOffsetMinutes = 330;
  const shifted = new Date(now.getTime() + istOffsetMinutes * 60_000);
  shifted.setUTCHours(0, 0, 0, 0);
  const start = new Date(shifted.getTime() - istOffsetMinutes * 60_000);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export async function seniorsForFamily(familyProfileId: string) {
  const links = await prisma.seniorFamilyLink.findMany({
    where: { familyProfileId },
    orderBy: { createdAt: 'asc' },
    include: {
      senior: {
        include: {
          serviceArea: { select: { name: true } },
          supervisingNurse: {
            select: { id: true, user: { select: { name: true } }, isCareCoordinator: true },
          },
          carePlans: {
            where: { status: 'ACTIVE' },
            orderBy: { version: 'desc' },
            take: 1,
            select: {
              id: true,
              title: true,
              version: true,
              reviewDate: true,
              scheduleSummary: true,
              package: { select: { name: true, slug: true } },
            },
          },
          assignments: {
            where: { status: { in: ['ACTIVE', 'NEEDS_REPLACEMENT'] } },
            orderBy: { startDate: 'desc' },
            include: {
              caregiver: {
                select: {
                  id: true,
                  languages: true,
                  verificationStatus: true,
                  user: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return links.map((link) => ({ ...link.senior, link }));
}

/** Today's care status for one senior — the "what happened today" block. */
export async function todayStatus(seniorId: string) {
  const { start, end } = todayRange();

  const [visits, reminders, flaggedVitals, openIncidents] = await Promise.all([
    prisma.visit.findMany({
      where: { seniorId, scheduledStart: { gte: start, lt: end } },
      orderBy: { scheduledStart: 'asc' },
      include: {
        caregiver: { select: { user: { select: { name: true } } } },
        nurse: { select: { user: { select: { name: true } } } },
        tasks: { orderBy: { sortOrder: 'asc' } },
      },
    }),
    prisma.medicationReminder.findMany({
      where: { seniorId, dueAt: { gte: start, lt: end } },
      orderBy: { dueAt: 'asc' },
      include: { medication: { select: { name: true, dose: true } } },
    }),
    prisma.vital.findMany({
      where: { seniorId, flag: 'REQUIRES_REVIEW', reviewedAt: null },
      orderBy: { measuredAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        valueNumber: true,
        valueSecondary: true,
        measuredAt: true,
        note: true,
      },
    }),
    prisma.incident.count({
      where: { seniorId, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
    }),
  ]);

  return { visits, reminders, flaggedVitals, openIncidents };
}

/**
 * Care timeline for a family. Notes not marked family-visible are excluded at the query
 * level rather than filtered in the view, so a future change to the view cannot leak them.
 */
export async function familyTimeline(seniorId: string, days = 14): Promise<TimelineEntry[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [visits, notes, vitals, reminders, appointments, incidents, planVersions, assignments] =
    await Promise.all([
      prisma.visit.findMany({
        where: { seniorId, scheduledStart: { gte: since } },
        orderBy: { scheduledStart: 'desc' },
        include: {
          caregiver: { select: { user: { select: { name: true } } } },
          nurse: { select: { user: { select: { name: true } } } },
          tasks: { select: { label: true, status: true, completedAt: true } },
        },
      }),
      prisma.careNote.findMany({
        // The family-visibility filter lives here, not in the component.
        where: { seniorId, createdAt: { gte: since }, visibleToFamily: true },
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { name: true } } },
      }),
      prisma.vital.findMany({
        where: { seniorId, measuredAt: { gte: since } },
        orderBy: { measuredAt: 'desc' },
        include: { recordedBy: { select: { name: true } } },
      }),
      prisma.medicationReminder.findMany({
        where: { seniorId, dueAt: { gte: since }, status: { in: ['CONFIRMED', 'MISSED'] } },
        orderBy: { dueAt: 'desc' },
        include: { medication: { select: { name: true } } },
      }),
      prisma.appointment.findMany({
        where: { seniorId, scheduledAt: { gte: since } },
        orderBy: { scheduledAt: 'desc' },
      }),
      prisma.incident.findMany({
        // A family only sees an incident once we have actually told them about it.
        where: { seniorId, reportedAt: { gte: since }, familyNotifiedAt: { not: null } },
        orderBy: { reportedAt: 'desc' },
      }),
      prisma.carePlanVersion.findMany({
        where: { carePlan: { seniorId }, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.caregiverAssignment.findMany({
        where: { seniorId, startDate: { gte: since } },
        orderBy: { startDate: 'desc' },
        include: { caregiver: { select: { user: { select: { name: true } } } } },
      }),
    ]);

  return buildTimeline({
    visits,
    notes,
    vitals,
    reminders,
    appointments,
    incidents,
    planVersions,
    assignments,
  });
}

export async function upcomingForSenior(seniorId: string, limit = 5) {
  const now = new Date();
  const [visits, appointments] = await Promise.all([
    prisma.visit.findMany({
      where: { seniorId, scheduledStart: { gte: now }, status: 'SCHEDULED' },
      orderBy: { scheduledStart: 'asc' },
      take: limit,
      include: {
        caregiver: { select: { user: { select: { name: true } } } },
        nurse: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.appointment.findMany({
      where: { seniorId, scheduledAt: { gte: now }, status: 'SCHEDULED' },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    }),
  ]);
  return { visits, appointments };
}

/** Vitals series for the family chart, grouped by type. */
export async function vitalsSeries(seniorId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [vitals, thresholds] = await Promise.all([
    prisma.vital.findMany({
      where: { seniorId, measuredAt: { gte: since } },
      orderBy: { measuredAt: 'asc' },
      select: {
        id: true,
        type: true,
        valueNumber: true,
        valueSecondary: true,
        unit: true,
        measuredAt: true,
        flag: true,
      },
    }),
    prisma.vitalThreshold.findMany({
      where: { OR: [{ seniorId }, { seniorId: null }], isActive: true },
    }),
  ]);

  const byType = new Map<string, typeof vitals>();
  for (const vital of vitals) {
    const list = byType.get(vital.type);
    if (list) list.push(vital);
    else byType.set(vital.type, [vital]);
  }

  return { byType, thresholds };
}

export async function familyBilling(familyProfileId: string) {
  const [invoices, subscriptions] = await Promise.all([
    prisma.invoice.findMany({
      where: { familyProfileId },
      orderBy: { createdAt: 'desc' },
      include: {
        senior: { select: { firstName: true, lastName: true } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.subscription.findMany({
      where: { familyProfileId },
      include: {
        package: { select: { name: true } },
        senior: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);
  return { invoices, subscriptions };
}

/** Resolves the senior a family surface should show, honouring an explicit ?senior= choice. */
export async function resolveSelectedSenior(
  user: SessionUser,
  requestedId?: string,
): Promise<{ seniors: Awaited<ReturnType<typeof seniorsForFamily>>; selectedId: string | null }> {
  const seniors = await seniorsForFamily(user.familyProfileId ?? '');
  if (!seniors.length) return { seniors, selectedId: null };
  const requested = requestedId && seniors.some((senior) => senior.id === requestedId);
  return { seniors, selectedId: requested ? requestedId! : seniors[0].id };
}
