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
import { updateReferralSchema } from '@/lib/validation/business';
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { REFERRAL_STATUS_LABELS, label } from '@/lib/constants';

/**
 * PATCH /api/referrals/:id — ops moves a referral along.
 *
 * The partner is notified of each transition, because "did you ever call my patient?" is
 * the question that decides whether a referral relationship survives. A decline notifies
 * with the reason attached, which is the honest version of the same courtesy.
 */
export const PATCH = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('referral:update');
  await enforceRateLimit('write', user.id, request);
  const { id } = await params;
  const input = await parseBody(request, updateReferralSchema);

  const referral = await prisma.referral.findUnique({
    where: { id },
    include: {
      partner: { select: { id: true, userId: true, organisationName: true } },
      lead: { select: { id: true } },
    },
  });
  if (!referral) throw new ApiError('NOT_FOUND', 'That referral could not be found.');

  const statusChanged = Boolean(input.status && input.status !== referral.status);
  if (input.status === 'DECLINED' && !input.statusNote) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'Please record why this referral is being declined — the partner is told the reason.',
      { statusNote: 'Required when declining' },
    );
  }

  await prisma.referral.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.statusNote !== undefined ? { statusNote: input.statusNote ?? null } : {}),
      ...(input.seniorId ? { seniorId: input.seniorId } : {}),
      ...(input.status === 'CONTACTED' && !referral.contactedAt ? { contactedAt: new Date() } : {}),
      ...(input.status === 'CONVERTED' ? { convertedAt: new Date() } : {}),
    },
  });

  if (statusChanged && referral.partner?.userId) {
    await notify({
      userId: referral.partner.userId,
      type: 'SYSTEM',
      title: `Referral ${referral.reference} is now ${label(REFERRAL_STATUS_LABELS, input.status!).toLowerCase()}`,
      body:
        input.status === 'CONTACTED'
          ? `We have spoken to the family about ${referral.patientName}.`
          : input.status === 'ASSESSMENT'
            ? `An assessment has been arranged for ${referral.patientName}.`
            : input.status === 'CONVERTED'
              ? `${referral.patientName} is now an active patient. Thank you for the referral.`
              : input.status === 'DECLINED'
                ? `We are not able to take this referral. ${input.statusNote ?? ''}`
                : `The status of this referral has changed.`,
      href: '/app/partner/referrals',
    }).catch((error) => log.warn('referral.partner.notify.failed', { error: String(error) }));
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: statusChanged ? 'referral.status-changed' : 'referral.updated',
    entity: 'Referral',
    entityId: id,
    seniorId: input.seniorId ?? referral.seniorId,
    metadata: { reference: referral.reference, from: referral.status, to: input.status },
  });

  return ok({ ok: true });
});
