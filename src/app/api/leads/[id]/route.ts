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
import { updateLeadSchema } from '@/lib/validation/business';
import { audit } from '@/lib/audit';
import { notify } from '@/lib/integrations/notifications';
import { log } from '@/lib/log';
import { LEAD_STATUS_LABELS, label } from '@/lib/constants';

/** GET /api/leads/:id — the full record with its activity history. */
export const GET = handler<RouteContext<{ id: string }>>(async (_request, { params }) => {
  await requireCapability('lead:read');
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      source: { select: { key: true, label: true } },
      recommendedPackage: { select: { id: true, name: true, slug: true } },
      senior: { select: { id: true, firstName: true, lastName: true, status: true } },
      familyProfile: { include: { user: { select: { name: true, email: true, phone: true } } } },
      partner: { select: { id: true, organisationName: true, partnerType: true } },
      activities: {
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true } } },
      },
      assessments: { orderBy: { createdAt: 'desc' } },
      crmTasks: { orderBy: { dueAt: 'asc' }, include: { assignee: { select: { name: true } } } },
      referral: { select: { reference: true, status: true } },
      intake: { select: { answers: true, submittedAt: true } },
    },
  });

  if (!lead) throw new ApiError('NOT_FOUND', 'That enquiry could not be found.');
  return ok({ lead });
});

/**
 * PATCH /api/leads/:id
 *
 * Every status change writes a LeadActivity row recording who moved it and from what. The
 * pipeline report is only trustworthy if the transitions are recorded rather than inferred
 * from the current state.
 *
 * Marking a lead LOST requires a reason (enforced by the schema) — the lost-reason field is
 * how the business learns which areas to open next.
 */
export const PATCH = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('lead:write');
  await enforceRateLimit('write', user.id, request);
  const { id } = await params;
  const input = await parseBody(request, updateLeadSchema);

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      reference: true,
      contactName: true,
      seniorId: true,
      ownerUserId: true,
    },
  });
  if (!lead) throw new ApiError('NOT_FOUND', 'That enquiry could not be found.');

  const statusChanged = Boolean(input.status && input.status !== lead.status);

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.ownerUserId !== undefined ? { ownerUserId: input.ownerUserId } : {}),
        ...(input.urgency ? { urgency: input.urgency } : {}),
        ...(input.budgetBand ? { budgetBand: input.budgetBand } : {}),
        ...(input.area !== undefined ? { area: input.area ?? null } : {}),
        ...(input.followUpAt !== undefined ? { followUpAt: input.followUpAt ?? null } : {}),
        ...(input.recommendedPackageId !== undefined
          ? { recommendedPackageId: input.recommendedPackageId }
          : {}),
        ...(input.lostReason !== undefined ? { lostReason: input.lostReason ?? null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
        ...(input.status === 'WON' ? { wonAt: new Date() } : {}),
      },
    });

    if (statusChanged) {
      await tx.leadActivity.create({
        data: {
          leadId: id,
          type: 'STATUS_CHANGE',
          summary: `Moved from ${label(LEAD_STATUS_LABELS, lead.status)} to ${label(LEAD_STATUS_LABELS, input.status!)}.`,
          outcome: input.lostReason ?? null,
          fromStatus: lead.status,
          toStatus: input.status,
          actorUserId: user.id,
        },
      });
    }

    // Winning a lead moves the patient out of prospect: the record should reflect that
    // care is starting rather than requiring a second manual step someone will forget.
    if (input.status === 'WON' && lead.seniorId) {
      await tx.senior.updateMany({
        where: { id: lead.seniorId, status: 'PROSPECT' },
        data: { status: 'ASSESSMENT' },
      });
    }
  });

  // Tell a newly assigned owner, so an assignment is not silently invisible to them.
  if (input.ownerUserId && input.ownerUserId !== lead.ownerUserId) {
    await notify({
      userId: input.ownerUserId,
      type: 'LEAD_NEW',
      title: 'An enquiry has been assigned to you',
      body: `${lead.contactName} (${lead.reference}) is now yours to follow up.`,
      href: `/app/admin/leads/${id}`,
    }).catch((error) => log.warn('lead.assign.notify.failed', { error: String(error) }));
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: statusChanged ? 'lead.status-changed' : 'lead.updated',
    entity: 'Lead',
    entityId: id,
    seniorId: lead.seniorId,
    metadata: {
      reference: lead.reference,
      from: statusChanged ? lead.status : undefined,
      to: input.status,
      fields: Object.keys(input),
    },
  });

  return ok({ ok: true });
});
