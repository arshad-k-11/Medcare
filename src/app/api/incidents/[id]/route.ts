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
import { updateIncidentSchema } from '@/lib/validation/care';
import { canAccessSenior } from '@/lib/scope';
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';

/**
 * PATCH /api/incidents/:id
 *
 * A nurse or ops confirms severity, records actions and closes the incident. Confirming a
 * severity stamps `severityConfirmedBy` — that field is the difference between a
 * caregiver's report and a professional's determination, and it is the reason the two are
 * modelled separately.
 */
export const PATCH = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('incident:update');
  await enforceRateLimit('write', user.id, request);
  const { id } = await params;
  const input = await parseBody(request, updateIncidentSchema);

  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      senior: {
        select: {
          firstName: true,
          familyLinks: { select: { familyProfile: { select: { userId: true } } } },
        },
      },
    },
  });

  if (!incident || !(await canAccessSenior(user, incident.seniorId))) {
    throw new ApiError('NOT_FOUND', 'That incident could not be found.');
  }

  const closing = input.status === 'RESOLVED' || input.status === 'CLOSED';
  if (closing && !input.resolution && !incident.resolution) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'Please record what was done before closing this incident.',
      { resolution: 'Required to close an incident' },
    );
  }

  const notifyFamilyNow = input.notifyFamily && !incident.familyNotifiedAt;

  await prisma.incident.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.severity
        ? { severity: input.severity, severityConfirmedBy: user.name }
        : {}),
      ...(input.actionsTaken !== undefined ? { actionsTaken: input.actionsTaken ?? null } : {}),
      ...(input.resolution !== undefined ? { resolution: input.resolution ?? null } : {}),
      ...(closing ? { resolvedAt: new Date() } : {}),
      ...(notifyFamilyNow ? { familyNotifiedAt: new Date() } : {}),
    },
  });

  // Close any open escalation when the incident closes, so the queue reflects reality.
  if (closing) {
    await prisma.escalation.updateMany({
      where: { incidentId: id, closedAt: null },
      data: {
        closedAt: new Date(),
        closureNote: input.resolution ?? incident.resolution ?? 'Incident closed.',
      },
    });
  }

  if (notifyFamilyNow) {
    await Promise.all(
      incident.senior.familyLinks.map((link) =>
        notify({
          userId: link.familyProfile.userId,
          type: 'INCIDENT_ALERT',
          title: 'Something has been recorded that needs your attention',
          body: `An incident was recorded for ${incident.senior.firstName}: ${incident.title}. Reference ${incident.reference}. Our nurse supervisor has reviewed it and will contact you.`,
          severity: 'WARNING',
          href: '/app/family',
          seniorId: incident.seniorId,
        }),
      ),
    ).catch((error) => log.warn('incident.update.notify.failed', { error: String(error) }));
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: closing ? 'incident.closed' : 'incident.updated',
    entity: 'Incident',
    entityId: id,
    seniorId: incident.seniorId,
    metadata: {
      reference: incident.reference,
      status: input.status,
      severityConfirmed: Boolean(input.severity),
      familyNotified: notifyFamilyNow,
    },
  });

  return ok({ ok: true });
});
