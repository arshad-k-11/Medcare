import { prisma } from '@/lib/db';
import { ApiError, enforceRateLimit, handler, ok, parseBody } from '@/lib/api';
import { otpVerifySchema } from '@/lib/validation/auth';
import { constantTimeEqual, hashToken } from '@/lib/crypto';
import { createSession, setSessionCookie } from '@/lib/session';
import { audit } from '@/lib/audit';
import { ROLE_HOME, type Role } from '@/lib/constants';

/**
 * POST /api/auth/otp/verify
 *
 * Consumes a one-time code and issues a session. The comparison is constant-time against a
 * hash, attempts are counted on the challenge itself, and a successful verify marks the
 * phone verified and activates an INVITED account — which is how a family created by the
 * intake funnel gets in without ever choosing a password.
 */
export const POST = handler(async (request) => {
  const input = await parseBody(request, otpVerifySchema);
  await enforceRateLimit('otp', input.phone, request);

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      destination: input.phone,
      purpose: input.purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, role: true, status: true } },
    },
  });

  const genericFailure = new ApiError(
    'UNAUTHENTICATED',
    'That code is not valid or has expired. Please request a new one.',
  );

  if (!challenge) throw genericFailure;

  if (challenge.attempts >= challenge.maxAttempts) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    throw new ApiError(
      'RATE_LIMITED',
      'Too many incorrect attempts on that code. Please request a new one.',
      undefined,
      60,
    );
  }

  if (!constantTimeEqual(hashToken(input.code), challenge.codeHash)) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    await audit({
      actorUserId: challenge.userId,
      action: 'auth.otp.failed',
      entity: 'OtpChallenge',
      entityId: challenge.id,
      outcome: 'FAILURE',
    });
    throw genericFailure;
  }

  // Single use, marked consumed before the session is issued.
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  if (!challenge.user) throw genericFailure;
  if (challenge.user.status === 'DISABLED' || challenge.user.status === 'SUSPENDED') {
    throw new ApiError(
      'FORBIDDEN',
      'This account is not active. Please contact us and we will help.',
    );
  }

  const user = await prisma.user.update({
    where: { id: challenge.user.id },
    data: {
      phoneVerifiedAt: new Date(),
      lastLoginAt: new Date(),
      failedLogins: 0,
      lockedUntil: null,
      // An account created by the intake funnel becomes usable at this point.
      ...(challenge.user.status === 'INVITED' ? { status: 'ACTIVE' } : {}),
    },
    select: { id: true, name: true, role: true, passwordHash: true },
  });

  const token = await createSession(user.id);
  await setSessionCookie(token);

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'auth.login.otp',
    entity: 'User',
    entityId: user.id,
  });

  return ok({
    user: { id: user.id, name: user.name, role: user.role },
    // Prompts the UI to offer setting a password, without forcing it.
    hasPassword: Boolean(user.passwordHash),
    redirectTo: ROLE_HOME[user.role as Role] ?? '/app',
  });
});
