import { prisma } from '@/lib/db';
import { ApiError, enforceRateLimit, handler, ok, parseBody } from '@/lib/api';
import { loginSchema } from '@/lib/validation/auth';
import { verifyPassword } from '@/lib/crypto';
import { createSession, setSessionCookie } from '@/lib/session';
import { audit } from '@/lib/audit';
import { ROLE_HOME, type Role } from '@/lib/constants';

/** After this many consecutive failures the account is locked for LOCK_MINUTES. */
const MAX_FAILED = 8;
const LOCK_MINUTES = 15;

/**
 * POST /api/auth/login
 *
 * Rules that matter here:
 *  * One generic error message for every failure mode — wrong password, unknown account,
 *    no password set, wrong identifier type. Anything more tells an attacker which
 *    email addresses exist.
 *  * `verifyPassword` runs a bcrypt comparison even when no user matched, so an unknown
 *    account costs the same wall-clock time as a wrong password.
 *  * Failures are counted and the account locks temporarily. Rate limiting alone only
 *    slows a distributed attempt; the counter is per-account.
 *  * Every attempt, success or failure, writes an audit row.
 */
export const POST = handler(async (request) => {
  const input = await parseBody(request, loginSchema);
  await enforceRateLimit('auth', input.identifier.toLowerCase(), request);

  const identifier = input.identifier.trim();
  const isEmail = identifier.includes('@');
  const phoneDigits = identifier.replace(/\D/g, '').slice(-10);

  const user = await prisma.user.findFirst({
    where: isEmail
      ? { email: identifier.toLowerCase() }
      : { phone: { endsWith: phoneDigits.length === 10 ? phoneDigits : identifier } },
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
      passwordHash: true,
      failedLogins: true,
      lockedUntil: true,
    },
  });

  const genericFailure = new ApiError(
    'UNAUTHENTICATED',
    'Those details do not match an account. Please check and try again, or sign in with a one-time code.',
  );

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.login.locked',
      entity: 'User',
      entityId: user.id,
      outcome: 'DENIED',
    });
    throw new ApiError(
      'RATE_LIMITED',
      `Too many failed attempts. Please wait ${LOCK_MINUTES} minutes, or sign in with a one-time code sent to your phone.`,
      undefined,
      LOCK_MINUTES * 60,
    );
  }

  // Runs even when `user` is null, to keep the timing constant.
  const passwordValid = await verifyPassword(input.password, user?.passwordHash ?? null);

  if (!user || !passwordValid) {
    if (user) {
      const failedLogins = user.failedLogins + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins,
          lockedUntil:
            failedLogins >= MAX_FAILED
              ? new Date(Date.now() + LOCK_MINUTES * 60_000)
              : null,
        },
      });
    }
    await audit({
      actorUserId: user?.id ?? null,
      actorRole: user?.role ?? null,
      action: 'auth.login.failed',
      entity: 'User',
      entityId: user?.id ?? null,
      outcome: 'FAILURE',
      metadata: { reason: user ? 'bad-credentials' : 'no-such-user' },
    });
    throw genericFailure;
  }

  // An INVITED account (created by the intake funnel, or a partner awaiting review) has
  // no password, so it cannot reach here. A SUSPENDED one can, and must be stopped.
  if (user.status !== 'ACTIVE') {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'auth.login.blocked',
      entity: 'User',
      entityId: user.id,
      outcome: 'DENIED',
      metadata: { status: user.status },
    });
    throw new ApiError(
      'FORBIDDEN',
      'This account is not active. Please contact us and we will help.',
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const token = await createSession(user.id);
  await setSessionCookie(token);

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'auth.login',
    entity: 'User',
    entityId: user.id,
  });

  return ok({
    user: { id: user.id, name: user.name, role: user.role },
    redirectTo: ROLE_HOME[user.role as Role] ?? '/app',
  });
});
