import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  ApiError,
  enforceRateLimit,
  handler,
  ok,
  parseBody,
  requireCapability,
} from '@/lib/api';
import { canAccessSenior } from '@/lib/scope';
import { audit } from '@/lib/audit';
import { formatVital } from '@/lib/format';

const schema = z
  .object({
    kind: z.enum(['note', 'vital']),
    id: z.string().min(1),
    note: z.string().trim().max(4000).optional(),
  })
  .strict();

/**
 * POST /api/reviews — a nurse signs off a flagged note or reading.
 *
 * The review is what turns "the platform noticed something" into "a professional looked at
 * it", so it is a first-class recorded action rather than a status flip. Where the nurse
 * adds a note, that note enters the care record and the family timeline — which is the
 * whole point: the family sees that a qualified person reviewed it and what they said.
 *
 * Any open escalation for the same patient and trigger is closed at the same time, so the
 * escalation queue reflects reality instead of accumulating handled items.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('care-note:review');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, schema);

  if (input.kind === 'vital') {
    const vital = await prisma.vital.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        seniorId: true,
        type: true,
        valueNumber: true,
        valueSecondary: true,
        reviewedAt: true,
      },
    });
    if (!vital || !(await canAccessSenior(user, vital.seniorId))) {
      throw new ApiError('NOT_FOUND', 'That reading could not be found.');
    }
    if (vital.reviewedAt) throw new ApiError('CONFLICT', 'That reading has already been reviewed.');

    await prisma.$transaction(async (tx) => {
      await tx.vital.update({
        where: { id: vital.id },
        data: { reviewedAt: new Date(), reviewedBy: user.name },
      });

      if (input.note) {
        await tx.careNote.create({
          data: {
            seniorId: vital.seniorId,
            authorUserId: user.id,
            authorRole: user.role,
            type: 'NURSE_REVIEW',
            body: `Reviewed ${formatVital(vital.type, vital.valueNumber, vital.valueSecondary)}. ${input.note}`,
            visibleToFamily: true,
            requiresReview: false,
            reviewedAt: new Date(),
            reviewedBy: user.name,
          },
        });
      }

      await tx.escalation.updateMany({
        where: { seniorId: vital.seniorId, trigger: 'VITAL_REVIEW', closedAt: null },
        data: {
          closedAt: new Date(),
          acknowledgedAt: new Date(),
          acknowledgedBy: user.name,
          closureNote: input.note ?? 'Reviewed by the nurse supervisor.',
        },
      });
    });

    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'vital.reviewed',
      entity: 'Vital',
      entityId: vital.id,
      seniorId: vital.seniorId,
      metadata: { type: vital.type, noteAdded: Boolean(input.note) },
    });

    return ok({ ok: true });
  }

  const note = await prisma.careNote.findUnique({
    where: { id: input.id },
    select: { id: true, seniorId: true, type: true, reviewedAt: true },
  });
  if (!note || !(await canAccessSenior(user, note.seniorId))) {
    throw new ApiError('NOT_FOUND', 'That note could not be found.');
  }
  if (note.reviewedAt) throw new ApiError('CONFLICT', 'That note has already been reviewed.');

  await prisma.$transaction(async (tx) => {
    await tx.careNote.update({
      where: { id: note.id },
      data: { reviewedAt: new Date(), reviewedBy: user.name },
    });

    if (input.note) {
      await tx.careNote.create({
        data: {
          seniorId: note.seniorId,
          authorUserId: user.id,
          authorRole: user.role,
          type: 'NURSE_REVIEW',
          body: input.note,
          visibleToFamily: true,
          reviewedAt: new Date(),
          reviewedBy: user.name,
        },
      });
    }
  });

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'care-note.reviewed',
    entity: 'CareNote',
    entityId: note.id,
    seniorId: note.seniorId,
    metadata: { type: note.type, noteAdded: Boolean(input.note) },
  });

  return ok({ ok: true });
});
