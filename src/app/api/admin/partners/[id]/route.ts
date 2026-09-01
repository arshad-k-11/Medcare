import { z } from 'zod';
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
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';

const schema = z
  .object({
    agreementStatus: z.enum(['PENDING', 'ACTIVE', 'PAUSED']),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

/**
 * PATCH /api/admin/partners/:id — approve, pause or re-pend a partner.
 *
 * Approving is the only path by which a partner account becomes usable: the public
 * application route can only ever create a PENDING one. That separation is the whole point
 * — a self-service signup must not be able to grant itself access to patient-adjacent
 * information.
 *
 * Activating also lifts the user out of INVITED so they can actually sign in.
 */
export const PATCH = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('config:write');
  await enforceRateLimit('write', user.id, request);
  const { id } = await params;
  const input = await parseBody(request, schema);

  const partner = await prisma.partnerProfile.findUnique({
    where: { id },
    include: { user: { select: { id: true, status: true, email: true } } },
  });
  if (!partner) throw new ApiError('NOT_FOUND', 'That partner could not be found.');

  const activating = input.agreementStatus === 'ACTIVE';

  await prisma.$transaction(async (tx) => {
    await tx.partnerProfile.update({
      where: { id },
      data: {
        agreementStatus: input.agreementStatus,
        ...(input.note ? { notes: input.note } : {}),
      },
    });

    if (activating && partner.user.status === 'INVITED') {
      await tx.user.update({ where: { id: partner.user.id }, data: { status: 'ACTIVE' } });
    }
    if (input.agreementStatus === 'PAUSED') {
      await tx.user.update({ where: { id: partner.user.id }, data: { status: 'SUSPENDED' } });
      // Revoke live sessions, so a paused partner is out immediately rather than at expiry.
      await tx.session.updateMany({
        where: { userId: partner.user.id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'PARTNER_PAUSED' },
      });
    }
  });

  if (activating) {
    await notify({
      userId: partner.user.id,
      type: 'SYSTEM',
      title: 'Your partner account is active',
      body: 'You can now submit referrals and track their status. Sign in with the email address you registered — use "forgot password" to set a password the first time.',
      href: '/app/partner',
      channels: ['EMAIL'],
    }).catch((error) => log.warn('partner.activate.notify.failed', { error: String(error) }));
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: activating ? 'partner.activated' : 'partner.status-changed',
    entity: 'PartnerProfile',
    entityId: id,
    metadata: { agreementStatus: input.agreementStatus },
  });

  return ok({ ok: true });
});
