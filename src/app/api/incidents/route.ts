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
import { createIncidentSchema } from '@/lib/validation/care';
import { paginationQuery } from '@/lib/validation/common';
import { canAccessSenior, seniorIdWhere } from '@/lib/scope';
import { resolveEscalation, severityToTrigger } from '@/lib/services/escalation';
import { notify, notifyInternal } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { reference } from '@/lib/utils';
import { log } from '@/lib/log';
import { INCIDENT_TYPE_LABELS, label } from '@/lib/constants';

const listQuery = paginationQuery.extend({
  seniorId: z.string().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
});

export const GET = handler(async (request) => {
  const user = await requireCapability('incident:read');
  const query = parseQuery(request, listQuery);
  const { page, pageSize, skip, take } = pagination(query);

  const scope = await seniorIdWhere(user);
  const where = {
    ...scope,
    ...(query.seniorId ? { seniorId: query.seniorId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.severity ? { severity: query.severity } : {}),
    // A family sees an incident only once we have actually told them about it.
    ...(user.role === 'FAMILY' ? { familyNotifiedAt: { not: null } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { reportedAt: 'desc' }],
      skip,
      take,
      include: {
        senior: { select: { id: true, firstName: true, lastName: true } },
        reportedBy: { select: { name: true } },
      },
    }),
    prisma.incident.count({ where }),
  ]);

  return ok(paginated(data, total, page, pageSize));
});

/**
 * POST /api/incidents — Workflow D.
 *
 * A caregiver reports; the platform classifies routing, not severity meaning; a nurse
 * confirms; the family is told if the configured rule says so.
 *
 * Deliberate choices:
 *  * Severity submitted by a caregiver is a *report*, not a determination. The record keeps
 *    it, but `severityConfirmedBy` stays null until a nurse confirms — so nothing downstream
 *    treats an untrained judgement as clinical fact.
 *  * The escalation never reaches EMERGENCY_SERVICES automatically. High severity goes to a
 *    nurse fast, and the response tells the reporter to call emergency services themselves
 *    if the situation is urgent.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('incident:create');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, createIncidentSchema);

  if (!(await canAccessSenior(user, input.seniorId))) {
    throw new ApiError('FORBIDDEN', 'You do not have access to that patient.');
  }

  const [senior, rules] = await Promise.all([
    prisma.senior.findUnique({
      where: { id: input.seniorId },
      select: {
        firstName: true,
        lastName: true,
        supervisingNurse: { select: { userId: true } },
        familyLinks: { select: { familyProfile: { select: { userId: true } } } },
      },
    }),
    prisma.escalationRule.findMany({ where: { isActive: true } }),
  ]);

  if (!senior) throw new ApiError('NOT_FOUND', 'That patient could not be found.');

  const trigger = severityToTrigger(input.severity);
  const plan = resolveEscalation(trigger, rules);
  const incidentReference = reference('INC');

  const incident = await prisma.incident.create({
    data: {
      reference: incidentReference,
      seniorId: input.seniorId,
      visitId: input.visitId ?? null,
      type: input.type,
      severity: input.severity,
      title: input.title,
      description: input.description,
      reportedByUserId: user.id,
      status: 'OPEN',
      // Left null on purpose: a nurse confirms the severity, not the reporter.
      severityConfirmedBy: null,
      familyNotifiedAt: plan.notifyFamily ? new Date() : null,
    },
  });

  await prisma.escalation.create({
    data: {
      seniorId: input.seniorId,
      incidentId: incident.id,
      trigger,
      level: plan.level,
      reason: input.title,
      raisedByUserId: user.id,
    },
  });

  // The note keeps the incident in the clinical record, not just the incident table.
  await prisma.careNote.create({
    data: {
      seniorId: input.seniorId,
      visitId: input.visitId ?? null,
      authorUserId: user.id,
      authorRole: user.role,
      type: 'INCIDENT',
      body: `${input.title}. ${input.description}`,
      visibleToFamily: plan.notifyFamily,
      requiresReview: true,
    },
  });

  // Nurse first, then ops. Never emergency services from code.
  if (senior.supervisingNurse?.userId) {
    await notify({
      userId: senior.supervisingNurse.userId,
      type: 'INCIDENT_ALERT',
      title: `${input.severity === 'HIGH' ? 'Urgent: ' : ''}${label(INCIDENT_TYPE_LABELS, input.type)} reported`,
      body: `${senior.firstName} ${senior.lastName}: ${input.title}. Reported by ${user.name}. Reference ${incidentReference}. Target review time: ${plan.withinMinutes} minutes. Please confirm the severity.`,
      severity: input.severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
      href: `/app/nurse/escalations`,
      seniorId: input.seniorId,
      channels: input.severity === 'HIGH' ? ['SMS'] : [],
    }).catch((error) => log.warn('incident.notify.nurse.failed', { error: String(error) }));
  }

  await notifyInternal({
    type: 'INCIDENT_ALERT',
    title: `Incident ${incidentReference} (${input.severity.toLowerCase()})`,
    body: `${label(INCIDENT_TYPE_LABELS, input.type)} for ${senior.firstName} ${senior.lastName}: ${input.title}`,
    severity: input.severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
    href: '/app/admin/incidents',
    seniorId: input.seniorId,
  }).catch((error) => log.warn('incident.notify.ops.failed', { error: String(error) }));

  if (plan.notifyFamily) {
    await Promise.all(
      senior.familyLinks.map((link) =>
        notify({
          userId: link.familyProfile.userId,
          type: 'INCIDENT_ALERT',
          title: 'Something has been recorded that needs your attention',
          body: `An incident was recorded for ${senior.firstName}: ${input.title}. Reference ${incidentReference}. Our nurse supervisor is reviewing it and will contact you. We have recorded what happened, not a conclusion about it.`,
          severity: 'WARNING',
          href: '/app/family',
          seniorId: input.seniorId,
          channels: input.severity === 'HIGH' ? ['SMS'] : [],
          templateKey: 'incident.family',
        }),
      ),
    ).catch((error) => log.warn('incident.notify.family.failed', { error: String(error) }));
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'incident.created',
    entity: 'Incident',
    entityId: incident.id,
    seniorId: input.seniorId,
    metadata: {
      reference: incidentReference,
      type: input.type,
      reportedSeverity: input.severity,
      escalatedTo: plan.level,
      familyNotified: plan.notifyFamily,
    },
  });

  return created({
    id: incident.id,
    reference: incidentReference,
    escalatedTo: plan.level,
    targetResponseMinutes: plan.withinMinutes,
    familyNotified: plan.notifyFamily,
    // Shown to the caregiver verbatim. This is the most important string in the API.
    message:
      input.severity === 'HIGH'
        ? `Reported. Reference ${incidentReference}. The nurse supervisor has been alerted and will contact you within ${plan.withinMinutes} minutes. If this is a medical emergency, call emergency services now — do not wait for us.`
        : `Reported. Reference ${incidentReference}. The nurse supervisor will review this within ${plan.withinMinutes} minutes. If the situation becomes urgent, call emergency services first and tell us afterwards.`,
  });
});
