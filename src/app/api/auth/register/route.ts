import { prisma } from '@/lib/db';
import { ApiError, created, enforceRateLimit, handler, parseBody } from '@/lib/api';
import { registerSchema } from '@/lib/validation/auth';
import { hashPassword } from '@/lib/crypto';
import { createSession, setSessionCookie } from '@/lib/session';
import { audit } from '@/lib/audit';
import { ROLE_HOME } from '@/lib/constants';

/**
 * POST /api/auth/register
 *
 * Self-registration creates a FAMILY account and nothing else. Staff, nurse, caregiver and
 * referral-partner accounts are created by an administrator or through the reviewed
 * partner-application route — there is no code path by which a public request can obtain a
 * privileged role, which is the single most important property of this endpoint.
 *
 * A family who already has an INVITED account from the intake funnel is upgraded in place:
 * they set a password and keep the seniors already linked to them.
 */
export const POST = handler(async (request) => {
  const input = await parseBody(request, registerSchema);
  await enforceRateLimit('auth', input.email, request);

  const normalisedPhone = input.phone.replace(/\s/g, '');

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: normalisedPhone }] },
    select: { id: true, status: true, role: true, passwordHash: true },
  });

  const passwordHash = await hashPassword(input.password);
  const isNri = input.country.trim().toLowerCase() !== 'india';

  let userId: string;
  let role: string;

  if (existing && existing.status === 'INVITED' && !existing.passwordHash) {
    // The intake funnel created this account. Claim it rather than duplicating the family.
    if (existing.role !== 'FAMILY') {
      throw new ApiError(
        'CONFLICT',
        'An account already exists with these details. Please sign in instead, or contact us.',
      );
    }
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        email: input.email,
        phone: normalisedPhone,
        passwordHash,
        status: 'ACTIVE',
        timezone: isNri ? 'UTC' : 'Asia/Kolkata',
        familyProfile: {
          upsert: {
            create: {
              relationship: input.relationship,
              city: input.city ?? null,
              country: input.country,
              isNri,
              preferredChannel: input.preferredChannel,
            },
            update: {
              relationship: input.relationship,
              city: input.city ?? null,
              country: input.country,
              isNri,
              preferredChannel: input.preferredChannel,
            },
          },
        },
      },
      select: { id: true, role: true },
    });
    userId = updated.id;
    role = updated.role;

    await audit({
      actorUserId: userId,
      actorRole: role,
      action: 'auth.register.claimed-invite',
      entity: 'User',
      entityId: userId,
    });
  } else if (existing) {
    // Do not confirm which field matched, or whether the account is a staff account.
    throw new ApiError(
      'CONFLICT',
      'An account already exists with these details. Please sign in instead, or use "forgot password".',
    );
  } else {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        phone: normalisedPhone,
        passwordHash,
        // Hard-coded. A request body must never be able to choose a role.
        role: 'FAMILY',
        status: 'ACTIVE',
        timezone: isNri ? 'UTC' : 'Asia/Kolkata',
        familyProfile: {
          create: {
            relationship: input.relationship,
            city: input.city ?? null,
            country: input.country,
            isNri,
            preferredChannel: input.preferredChannel,
          },
        },
      },
      select: { id: true, role: true },
    });
    userId = user.id;
    role = user.role;

    await audit({
      actorUserId: userId,
      actorRole: role,
      action: 'auth.register',
      entity: 'User',
      entityId: userId,
      metadata: { isNri },
    });
  }

  const token = await createSession(userId);
  await setSessionCookie(token);

  return created({
    user: { id: userId, role },
    redirectTo: ROLE_HOME.FAMILY,
  });
});
