import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui';
import { MessageThreadView, NewThreadForm } from '@/components/family/messages';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { resolveSelectedSenior } from '@/lib/queries/family';
import { formatDateTime, formatName, relativeTime, truncateText } from '@/lib/format-extra2';

export const metadata: Metadata = {
  title: 'Messages',
  robots: { index: false, follow: false },
};

/** Threads the family participates in. Participation is the authorisation. */
export default async function FamilyMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser(['FAMILY']);
  const params = await searchParams;
  const threadId = typeof params.thread === 'string' ? params.thread : undefined;
  const { seniors } = await resolveSelectedSenior(user, undefined);

  const threads = await prisma.messageThread.findMany({
    where: { participants: { some: { userId: user.id } } },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      senior: { select: { firstName: true, lastName: true } },
      participants: { where: { userId: user.id }, select: { lastReadAt: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { name: true } } },
      },
    },
  });

  const openThread = threadId
    ? await prisma.messageThread.findFirst({
        where: { id: threadId, participants: { some: { userId: user.id } } },
        include: {
          senior: { select: { firstName: true, lastName: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: { sender: { select: { id: true, name: true, role: true } } },
          },
        },
      })
    : null;

  if (openThread) {
    await prisma.messageParticipant.updateMany({
      where: { threadId: openThread.id, userId: user.id },
      data: { lastReadAt: new Date() },
    });
  }

  return (
    <div>
      <PageHeader
        title="Messages"
        description="Your care team, in writing. Replies come during operating hours."
      />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Conversations" />
            {threads.length ? (
              <ul className="divide-y divide-[color:var(--border)]">
                {threads.map((thread) => {
                  const latest = thread.messages[0];
                  const lastRead = thread.participants[0]?.lastReadAt;
                  const unread = latest && (!lastRead || latest.createdAt > lastRead);
                  return (
                    <li key={thread.id}>
                      <Link
                        href={`/app/family/messages?thread=${thread.id}`}
                        className={`block px-5 py-4 transition-colors hover:bg-ink-50 ${
                          thread.id === threadId ? 'bg-brand-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-ink-900">{thread.subject}</p>
                          {unread ? <Badge tone="brand">New</Badge> : null}
                        </div>
                        {thread.senior ? (
                          <p className="text-xs text-ink-500">{formatName(thread.senior)}</p>
                        ) : null}
                        {latest ? (
                          <p className="mt-1 text-sm text-ink-600">
                            {latest.sender.name}: {truncateText(latest.body, 70)}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-ink-400">
                          {relativeTime(thread.lastMessageAt)}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title="No conversations yet"
                description="Start one below and it will reach your care team."
              />
            )}
          </Card>

          <NewThreadForm
            seniors={seniors.map((senior) => ({ id: senior.id, name: formatName(senior) }))}
          />
        </div>

        <div>
          {openThread ? (
            <MessageThreadView
              threadId={openThread.id}
              subject={openThread.subject}
              seniorName={openThread.senior ? formatName(openThread.senior) : null}
              currentUserId={user.id}
              messages={openThread.messages.map((message) => ({
                id: message.id,
                body: message.body,
                createdAt: formatDateTime(message.createdAt),
                senderId: message.sender.id,
                senderName: message.sender.name,
                senderRole: message.sender.role,
              }))}
            />
          ) : (
            <Card>
              <EmptyState
                title="Choose a conversation"
                description="Or start a new one. Messages reach the nurse supervising your parent's care and the operations team."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
