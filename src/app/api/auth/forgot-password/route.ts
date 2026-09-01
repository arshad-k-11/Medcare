import { prisma } from '@/lib/db';
import { enforceRateLimit, handler, ok, parseBody } from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validation/auth';
import { hashToken, randomToken } from '@/lib/crypto';
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';

const TTL_MINUTES = 30;

/**
 * POST /api/auth/forgot-password
 *
 * Always reports success, so the endpoint cannot be used to discover which email addresses
 * have accounts. The token is random, stored hashed, single-use and short-lived, and any
 * previously issued unused token is invalidated so only the newest link works.
 */
export const POST = handler(async (request) => {
  const input = await parseBody(request, forgotPasswordSchema);
  await enforceRateLimit('auth', input.email, request);

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, role: true, status: true },
  });

  if (user && user.status !== 'DISABLED') {
    // Invalidate outstanding tokens so an older email cannot still be used.
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const token = randomToken(32);
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/reset-password?token=${token}`;

    // The email adapter reports honestly when no provider is configured; in development
    // the link is printed so the flow can be exercised end to end.
    if (process.env.NODE_ENV !== 'production' && process.env.EMAIL_ENABLED !== 'true') {
      console.log(`\n[dev] Password reset link: ${resetUrl}\n`);
    }

    await notify({
      userId: user.id,
      type: 'SYSTEM',
      title: 'Reset your Medcare password',
      body: `Use this link within ${TTL_MINUTES} minutes to set a new password: ${resetUrl}. If you did not ask for this, you can ignore it — nothing has changed.`,
      channels: ['EMAIL'],
      templateKey: 'auth.password-reset',
    }).catch((error) => log.warn('forgot-password.notify.failed', { error: String(error) }));

    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.password-reset.requested',
      entity: 'User',
      entityId: user.id,
    });
  }

  return ok({
    ok: true,
    message:
      'If that email address has an account with us, we have sent a reset link. It is valid for 30 minutes.',
  });
});
