import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui';
import { MarkAllRead } from '@/components/app-shell/mark-all-read';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { formatDateTime, relativeTime } from '@/lib/format';
import { CHANNEL_LABELS, NOTIFICATION_TYPE_LABELS, label } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

/**
 * The user's own notifications.
 *
 * Notifications that were queued but not delivered (because a channel is not configured)
 * are shown with that reason, rather than looking as though they were sent. Ops needs to
 * know the SMS did not go out.
 */
export default async function NotificationsPage() {
  const user = await requirePageUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const unread = notifications.filter(
    (notification) => !notification.readAt && notification.channel === 'IN_APP',
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description={unread.length ? `${unread.length} unread` : 'Everything is read'}
        action={unread.length ? <MarkAllRead /> : undefined}
      />

      <Card>
        {notifications.length ? (
          <ul className="divide-y divide-[color:var(--border)]">
            {notifications.map((notification) => {
              const isUnread = !notification.readAt && notification.channel === 'IN_APP';
              return (
                <li
                  key={notification.id}
                  className={`px-5 py-4 ${isUnread ? 'bg-brand-50/40' : ''}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink-900">{notification.title}</p>
                        {isUnread ? <Badge tone="brand">New</Badge> : null}
                        {notification.severity === 'CRITICAL' ? (
                          <Badge tone="danger">Urgent</Badge>
                        ) : notification.severity === 'WARNING' ? (
                          <Badge tone="warning">Attention</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-700">
                        {notification.body}
                      </p>
                      <p className="mt-1.5 text-xs text-ink-500">
                        {label(NOTIFICATION_TYPE_LABELS, notification.type)} ·{' '}
                        {relativeTime(notification.createdAt)} ·{' '}
                        {formatDateTime(notification.createdAt)}
                      </p>

                      {/* Honest about what was actually delivered. */}
                      {notification.channel !== 'IN_APP' ? (
                        <p className="mt-1 text-xs">
                          <span className="text-ink-500">
                            {label(CHANNEL_LABELS, notification.channel)}:{' '}
                          </span>
                          {notification.deliveryStatus === 'SENT' ? (
                            <span className="text-success">delivered</span>
                          ) : (
                            <span className="text-warning">
                              not delivered
                              {notification.deliveryNote ? ` — ${notification.deliveryNote}` : ''}
                            </span>
                          )}
                        </p>
                      ) : null}

                      {notification.href ? (
                        <Link
                          href={notification.href}
                          className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline"
                        >
                          Open →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="No notifications yet"
            description="Visit updates, reminders and anything needing your attention appear here."
          />
        )}
      </Card>
    </div>
  );
}
