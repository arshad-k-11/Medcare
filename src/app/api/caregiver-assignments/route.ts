import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  ApiError,
  created,
  enforceRateLimit,
  handler,
  ok,
  parseBody,
  parseQuery,
  requireCapability,
} from '@/lib/api';
import { createAssignmentSchema } from '@/lib/validation/care';
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { writeList } from '@/lib/json-list';
import { formatDate } from '@/lib/format';

const listQuery = z.object({
  seniorId: z.string().optional(),
  caregiverId: z.string().optional(),
  status: z.string().optional(),
});

export const GET = handler(async (request) => {
  await requireCapability('assignment:read');
  const query = parseQuery(request, listQuery);

  const assignments = await prisma.caregiverAssignment.findMany({
    where: {
      ...(query.seniorId ? { seniorId: query.seniorId } : {}),
      ...(query.caregiverId ? { caregiverId: query.caregiverId } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    include: {
      senior: { select: { id: true, firstName: true, lastName: true, area: true } },
      caregiver: {
        select: {
          id: true,
          verificationStatus: true,
          languages: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  return ok({ data: assignments });
});

/**
 * POST /api/caregiver-assignments — assign, or replace (Workflow C).
 *
 * When replacing, this does all of it in one transaction: end the old assignment with a
 * recorded reason, create the new one carrying the match score and its explanation, and
 * move every future visit across. Reassigning the visits is the part that matters — an
 * assignment change that leaves tomorrow's visit pointing at a caregiver on leave is how a
 * family gets let down while the system reports success.
 *
 * The replacement reason is required by the schema, because "operational reasons" is not an
 * answer a family should ever be given.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('assignment:write');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, createAssignmentSchema);

  const [senior, caregiver, replaced] = await Promise.all([
    prisma.senior.findUnique({
      where: { id: input.seniorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        familyLinks: { select: { familyProfile: { select: { userId: true } } } },
      },
    }),
    prisma.caregiverProfile.findUnique({
      where: { id: input.caregiverId },
      select: {
        id: true,
        userId: true,
        status: true,
        verificationStatus: true,
        user: { select: { name: true } },
      },
    }),
    input.replacedAssignmentId
      ? prisma.caregiverAssignment.findUnique({
          where: { id: input.replacedAssignmentId },
          include: { caregiver: { select: { userId: true, user: { select: { name: true } } } } },
        })
      : Promise.resolve(null),
  ]);

  if (!senior) throw new ApiError('NOT_FOUND', 'That patient could not be found.');
  if (!caregiver) throw new ApiError('NOT_FOUND', 'That caregiver could not be found.');

  if (['INACTIVE', 'UNDER_REVIEW'].includes(caregiver.status)) {
    throw new ApiError(
      'CONFLICT',
      `${caregiver.user.name} cannot be assigned while their status is ${caregiver.status.toLowerCase().replace('_', ' ')}.`,
    );
  }
  if (input.replacedAssignmentId && !replaced) {
    throw new ApiError('NOT_FOUND', 'The assignment being replaced could not be found.');
  }
  if (replaced && replaced.seniorId !== input.seniorId) {
    throw new ApiError('CONFLICT', 'That assignment belongs to a different patient.');
  }

  const startDate = input.startDate ?? new Date();

  const assignment = await prisma.$transaction(async (tx) => {
    if (replaced) {
      await tx.caregiverAssignment.update({
        where: { id: replaced.id },
        data: {
          status: 'ENDED',
          endDate: startDate,
          replacementReason: input.replacementReason ?? null,
        },
      });
    }

    const createdAssignment = await tx.caregiverAssignment.create({
      data: {
        seniorId: input.seniorId,
        caregiverId: input.caregiverId,
        role: replaced ? 'REPLACEMENT' : input.role,
        shiftPattern: input.shiftPattern,
        shiftStart: input.shiftStart ?? null,
        shiftEnd: input.shiftEnd ?? null,
        daysOfWeek: writeList(input.daysOfWeek.map(String)),
        status: 'ACTIVE',
        startDate,
        replacedAssignmentId: replaced?.id ?? null,
        replacementReason: input.replacementReason ?? null,
        matchScore: input.matchScore ?? null,
        matchExplanation: input.matchExplanation ?? null,
      },
    });

    // Move future visits onto the new caregiver, and clear the at-risk flag.
    if (replaced) {
      await tx.visit.updateMany({
        where: {
          assignmentId: replaced.id,
          scheduledStart: { gte: startDate },
          status: 'SCHEDULED',
        },
        data: {
          assignmentId: createdAssignment.id,
          caregiverId: input.caregiverId,
          atRisk: false,
        },
      });
    }

    await tx.caregiverProfile.update({
      where: { id: input.caregiverId },
      data: { status: 'ASSIGNED' },
    });

    return createdAssignment;
  });

  const familyUserIds = senior.familyLinks.map((link) => link.familyProfile.userId);

  // The family is told who is coming and, when it is a replacement, why.
  await Promise.all(
    familyUserIds.map((familyUserId) =>
      notify({
        userId: familyUserId,
        type: 'CAREGIVER_ASSIGNED',
        title: replaced ? 'Your caregiver is changing' : 'A caregiver has been assigned',
        body: replaced
          ? `${replaced.caregiver.user.name} is unavailable, so ${caregiver.user.name} will attend ${senior.firstName} from ${formatDate(startDate)}. Reason recorded: ${input.replacementReason}. We have told ${senior.firstName} as well, so nobody unfamiliar arrives unannounced.`
          : `${caregiver.user.name} has been assigned to ${senior.firstName} as the ${(replaced ? 'replacement' : input.role).toLowerCase()} caregiver, starting ${formatDate(startDate)}.`,
        href: '/app/family',
        seniorId: senior.id,
        channels: replaced ? ['WHATSAPP'] : [],
        templateKey: replaced ? 'caregiver.replacement' : 'caregiver.assigned',
      }),
    ),
  ).catch((error) => log.warn('assignment.notify.family.failed', { error: String(error) }));

  await notify({
    userId: caregiver.userId,
    type: 'CAREGIVER_ASSIGNED',
    title: 'You have a new patient',
    body: `${senior.firstName} ${senior.lastName}, starting ${formatDate(startDate)}. The care plan and instructions are in your app.`,
    href: '/app/caregiver/patients',
    seniorId: senior.id,
  }).catch((error) => log.warn('assignment.notify.caregiver.failed', { error: String(error) }));

  if (replaced) {
    await notify({
      userId: replaced.caregiver.userId,
      type: 'CAREGIVER_ASSIGNED',
      title: 'A patient has been reassigned',
      body: `${senior.firstName} ${senior.lastName} has been reassigned to ${caregiver.user.name} from ${formatDate(startDate)}. Your upcoming visits for this patient have been moved.`,
      href: '/app/caregiver',
    }).catch((error) => log.warn('assignment.notify.outgoing.failed', { error: String(error) }));
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: replaced ? 'assignment.replaced' : 'assignment.created',
    entity: 'CaregiverAssignment',
    entityId: assignment.id,
    seniorId: senior.id,
    metadata: {
      caregiverId: input.caregiverId,
      replacedAssignmentId: replaced?.id ?? null,
      reason: input.replacementReason ?? null,
      matchScore: input.matchScore ?? null,
      verificationStatus: caregiver.verificationStatus,
    },
  });

  return created({
    id: assignment.id,
    replacedAssignmentId: replaced?.id ?? null,
    message: replaced
      ? 'Replacement assigned. Future visits have been moved and the family has been told who is coming and why.'
      : 'Caregiver assigned and the family has been told.',
  });
});
