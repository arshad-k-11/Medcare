import { handler, ok, requireUser } from '@/lib/api';
import { prisma } from '@/lib/db';
import { updateProfileSchema } from '@/lib/validation/auth';
import { parseBody } from '@/lib/api';
import { audit } from '@/lib/audit';

/** GET /api/auth/me — the signed-in user and their accessibility preferences. */
export const GET = handler(async () => {
  const user = await requireUser();
  return ok({
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    phone: user.phone,
    preferences: {
      textScale: user.textScale,
      highContrast: user.highContrast,
      reduceMotion: user.reduceMotion,
    },
  });
});

/**
 * PATCH /api/auth/me
 *
 * Profile and accessibility preferences only. Role and status are deliberately absent from
 * the schema — a user must never be able to change their own role, and `.strict()` on the
 * schema means an attempt to send one is rejected rather than ignored.
 */
export const PATCH = handler(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, updateProfileSchema);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(input.timezone ? { timezone: input.timezone } : {}),
      ...(input.textScale ? { textScale: input.textScale } : {}),
      ...(input.highContrast != null ? { highContrast: input.highContrast } : {}),
      ...(input.reduceMotion != null ? { reduceMotion: input.reduceMotion } : {}),
    },
  });

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'user.profile.updated',
    entity: 'User',
    entityId: user.id,
    metadata: { fields: Object.keys(input) },
  });

  return ok({ ok: true });
});
