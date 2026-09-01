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
import { createThreadSchema, postMessageSchema } from '@/lib/validation/business';
import { canAccessSenior } from '@/lib/scope';
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { truncate } from '@/lib/utils';

const listQuery = z.object({
  threadId: z.string().optional(),
  seniorId: z.string().optional(),
});

/**
 * GET /api/messages
 *
 * Threads the caller participates in. Participation is the authorisation — there is no way
 * to read a thread you are not a member of, and no admin override that bypasses the
 * membership check silently.
 */
export const GET = handler(async (request) => {
  const user = await requireCapability('message:participate');
  const query = parseQuery(request, listQuery);

  if (query.threadId) {
    const thread = await prisma.messageThread.findFirst({
      where: { id: query.threadId, participants: { some: { userId: user.id } } },
      include: {
        senior: { select: { id: true, firstName: true, lastName: true } },
        participants: { include: { user: { select: { id: true, name: true, role: true } } } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, name: true, role: true } } },
        },
      },
    });
    if (!thread) throw new ApiError('NOT_FOUND', 'That conversation could not be found.');

    await prisma.messageParticipant.updateMany({
      where: { threadId: thread.id, userId: user.id },
      data: { lastReadAt: new Date() },
    });

    return ok({ thread });
  }

  const threads = await prisma.messageThread.findMany({
    where: {
      participants: { some: { userId: user.id } },
      ...(query.seniorId ? { seniorId: query.seniorId } : {}),
    },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      senior: { select: { id: true, firstName: true, lastName: true } },
      participants: { include: { user: { select: { id: true, name: true, role: true } } } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { name: true } } },
      },
    },
  });

  return ok({ data: threads });
});

/**
 * POST /api/messages
 *
 * Starts a thread, or posts into one. A new thread automatically includes the patient's
 * care team, so a family message reaches somebody who can act on it rather than sitting
 * unassigned.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('message:participate');
  await enforceRateLimit('write', user.id, request);

  const raw = await request.clone().json().catch(() => ({}));

  // Posting into an existing thread.
  if (raw && typeof raw === 'object' && 'threadId' in raw) {
    const input = await parseBody(request, postMessageSchema);

    const thread = await prisma.messageThread.findFirst({
      where: { id: input.threadId, participants: { some: { userId: user.id } } },
      include: {
        participants: { select: { userId: true } },
        senior: { select: { id: true, firstName: true } },
      },
    });
    if (!thread) throw new ApiError('NOT_FOUND', 'That conversation could not be found.');

    const message = await prisma.message.create({
      data: { threadId: thread.id, senderUserId: user.id, body: input.body },
    });

    await prisma.messageThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date(), status: 'OPEN' },
    });

    await Promise.all(
      thread.participants
        .filter((participant) => participant.userId !== user.id)
        .map((participant) =>
          notify({
            userId: participant.userId,
            type: 'SYSTEM',
            title: `New message from ${user.name}`,
            body: truncate(input.body, 160),
            href: `/app/family/messages?thread=${thread.id}`,
            seniorId: thread.seniorId,
          }),
        ),
    ).catch((error) => log.warn('message.notify.failed', { error: String(error) }));

    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'message.sent',
      entity: 'Message',
      entityId: message.id,
      seniorId: thread.seniorId,
    });

    return created({ id: message.id, threadId: thread.id });
  }

  // Starting a new thread.
  const input = await parseBody(request, createThreadSchema);

  if (input.seniorId && !(await canAccessSenior(user, input.seniorId))) {
    throw new ApiError('FORBIDDEN', 'You do not have access to that patient.');
  }

  // Pull in the care team so the message reaches someone who can act.
  const participantIds = new Set<string>([user.id, ...input.participantUserIds]);
  if (input.seniorId) {
    const senior = await prisma.senior.findUnique({
      where: { id: input.seniorId },
      select: {
        supervisingNurse: { select: { userId: true } },
        familyLinks: { select: { familyProfile: { select: { userId: true } } } },
      },
    });
    if (senior?.supervisingNurse?.userId) participantIds.add(senior.supervisingNurse.userId);
    // A family starting a thread should not silently add other family members to it.
    if (user.role !== 'FAMILY') {
      for (const link of senior?.familyLinks ?? []) {
        participantIds.add(link.familyProfile.userId);
      }
    }
  }

  // Always include operations, so nothing lands in an unwatched thread.
  const opsUsers = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'OPS_MANAGER'] }, status: 'ACTIVE' },
    select: { id: true },
    take: 2,
  });
  for (const opsUser of opsUsers) participantIds.add(opsUser.id);

  const thread = await prisma.messageThread.create({
    data: {
      subject: input.subject,
      seniorId: input.seniorId ?? null,
      category: input.category,
      lastMessageAt: new Date(),
      participants: {
        create: [...participantIds].map((userId) => ({
          userId,
          lastReadAt: userId === user.id ? new Date() : null,
        })),
      },
      messages: { create: { senderUserId: user.id, body: input.body } },
    },
  });

  await Promise.all(
    [...participantIds]
      .filter((participantId) => participantId !== user.id)
      .map((participantId) =>
        notify({
          userId: participantId,
          type: 'SYSTEM',
          title: `New conversation: ${input.subject}`,
          body: truncate(input.body, 160),
          href: `/app/family/messages?thread=${thread.id}`,
          seniorId: input.seniorId ?? null,
        }),
      ),
  ).catch((error) => log.warn('thread.notify.failed', { error: String(error) }));

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'message-thread.created',
    entity: 'MessageThread',
    entityId: thread.id,
    seniorId: input.seniorId ?? null,
    metadata: { category: input.category, participants: participantIds.size },
  });

  return created({ threadId: thread.id });
});
