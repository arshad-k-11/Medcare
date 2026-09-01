import { prisma } from '@/lib/db';
import {
  ApiError,
  created,
  enforceRateLimit,
  handler,
  parseBody,
  requireCapability,
  type RouteContext,
} from '@/lib/api';
import { leadActivitySchema } from '@/lib/validation/business';
import { audit } from '@/lib/audit';

/**
 * POST /api/leads/:id/activities
 *
 * Logs a call, a WhatsApp exchange, an email or a note against an enquiry.
 *
 * Logging a first contact also advances a NEW lead to CONTACTED, so the pipeline reflects
 * what actually happened rather than waiting for someone to remember to move the status.
 */
export const POST = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('lead:write');
  await enforceRateLimit('write', user.id, request);
  const { id } = await params;
  const input = await parseBody(request, leadActivitySchema);

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, status: true, reference: true },
  });
  if (!lead) throw new ApiError('NOT_FOUND', 'That enquiry could not be found.');

  const advancesToContacted =
    lead.status === 'NEW' && ['CALL', 'WHATSAPP', 'EMAIL', 'SMS'].includes(input.type);

  const activity = await prisma.$transaction(async (tx) => {
    const row = await tx.leadActivity.create({
      data: {
        leadId: id,
        type: input.type,
        summary: input.summary,
        outcome: input.outcome ?? null,
        fromStatus: advancesToContacted ? lead.status : null,
        toStatus: advancesToContacted ? 'CONTACTED' : null,
        actorUserId: user.id,
      },
    });

    if (advancesToContacted) {
      await tx.lead.update({ where: { id }, data: { status: 'CONTACTED' } });
    }

    return row;
  });

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'lead.activity.logged',
    entity: 'LeadActivity',
    entityId: activity.id,
    metadata: { leadReference: lead.reference, type: input.type, advanced: advancesToContacted },
  });

  return created({ id: activity.id, advancedToContacted: advancesToContacted });
});
