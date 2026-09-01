import { prisma } from '@/lib/db';
import { todayRange } from './family';

/**
 * Business analytics.
 *
 * Every figure here is computed from records the business actually produced — visit
 * check-ins, lead transitions, paid invoices — rather than from a self-reported field. That
 * is deliberate: a completion rate a team can type in is a completion rate nobody believes.
 *
 * Where there is not enough data to say something meaningful, these return null rather than
 * zero, and the UI shows a dash. A 0% conversion rate computed from two leads is worse than
 * no number.
 */

export type Period = { from: Date; to: Date; label: string };

export function periodFromDays(days: number): Period {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from, to, label: `Last ${days} days` };
}

/** Headline numbers for the admin dashboard. */
export async function adminKpis(period: Period) {
  const { start, end } = todayRange();

  const [
    activePatients,
    newLeads,
    wonLeads,
    closedLeads,
    caregiverStatuses,
    unassignedActive,
    upcomingVisits,
    missedVisits,
    completedVisits,
    openIncidents,
    revenue,
    outstanding,
    referralLeads,
    ratings,
  ] = await Promise.all([
    prisma.senior.count({ where: { status: 'ACTIVE' } }),
    prisma.lead.count({ where: { createdAt: { gte: period.from } } }),
    prisma.lead.count({ where: { status: 'WON', wonAt: { gte: period.from } } }),
    prisma.lead.count({
      where: { status: { in: ['WON', 'LOST'] }, updatedAt: { gte: period.from } },
    }),
    prisma.caregiverProfile.groupBy({ by: ['status'], _count: { _all: true } }),
    // Active patients with no live caregiver assignment — the number ops must drive to zero.
    prisma.senior.count({
      where: {
        status: 'ACTIVE',
        assignments: { none: { status: { in: ['ACTIVE', 'PROPOSED'] } } },
      },
    }),
    prisma.visit.count({
      where: { scheduledStart: { gte: start, lt: new Date(end.getTime() + 6 * 86_400_000) }, status: 'SCHEDULED' },
    }),
    prisma.visit.count({ where: { status: 'MISSED', scheduledStart: { gte: period.from } } }),
    prisma.visit.count({ where: { status: 'COMPLETED', scheduledStart: { gte: period.from } } }),
    prisma.incident.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    prisma.invoice.aggregate({
      where: { status: 'PAID', paidAt: { gte: period.from } },
      _sum: { totalPaise: true },
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] } },
      _sum: { totalPaise: true },
      _count: { _all: true },
    }),
    prisma.lead.count({
      where: { createdAt: { gte: period.from }, partnerId: { not: null } },
    }),
    prisma.feedback.aggregate({
      where: { type: 'RATING', rating: { not: null } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const caregiverCount = (status: string) =>
    caregiverStatuses.find((row) => row.status === status)?._count._all ?? 0;

  const finishedVisits = completedVisits + missedVisits;

  return {
    activePatients,
    newLeads,
    wonLeads,
    // Null rather than 0% when the sample is too small to mean anything.
    conversionRate: closedLeads >= 5 ? Math.round((wonLeads / closedLeads) * 100) : null,
    activeCaregivers: caregiverCount('ASSIGNED') + caregiverCount('AVAILABLE'),
    availableCaregivers: caregiverCount('AVAILABLE'),
    caregiversOnLeave: caregiverCount('ON_LEAVE'),
    caregiversUnderReview: caregiverCount('UNDER_REVIEW'),
    unassignedActive,
    upcomingVisits,
    missedVisits,
    completedVisits,
    visitCompletionRate: finishedVisits >= 5 ? Math.round((completedVisits / finishedVisits) * 100) : null,
    openIncidents,
    revenuePaise: revenue._sum.totalPaise ?? 0,
    outstandingPaise: outstanding._sum.totalPaise ?? 0,
    outstandingCount: outstanding._count._all,
    referralLeads,
    averageRating: ratings._avg.rating,
    ratingCount: ratings._count._all,
  };
}

/** Lead funnel by status, for the pipeline view. */
export async function leadFunnel(period: Period) {
  const rows = await prisma.lead.groupBy({
    by: ['status'],
    where: { createdAt: { gte: period.from } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
}

/** Leads and conversions per week, for the trend chart. */
export async function acquisitionTrend(weeks = 8) {
  const since = new Date(Date.now() - weeks * 7 * 86_400_000);
  const leads = await prisma.lead.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, status: true, wonAt: true, journey: true },
  });

  const buckets = new Map<string, { label: string; leads: number; won: number }>();
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = new Date(Date.now() - index * 7 * 86_400_000);
    const key = weekKey(start);
    buckets.set(key, { label: weekLabel(start), leads: 0, won: 0 });
  }

  for (const lead of leads) {
    const key = weekKey(lead.createdAt);
    const bucket = buckets.get(key);
    if (bucket) bucket.leads += 1;
    if (lead.wonAt) {
      const wonBucket = buckets.get(weekKey(lead.wonAt));
      if (wonBucket) wonBucket.won += 1;
    }
  }

  return [...buckets.values()];
}

/** Conversion split by acquisition journey. */
export async function journeyBreakdown(period: Period) {
  const rows = await prisma.lead.groupBy({
    by: ['journey', 'status'],
    where: { createdAt: { gte: period.from } },
    _count: { _all: true },
  });

  const map = new Map<string, { journey: string; total: number; won: number }>();
  for (const row of rows) {
    const entry = map.get(row.journey) ?? { journey: row.journey, total: 0, won: 0 };
    entry.total += row._count._all;
    if (row.status === 'WON') entry.won += row._count._all;
    map.set(row.journey, entry);
  }
  return [...map.values()];
}

/** Lead source performance, so the business knows which relationships work. */
export async function sourcePerformance(period: Period) {
  const [sources, leads] = await Promise.all([
    prisma.leadSource.findMany({ select: { id: true, key: true, label: true } }),
    prisma.lead.findMany({
      where: { createdAt: { gte: period.from } },
      select: { sourceId: true, status: true },
    }),
  ]);

  return sources
    .map((source) => {
      const own = leads.filter((lead) => lead.sourceId === source.id);
      const won = own.filter((lead) => lead.status === 'WON').length;
      return {
        label: source.label,
        total: own.length,
        won,
        conversionRate: own.length >= 3 ? Math.round((won / own.length) * 100) : null,
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Operational quality: visit outcomes and caregiver utilisation. */
export async function operationsMetrics(period: Period) {
  const [visitStatuses, caregivers, replacements, incidentTypes] = await Promise.all([
    prisma.visit.groupBy({
      by: ['status'],
      where: { scheduledStart: { gte: period.from } },
      _count: { _all: true },
    }),
    prisma.caregiverProfile.findMany({
      select: {
        id: true,
        performanceScore: true,
        attendanceRate: true,
        maxConcurrentPatients: true,
        user: { select: { name: true } },
        assignments: {
          where: { status: 'ACTIVE' },
          select: { seniorId: true },
        },
        visits: {
          where: { scheduledStart: { gte: period.from } },
          select: { status: true },
        },
      },
    }),
    prisma.caregiverAssignment.count({
      where: { replacedAssignmentId: { not: null }, createdAt: { gte: period.from } },
    }),
    prisma.incident.groupBy({
      by: ['type'],
      where: { reportedAt: { gte: period.from } },
      _count: { _all: true },
    }),
  ]);

  const utilisation = caregivers
    .map((caregiver) => {
      const completed = caregiver.visits.filter((visit) => visit.status === 'COMPLETED').length;
      const total = caregiver.visits.length;
      return {
        name: caregiver.user.name,
        patients: new Set(caregiver.assignments.map((a) => a.seniorId)).size,
        capacity: caregiver.maxConcurrentPatients,
        visits: total,
        completionRate: total >= 3 ? Math.round((completed / total) * 100) : null,
        performanceScore: caregiver.performanceScore,
        attendanceRate: caregiver.attendanceRate,
      };
    })
    .sort((a, b) => b.visits - a.visits);

  return {
    visitStatuses: Object.fromEntries(visitStatuses.map((row) => [row.status, row._count._all])),
    utilisation,
    replacements,
    incidentTypes: incidentTypes.map((row) => ({ type: row.type, count: row._count._all })),
  };
}

/** Referral partner performance, including revenue attributed to each. */
export async function referralPerformance(period: Period) {
  const partners = await prisma.partnerProfile.findMany({
    include: {
      referrals: {
        where: { createdAt: { gte: period.from } },
        select: { id: true, status: true, seniorId: true },
      },
    },
  });

  const results = await Promise.all(
    partners.map(async (partner) => {
      const converted = partner.referrals.filter((referral) => referral.status === 'CONVERTED');
      const seniorIds = converted
        .map((referral) => referral.seniorId)
        .filter((id): id is string => Boolean(id));

      const revenue = seniorIds.length
        ? await prisma.invoice.aggregate({
            where: { seniorId: { in: seniorIds }, status: 'PAID' },
            _sum: { totalPaise: true },
          })
        : { _sum: { totalPaise: 0 } };

      return {
        id: partner.id,
        organisationName: partner.organisationName,
        partnerType: partner.partnerType,
        total: partner.referrals.length,
        contacted: partner.referrals.filter((r) =>
          ['CONTACTED', 'ASSESSMENT', 'CONVERTED'].includes(r.status),
        ).length,
        converted: converted.length,
        conversionRate:
          partner.referrals.length >= 3
            ? Math.round((converted.length / partner.referrals.length) * 100)
            : null,
        revenuePaise: revenue._sum.totalPaise ?? 0,
      };
    }),
  );

  return results.filter((row) => row.total > 0).sort((a, b) => b.total - a.total);
}

/** Monthly recurring revenue from active subscriptions. */
export async function revenueMetrics() {
  const [subscriptions, paidThisMonth, packageMix] = await Promise.all([
    prisma.subscription.aggregate({
      where: { status: { in: ['ACTIVE', 'PAST_DUE'] } },
      _sum: { amountPaise: true },
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({
      where: {
        status: 'PAID',
        paidAt: { gte: new Date(new Date().setDate(1)) },
      },
      _sum: { totalPaise: true },
    }),
    prisma.subscription.groupBy({
      by: ['packageId'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
    }),
  ]);

  const packages = await prisma.carePackage.findMany({
    where: { id: { in: packageMix.map((row) => row.packageId) } },
    select: { id: true, name: true },
  });

  return {
    mrrPaise: subscriptions._sum.amountPaise ?? 0,
    activeSubscriptions: subscriptions._count._all,
    paidThisMonthPaise: paidThisMonth._sum.totalPaise ?? 0,
    packageMix: packageMix.map((row) => ({
      label: packages.find((pkg) => pkg.id === row.packageId)?.name ?? 'Unknown',
      value: row._count._all,
    })),
  };
}

function weekKey(date: Date): string {
  const monday = new Date(date);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function weekLabel(date: Date): string {
  const monday = new Date(weekKey(date));
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(monday);
}
