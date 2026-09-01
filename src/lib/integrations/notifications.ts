import { prisma } from '../db';
import { log } from '../log';
import type { Channel, NotificationType } from '../constants';

/**
 * Notification delivery.
 *
 * No provider contracts exist yet, so every outbound channel is an adapter behind one
 * interface and each is gated by an env flag. With a channel disabled the notification is
 * still persisted and marked SKIPPED with the reason — the product must be demonstrable
 * end-to-end without a live SMS gateway, and ops must be able to see what *would* have
 * been sent. Swapping in MSG91/SES/WhatsApp Cloud is implementing `send` on one adapter.
 */

export type OutboundMessage = {
  to: string;
  subject?: string;
  body: string;
  templateKey?: string;
};

export type DeliveryResult = {
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  note?: string;
  providerId?: string;
};

export interface ChannelAdapter {
  readonly channel: Channel;
  isEnabled(): boolean;
  send(message: OutboundMessage): Promise<DeliveryResult>;
}

class InAppAdapter implements ChannelAdapter {
  readonly channel = 'IN_APP' as const;
  isEnabled() {
    return true;
  }
  async send(): Promise<DeliveryResult> {
    // The Notification row *is* the delivery for this channel.
    return { status: 'SENT' };
  }
}

class EmailAdapter implements ChannelAdapter {
  readonly channel = 'EMAIL' as const;
  isEnabled() {
    return process.env.EMAIL_ENABLED === 'true' && Boolean(process.env.EMAIL_API_KEY);
  }
  async send(message: OutboundMessage): Promise<DeliveryResult> {
    if (!this.isEnabled()) {
      return { status: 'SKIPPED', note: 'Email provider not configured (EMAIL_ENABLED=false).' };
    }
    // Implement against the contracted provider (SES / Postmark / Resend).
    log.info('notify.email.dispatch', { templateKey: message.templateKey });
    return { status: 'SKIPPED', note: 'Email adapter has no provider implementation yet.' };
  }
}

class SmsAdapter implements ChannelAdapter {
  readonly channel = 'SMS' as const;
  isEnabled() {
    return process.env.SMS_ENABLED === 'true' && Boolean(process.env.SMS_API_KEY);
  }
  async send(message: OutboundMessage): Promise<DeliveryResult> {
    if (!this.isEnabled()) {
      return { status: 'SKIPPED', note: 'SMS provider not configured (SMS_ENABLED=false).' };
    }
    log.info('notify.sms.dispatch', { templateKey: message.templateKey });
    return { status: 'SKIPPED', note: 'SMS adapter has no provider implementation yet.' };
  }
}

class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = 'WHATSAPP' as const;
  isEnabled() {
    return (
      process.env.WHATSAPP_ENABLED === 'true' &&
      Boolean(process.env.WHATSAPP_ACCESS_TOKEN) &&
      Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID)
    );
  }
  async send(message: OutboundMessage): Promise<DeliveryResult> {
    if (!this.isEnabled()) {
      return {
        status: 'SKIPPED',
        note: 'WhatsApp Business API not configured (WHATSAPP_ENABLED=false).',
      };
    }
    // WhatsApp requires pre-approved templates; NotificationTemplate.key maps to them.
    log.info('notify.whatsapp.dispatch', { templateKey: message.templateKey });
    return { status: 'SKIPPED', note: 'WhatsApp adapter has no provider implementation yet.' };
  }
}

const ADAPTERS: Record<Channel, ChannelAdapter> = {
  IN_APP: new InAppAdapter(),
  EMAIL: new EmailAdapter(),
  SMS: new SmsAdapter(),
  WHATSAPP: new WhatsAppAdapter(),
};

export function channelStatus(): { channel: Channel; enabled: boolean }[] {
  return (Object.keys(ADAPTERS) as Channel[]).map((channel) => ({
    channel,
    enabled: ADAPTERS[channel].isEnabled(),
  }));
}

/** Fills `{{token}}` placeholders. Missing tokens are removed rather than left visible. */
export function renderTemplate(body: string, tokens: Record<string, string | number | null>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = tokens[key];
    return value == null ? '' : String(value);
  });
}

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  seniorId?: string | null;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  /** Channels to attempt in addition to IN_APP. Filtered by the user's preferences. */
  channels?: Channel[];
  templateKey?: string;
};

/**
 * Persists an in-app notification and attempts any extra channels the user has left
 * enabled. Never throws: a notification failure must not roll back the care action that
 * triggered it.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const requested: Channel[] = ['IN_APP', ...(input.channels ?? [])];
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: input.userId, type: input.type },
    });
    const disabled = new Set(
      preferences.filter((p) => !p.enabled).map((p) => p.channel as Channel),
    );

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, phone: true },
    });

    for (const channel of dedupe(requested)) {
      if (channel !== 'IN_APP' && disabled.has(channel)) continue;

      const destination =
        channel === 'EMAIL' ? user?.email : channel === 'IN_APP' ? input.userId : user?.phone;

      let result: DeliveryResult;
      if (!destination) {
        result = { status: 'SKIPPED', note: `No ${channel.toLowerCase()} address on file.` };
      } else {
        result = await ADAPTERS[channel].send({
          to: destination,
          subject: input.title,
          body: input.body,
          templateKey: input.templateKey,
        });
      }

      await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          channel,
          severity: input.severity ?? 'INFO',
          href: input.href ?? null,
          seniorId: input.seniorId ?? null,
          sentAt: result.status === 'SENT' ? new Date() : null,
          deliveryStatus: result.status === 'SENT' ? 'SENT' : result.status,
          deliveryNote: result.note ?? null,
        },
      });
    }
  } catch (error) {
    log.error('notify.failed', { type: input.type, error: String(error) });
  }
}

/** Fan-out to every internal user who should see an operational event. */
export async function notifyInternal(
  input: Omit<NotifyInput, 'userId'> & { roles?: string[] },
): Promise<void> {
  const roles = input.roles ?? ['ADMIN', 'OPS_MANAGER'];
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, status: 'ACTIVE' },
    select: { id: true },
  });
  await Promise.all(users.map((user) => notify({ ...input, userId: user.id })));
}

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}
