import { prisma } from '@/lib/db';
import { ApiError, enforceRateLimit, handler, ok, parseBody } from '@/lib/api';
import { resetPasswordSchema } from '@/lib/validation/auth';
import { hashPassword, hashToken } from '@/lib/crypto';
import { audit } from '@/lib/audit';

/**
 * POST /api/auth/reset-password
 *
 * Sets a new password and — importantly — revokes every existing session for that user. If
 * the reset happened because the account was compromised, leaving the attacker's session
 * alive would defeat the entire exercise.
 */
export const POST = handler(async (request) => {
  const input = await parseBody(request, resetPasswordSchema);
  await enforceRateLimit('auth', null, request);

  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashToken(input.token) },
    select: { id: true, userId: true, expiresAt: true, consumedAt: true },
  });

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    throw new ApiError(
      'UNAUTHENTICATED',
      'That reset link is not valid or has expired. Please request a new one.',
    );
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.passwordReset.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        status: 'ACTIVE',
        failedLogins: 0,
        lockedUntil: null,
      },
    }),
    // Revoke every live session for this user.
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'PASSWORD_RESET' },
    }),
  ]);

  await audit({
    actorUserId: record.userId,
    action: 'auth.password-reset.completed',
    entity: 'User',
    entityId: record.userId,
    metadata: { sessionsRevoked: true },
  });

  return ok({
    ok: true,
    message: 'Your password has been changed and you have been signed out everywhere else.',
  });
});
