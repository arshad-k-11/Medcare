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
import { createVitalSchema } from '@/lib/validation/care';
import { paginationQuery } from '@/lib/validation/common';
import { canAccessSenior, seniorIdWhere } from '@/lib/scope';
import { flagVital } from '@/lib/services/vitals';
import { resolveEscalation } from '@/lib/services/escalation';
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { formatVital } from '@/lib/format';
import { VITAL_META, VITAL_TYPES, type VitalType } from '@/lib/constants';

const listQuery = paginationQuery.extend({
  seniorId: z.string().optional(),
  type: z.enum(VITAL_TYPES).optional(),
  flag: z.enum(['NORMAL', 'REQUIRES_REVIEW']).optional(),
  unreviewed: z.enum(['true', 'false']).optional(),
});

export const GET = handler(async (request) => {
  const user = await requireCapability('vital:read');
  const query = parseQuery(request, listQuery);
  const { page, pageSize, skip, take } = pagination(query);

  const scope = await seniorIdWhere(user);
  const where = {
    ...scope,
    ...(query.seniorId ? { seniorId: query.seniorId } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.flag ? { flag: query.flag } : {}),
    ...(query.unreviewed === 'true' ? { reviewedAt: null } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.vital.findMany({
      where,
      orderBy: { measuredAt: 'desc' },
      skip,
      take,
      include: {
        senior: { select: { id: true, firstName: true, lastName: true } },
        recordedBy: { select: { name: true } },
      },
    }),
    prisma.vital.count({ where }),
  ]);

  return ok(paginated(data, total, page, pageSize));
});

/**
 * POST /api/vitals
 *
 * Records a reading and flags it against the configured range. This is the single most
 * safety-sensitive write in the product, so:
 *  * the value is stored exactly as measured, never rounded or "corrected";
 *  * the flag is NORMAL or REQUIRES_REVIEW and nothing else — there is no code path that
 *    produces a clinical conclusion;
 *  * a per-senior threshold overrides the global one, because "normal" for an 81-year-old
 *    with hypertension is not the textbook range;
 *  * a breach routes to a nurse through the configured escalation rule, and the family is
 *    told only if that rule says so. A family should not receive an alarming number with no
 *    professional attached to it.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('vital:write');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, createVitalSchema);

  if (!(await canAccessSenior(user, input.seniorId))) {
    throw new ApiError('FORBIDDEN', 'You do not have access to that patient.');
  }

  const [thresholds, senior, rules] = await Promise.all([
    prisma.vitalThreshold.findMany({
      where: { isActive: true, OR: [{ seniorId: input.seniorId }, { seniorId: null }] },
    }),
    prisma.senior.findUnique({
      where: { id: input.seniorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        supervisingNurse: { select: { userId: true } },
      },
    }),
    prisma.escalationRule.findMany({ where: { isActive: true } }),
  ]);

  if (!senior) throw new ApiError('NOT_FOUND', 'That patient could not be found.');

  // Per-senior thresholds win over the global default.
  const applicable = [
    ...thresholds.filter((row) => row.seniorId === input.seniorId),
    ...thresholds.filter((row) => row.seniorId === null),
  ];

  const { flag, explanation } = flagVital(
    input.type,
    input.valueNumber,
    input.valueSecondary,
    applicable,
  );

  const meta = VITAL_META[input.type as VitalType];

  const vital = await prisma.vital.create({
    data: {
      seniorId: input.seniorId,
      visitId: input.visitId ?? null,
      type: input.type,
      valueNumber: input.valueNumber,
      valueSecondary: input.valueSecondary ?? null,
      unit: meta?.unit ?? '',
      context: input.context ?? null,
      measuredAt: input.measuredAt,
      recordedByUserId: user.id,
      flag,
      note: input.note ?? null,
    },
  });

  if (flag === 'REQUIRES_REVIEW') {
    const plan = resolveEscalation('VITAL_REVIEW', rules);

    await prisma.escalation.create({
      data: {
        seniorId: input.seniorId,
        trigger: 'VITAL_REVIEW',
        level: plan.level,
        reason: explanation ?? 'Reading outside the configured review range.',
        raisedByUserId: user.id,
      },
    });

    // The nurse is told. The wording states the fact and the action, never an interpretation.
    if (senior.supervisingNurse?.userId) {
      await notify({
        userId: senior.supervisingNurse.userId,
        type: 'REVIEW_REQUIRED',
        title: 'A reading needs your review',
        body: `${formatVital(input.type, input.valueNumber, input.valueSecondary)} recorded for ${senior.firstName} ${senior.lastName}. ${explanation ?? ''} Target review time: ${plan.withinMinutes} minutes.`,
        severity: 'WARNING',
        href: '/app/nurse/reviews',
        seniorId: input.seniorId,
      }).catch((error) => log.warn('vital.notify.nurse.failed', { error: String(error) }));
    }

    // Only tell the family if the configured rule says to. Default is not to.
    if (plan.notifyFamily) {
      const links = await prisma.seniorFamilyLink.findMany({
        where: { seniorId: input.seniorId },
        select: { familyProfile: { select: { userId: true } } },
      });
      await Promise.all(
        links.map((link) =>
          notify({
            userId: link.familyProfile.userId,
            type: 'REVIEW_REQUIRED',
            title: 'A reading has been sent for nurse review',
            body: `${formatVital(input.type, input.valueNumber, input.valueSecondary)} was recorded for ${senior.firstName} and is outside the range set for them, so a nurse will review it. This is not a diagnosis and does not mean anything is wrong.`,
            href: '/app/family/updates',
            seniorId: input.seniorId,
          }),
        ),
      ).catch((error) => log.warn('vital.notify.family.failed', { error: String(error) }));
    }
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'vital.created',
    entity: 'Vital',
    entityId: vital.id,
    seniorId: input.seniorId,
    // The type and flag are recorded; the value itself is not, since it is health data.
    metadata: { type: input.type, flag },
  });

  return created({
    id: vital.id,
    flag,
    explanation,
    // The UI shows this verbatim, which is why the wording lives server-side.
    message:
      flag === 'REQUIRES_REVIEW'
        ? 'Recorded. This reading is outside the range set for this patient, so it has been sent to the nurse for review. Do not interpret it yourself — if you are worried about the person now, call your supervisor.'
        : 'Recorded.',
  });
});
