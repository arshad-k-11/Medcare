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
import { createCareNoteSchema } from '@/lib/validation/care';
import { paginationQuery } from '@/lib/validation/common';
import { canAccessSenior, seniorIdWhere } from '@/lib/scope';
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { CARE_NOTE_TYPE_LABELS, label } from '@/lib/constants';

const listQuery = paginationQuery.extend({
  seniorId: z.string().optional(),
  type: z.string().optional(),
  requiresReview: z.enum(['true', 'false']).optional(),
});

export const GET = handler(async (request) => {
  const user = await requireCapability('care-note:read');
  const query = parseQuery(request, listQuery);
  const { page, pageSize, skip, take } = pagination(query);

  const scope = await seniorIdWhere(user);
  const where = {
    ...scope,
    ...(query.seniorId ? { seniorId: query.seniorId } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.requiresReview === 'true' ? { requiresReview: true, reviewedAt: null } : {}),
    // A family only ever sees family-visible notes, whatever they ask for.
    ...(user.role === 'FAMILY' ? { visibleToFamily: true } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.careNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        author: { select: { name: true } },
        senior: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.careNote.count({ where }),
  ]);

  return ok(paginated(data, total, page, pageSize));
});

/**
 * POST /api/care-notes
 *
 * A caregiver's daily note is the raw material for everything a nurse and a family later
 * see, so it is deliberately easy to write and hard to lose. Notes flagged as needing
 * review, and concern-type notes, are pushed to the supervising nurse rather than waiting
 * to be noticed.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('care-note:write');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, createCareNoteSchema);

  if (!(await canAccessSenior(user, input.seniorId))) {
    throw new ApiError('FORBIDDEN', 'You do not have access to that patient.');
  }

  // A concern always needs a nurse, whatever the client asked for.
  const requiresReview =
    input.requiresReview || ['CONCERN', 'REFUSAL', 'MISSED_TASK'].includes(input.type);

  const note = await prisma.careNote.create({
    data: {
      seniorId: input.seniorId,
      visitId: input.visitId ?? null,
      authorUserId: user.id,
      authorRole: user.role,
      type: input.type,
      body: input.body,
      visibleToFamily: input.visibleToFamily,
      requiresReview,
    },
  });

  if (requiresReview) {
    const senior = await prisma.senior.findUnique({
      where: { id: input.seniorId },
      select: {
        firstName: true,
        lastName: true,
        supervisingNurse: { select: { userId: true } },
      },
    });
    if (senior?.supervisingNurse?.userId) {
      await notify({
        userId: senior.supervisingNurse.userId,
        type: 'REVIEW_REQUIRED',
        title: `${label(CARE_NOTE_TYPE_LABELS, input.type)} needs your review`,
        body: `${user.name} recorded a note for ${senior.firstName} ${senior.lastName} that needs a nurse to look at it.`,
        severity: 'WARNING',
        href: '/app/nurse/reviews',
        seniorId: input.seniorId,
      }).catch((error) => log.warn('care-note.notify.failed', { error: String(error) }));
    }
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'care-note.created',
    entity: 'CareNote',
    entityId: note.id,
    seniorId: input.seniorId,
    // The note body is health information and is never copied into the audit metadata.
    metadata: { type: input.type, requiresReview, visibleToFamily: input.visibleToFamily },
  });

  return created({ id: note.id, requiresReview });
});
