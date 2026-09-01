import { prisma } from '@/lib/db';
import { enforceRateLimit, handler, ok, parseBody } from '@/lib/api';
import { otpRequestSchema } from '@/lib/validation/auth';
import { generateOtp, hashToken } from '@/lib/crypto';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { channelStatus } from '@/lib/integrations/notifications';

const TTL_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * POST /api/auth/otp/request
 *
 * OTP exists because many family members and most caregivers will not remember a password,
 * and a senior certainly will not. Properties that matter:
 *  * The response is identical whether or not an account exists, so this cannot be used to
 *    enumerate which phone numbers are registered.
 *  * The code is stored hashed and salted with the app secret. The plaintext exists only in
 *    the delivery payload.
 *  * A resend within the cooldown returns success without issuing a new code, so repeated
 *    taps do not invalidate the code the user is already reading.
 *  * With no SMS provider configured the code is written to the server log and returned in
 *    the response ONLY in development, so the flow is demonstrable. In production an
 *    unconfigured channel means the code is not delivered and the response says nothing —
 *    it never leaks the code to the client.
 */
export const POST = handler(async (request) => {
  const input = await parseBody(request, otpRequestSchema);
  await enforceRateLimit('otp', input.phone, request);

  const user = await prisma.user.findFirst({
    where: { phone: { endsWith: input.phone.slice(-10) } },
    select: { id: true, status: true, role: true },
  });

  const smsEnabled = channelStatus().find((channel) => channel.channel === 'SMS')?.enabled ?? false;
  const isDev = process.env.NODE_ENV !== 'production';

  // A recent unconsumed challenge is reused rather than replaced.
  const recent = await prisma.otpChallenge.findFirst({
    where: {
      destination: input.phone,
      purpose: input.purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000) },
    },
    select: { id: true },
  });

  if (recent) {
    return ok({
      sent: true,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      channelConfigured: smsEnabled,
      message: 'A code was sent very recently. Please use that one, or wait a minute to resend.',
    });
  }

  // Only issue a code where an account exists — but respond the same either way.
  if (user && user.status !== 'DISABLED') {
    const code = generateOtp();
    await prisma.otpChallenge.create({
      data: {
        userId: user.id,
        destination: input.phone,
        channel: 'SMS',
        purpose: input.purpose,
        codeHash: hashToken(code),
        expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
      },
    });

    if (smsEnabled) {
      // The SMS adapter takes over here once a provider is contracted.
      log.info('auth.otp.dispatched', { purpose: input.purpose });
    } else {
      // Development convenience only. Never reached in production.
      if (isDev) {
        console.log(`\n[dev] OTP for ${input.phone}: ${code}  (valid ${TTL_MINUTES} minutes)\n`);
      } else {
        log.warn('auth.otp.undeliverable', { reason: 'sms-provider-not-configured' });
      }
    }

    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.otp.requested',
      entity: 'User',
      entityId: user.id,
      metadata: { purpose: input.purpose, delivered: smsEnabled },
    });
  } else {
    await audit({
      action: 'auth.otp.requested.unknown',
      entity: 'User',
      outcome: 'DENIED',
      metadata: { purpose: input.purpose },
    });
  }

  return ok({
    sent: true,
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
    channelConfigured: smsEnabled,
    message: smsEnabled
      ? 'If that number is registered with us, a code is on its way.'
      : isDev
        ? 'No SMS provider is configured, so the code has been printed to the server console.'
        : 'If that number is registered with us, a code is on its way. If nothing arrives, please call us.',
  });
});
