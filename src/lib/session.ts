import { cookies, headers } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';
import { hashIp } from './crypto';
import { log } from './log';
import type { Role } from './constants';

const COOKIE_NAME = 'medcare_session';
const ALG = 'HS256';

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  email: string | null;
  phone: string | null;
  textScale: string;
  highContrast: boolean;
  reduceMotion: boolean;
  /** Profile ids for the role the user holds, so route handlers avoid extra lookups. */
  familyProfileId?: string | null;
  caregiverProfileId?: string | null;
  nurseProfileId?: string | null;
  partnerProfileId?: string | null;
  seniorId?: string | null;
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Generate one with `openssl rand -base64 48`.',
    );
  }
  return new TextEncoder().encode(value);
}

function maxAgeSeconds(): number {
  const parsed = Number(process.env.SESSION_MAX_AGE ?? '28800');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 28800;
}

/**
 * Creates a Session row and returns a signed JWT carrying only its id and the user id.
 * Keeping a server-side row is what makes logout and forced revocation real: a stolen
 * cookie stops working the moment the row is revoked, without waiting for expiry.
 */
export async function createSession(userId: string): Promise<string> {
  const requestHeaders = await headers();
  const expiresAt = new Date(Date.now() + maxAgeSeconds() * 1000);

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: requestHeaders.get('user-agent')?.slice(0, 250) ?? null,
      ipHash: hashIp(clientIp(requestHeaders)),
    },
  });

  return new SignJWT({ sid: session.id, uid: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret());
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds(),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function destroyCurrentSession(reason = 'USER_LOGOUT'): Promise<void> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  await clearSessionCookie();
  if (!token) return;
  try {
    const { payload } = await jwtVerify(token, secret());
    const sid = typeof payload.sid === 'string' ? payload.sid : null;
    if (sid) {
      await prisma.session.updateMany({
        where: { id: sid, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: reason },
      });
    }
  } catch {
    // An unverifiable token has nothing to revoke.
  }
}

/**
 * Resolves the signed-in user, or null. Verifies the JWT *and* that the session row is
 * still live — a revoked row wins over a structurally valid token.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  let sid: string;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sid !== 'string') return null;
    sid = payload.sid;
  } catch {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: {
      user: {
        include: {
          familyProfile: { select: { id: true } },
          caregiverProfile: { select: { id: true } },
          nurseProfile: { select: { id: true } },
          partnerProfile: { select: { id: true } },
          seniorAccount: { select: { id: true } },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.user.status !== 'ACTIVE') return null;

  // Best-effort activity stamp; a failure here must not break the request.
  prisma.session
    .update({ where: { id: sid }, data: { lastSeenAt: new Date() } })
    .catch((error) => log.warn('session.lastSeen.failed', { sid, error: String(error) }));

  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    role: user.role as Role,
    email: user.email,
    phone: user.phone,
    textScale: user.textScale,
    highContrast: user.highContrast,
    reduceMotion: user.reduceMotion,
    familyProfileId: user.familyProfile?.id ?? null,
    caregiverProfileId: user.caregiverProfile?.id ?? null,
    nurseProfileId: user.nurseProfile?.id ?? null,
    partnerProfileId: user.partnerProfile?.id ?? null,
    seniorId: user.seniorAccount?.id ?? null,
  };
}

export function clientIp(requestHeaders: Headers): string | null {
  return (
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    requestHeaders.get('x-real-ip') ??
    null
  );
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
