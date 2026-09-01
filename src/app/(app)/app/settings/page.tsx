import type { Metadata } from 'next';
import { Alert, Card, CardHeader, DescriptionList, PageHeader } from '@/components/ui';
import { NotificationPreferences } from '@/components/app-shell/notification-preferences';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';
import { channelStatus } from '@/lib/integrations/notifications';
import { CHANNELS, CHANNEL_LABELS, NOTIFICATION_TYPES, NOTIFICATION_TYPE_LABELS, ROLE_LABELS, label } from '@/lib/constants';
import { formatPhone } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

/** Which notification types matter to which role — nobody needs all ten. */
const RELEVANT_TYPES: Record<string, string[]> = {
  FAMILY: ['VISIT_UPDATE', 'APPOINTMENT_REMINDER', 'INCIDENT_ALERT', 'CARE_REPORT', 'CARE_PLAN_UPDATE', 'PAYMENT_REMINDER', 'CAREGIVER_ASSIGNED'],
  SENIOR: ['VISIT_UPDATE', 'APPOINTMENT_REMINDER'],
  CAREGIVER: ['VISIT_UPDATE', 'CAREGIVER_ASSIGNED', 'SYSTEM'],
  NURSE: ['REVIEW_REQUIRED', 'INCIDENT_ALERT', 'VISIT_UPDATE'],
  ADMIN: ['LEAD_NEW', 'INCIDENT_ALERT', 'REVIEW_REQUIRED', 'PAYMENT_REMINDER', 'SYSTEM'],
  OPS_MANAGER: ['LEAD_NEW', 'INCIDENT_ALERT', 'REVIEW_REQUIRED', 'PAYMENT_REMINDER', 'SYSTEM'],
  REFERRAL_PARTNER: ['SYSTEM'],
};

export default async function SettingsPage() {
  const user = await requirePageUser();

  const preferences = await prisma.notificationPreference.findMany({
    where: { userId: user.id },
  });

  const channels = channelStatus();
  const disabledChannels = channels.filter(
    (channel) => channel.channel !== 'IN_APP' && !channel.enabled,
  );

  const types = (RELEVANT_TYPES[user.role] ?? [...NOTIFICATION_TYPES]).filter((type) =>
    NOTIFICATION_TYPES.includes(type as never),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Your account and how we contact you." />

      <Card className="mb-6">
        <CardHeader title="Your account" />
        <div className="px-5 py-4">
          <DescriptionList
            columns={2}
            items={[
              { label: 'Name', value: user.name },
              { label: 'Role', value: ROLE_LABELS[user.role] },
              { label: 'Email', value: user.email ?? '—' },
              { label: 'Phone', value: formatPhone(user.phone) },
            ]}
          />
          <p className="mt-4 text-sm text-ink-600">
            To change your name, email or phone number, contact us — we verify changes to contact
            details rather than letting them be edited silently.
          </p>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="Display and accessibility"
          description="Also available from the icon in the top bar, on every page."
        />
        <div className="px-5 py-4 text-sm leading-relaxed text-ink-600">
          <p>
            Text size, high contrast and reduced motion are saved to your account and follow you to
            any device you sign in from. Senior and caregiver screens already start at a larger
            size with bigger buttons.
          </p>
        </div>
      </Card>

      {disabledChannels.length ? (
        <Alert tone="info" title="Some channels are not switched on yet" className="mb-6">
          <p>
            {disabledChannels.map((channel) => label(CHANNEL_LABELS, channel.channel)).join(', ')} —
            we have not completed those provider integrations. You can still set your preferences
            here, and messages are always available in the app.
          </p>
        </Alert>
      ) : null}

      <NotificationPreferences
        types={types.map((type) => ({
          type,
          label: label(NOTIFICATION_TYPE_LABELS, type),
        }))}
        channels={channels.map((channel) => ({
          channel: channel.channel,
          label: label(CHANNEL_LABELS, channel.channel),
          available: channel.enabled,
        }))}
        current={preferences.map((preference) => ({
          type: preference.type,
          channel: preference.channel,
          enabled: preference.enabled,
        }))}
      />
    </div>
  );
}
