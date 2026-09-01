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
import { feedbackSchema } from '@/lib/validation/business';
import { paginationQuery } from '@/lib/validation/common';
import { canAccessSenior } from '@/lib/scope';
import { notifyInternal } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { FEEDBACK_TYPES } from '@/lib/constants';

const listQuery = paginationQuery.extend({
  type: z.enum(FEEDBACK_TYPES).optional(),
  status: z.string().optional(),
});

/** GET /api/feedback — ops view of ratings and complaints. */
export const GET = handler(async (request) => {
  const user = await requireCapability('feedback:manage');
  const query = parseQuery(request, listQuery);
  const { page, pageSize, skip, take } = pagination(query);

  const where = {
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip,
      take,
      include: {
        author: { select: { name: true, role: true } },
        senior: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.feedback.count({ where }),
  ]);

  return ok(paginated(data, total, page, pageSize));
});

/**
 * POST /api/feedback
 *
 * Ratings, complaints and callback requests from families and seniors.
 *
 * A complaint creates an ops notification immediately rather than sitting in a queue
 * somebody checks weekly. The business measures itself on resolution time, and that only
 * works if the clock starts the moment the complaint is made.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('feedback:create');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, feedbackSchema);

  if (input.seniorId && !(await canAccessSenior(user, input.seniorId))) {
    throw new ApiError('FORBIDDEN', 'You do not have access to that patient.');
  }

  const feedback = await prisma.feedback.create({
    data: {
      seniorId: input.seniorId ?? null,
      authorUserId: user.id,
      type: input.type,
      rating: input.rating ?? null,
      subject: input.subject ?? null,
      comment: input.comment ?? null,
      relatedVisitId: input.relatedVisitId ?? null,
      status: input.type === 'RATING' ? 'CLOSED' : 'OPEN',
    },
  });

  if (input.type !== 'RATING') {
    await notifyInternal({
      type: 'SYSTEM',
      title:
        input.type === 'COMPLAINT'
          ? 'A complaint has been raised'
          : input.type === 'CALLBACK_REQUEST'
            ? 'A family has asked for a call back'
            : 'A suggestion has been submitted',
      body: `${user.name}: ${input.subject ?? input.comment ?? 'No detail provided'}`,
      severity: input.type === 'COMPLAINT' ? 'WARNING' : 'INFO',
      href: '/app/admin/feedback',
      seniorId: input.seniorId ?? null,
    }).catch((error) => log.warn('feedback.notify.failed', { error: String(error) }));
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'feedback.created',
    entity: 'Feedback',
    entityId: feedback.id,
    seniorId: input.seniorId ?? null,
    metadata: { type: input.type, rating: input.rating ?? null },
  });

  return created({
    id: feedback.id,
    message:
      input.type === 'COMPLAINT'
        ? 'Thank you for telling us. This is now recorded as a complaint with a reference, and our operations team has been notified. You will hear from us — a complaint is not something we absorb into a phone call.'
        : input.type === 'CALLBACK_REQUEST'
          ? 'We have your request and will call you back during operating hours.'
          : 'Thank you — this is recorded.',
  });
});
