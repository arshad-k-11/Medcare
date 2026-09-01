import { prisma } from '@/lib/db';
import {
  ApiError,
  enforceRateLimit,
  handler,
  ok,
  parseBody,
  requireCapability,
  type RouteContext,
} from '@/lib/api';
import { checkInSchema } from '@/lib/validation/care';
import { notify } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { log } from '@/lib/log';
import { formatTime } from '@/lib/format';

/** Metres. Beyond this the check-in is recorded but not marked location-verified. */
const LOCATION_TOLERANCE_M = 500;

/**
 * POST /api/visits/:id/check-in
 *
 * Starts a visit. Notes on the design:
 *  * A caregiver may only check into their own visit. The assignment is what authorises
 *    it, not the fact that they know the visit id.
 *  * Location is optional. A caregiver who declines to share it, or whose phone cannot get
 *    a fix in a stairwell, can still work — the visit is simply not marked verified.
 *    Blocking care on a GPS reading would be a worse product and a worse ethic.
 *  * The family is told immediately, because "has anyone arrived?" is the question they
 *    open the app to answer.
 */
export const POST = handler<RouteContext<{ id: string }>>(async (request, { params }) => {
  const user = await requireCapability('visit:attend');
  await enforceRateLimit('write', user.id, request);
  const { id } = await params;
  const input = await parseBody(request, checkInSchema);

  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      senior: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          familyLinks: {
            select: { familyProfile: { select: { userId: true } } },
          },
        },
      },
      caregiver: { select: { id: true, userId: true, user: { select: { name: true } } } },
      nurse: { select: { id: true, userId: true, user: { select: { name: true } } } },
    },
  });

  if (!visit) throw new ApiError('NOT_FOUND', 'That visit could not be found.');

  // Only the assigned person, or internal staff, may start a visit.
  const isAssignedCaregiver =
    user.role === 'CAREGIVER' && visit.caregiver?.id === user.caregiverProfileId;
  const isAssignedNurse = user.role === 'NURSE' && visit.nurse?.id === user.nurseProfileId;
  const isInternal = user.role === 'ADMIN' || user.role === 'OPS_MANAGER';

  if (!isAssignedCaregiver && !isAssignedNurse && !isInternal) {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'visit.check-in.denied',
      entity: 'Visit',
      entityId: id,
      seniorId: visit.seniorId,
      outcome: 'DENIED',
    });
    throw new ApiError('FORBIDDEN', 'This visit is not assigned to you.');
  }

  if (visit.checkInAt) {
    throw new ApiError('CONFLICT', 'You have already checked in to this visit.');
  }
  if (visit.status === 'CANCELLED') {
    throw new ApiError('CONFLICT', 'This visit was cancelled. Please contact your supervisor.');
  }

  // Location verification is best-effort and never blocks the check-in.
  let locationVerified = false;
  if (input.latitude != null && input.longitude != null) {
    const reference = await prisma.visit.findFirst({
      where: {
        seniorId: visit.seniorId,
        locationVerified: true,
        checkInLat: { not: null },
        checkInLng: { not: null },
      },
      orderBy: { checkInAt: 'desc' },
      select: { checkInLat: true, checkInLng: true },
    });
    if (reference?.checkInLat != null && reference.checkInLng != null) {
      const distance = haversineMetres(
        input.latitude,
        input.longitude,
        reference.checkInLat,
        reference.checkInLng,
      );
      locationVerified = distance <= LOCATION_TOLERANCE_M;
    } else {
      // No prior verified visit for this patient: accept this one as the baseline.
      locationVerified = true;
    }
  }

  const now = new Date();
  await prisma.visit.update({
    where: { id },
    data: {
      checkInAt: now,
      status: 'IN_PROGRESS',
      atRisk: false,
      checkInLat: input.latitude ?? null,
      checkInLng: input.longitude ?? null,
      checkInAccuracyM: input.accuracyMetres ? Math.round(input.accuracyMetres) : null,
      locationVerified,
    },
  });

  const who = visit.caregiver?.user.name ?? visit.nurse?.user.name ?? 'Your care team';
  const familyUserIds = visit.senior.familyLinks.map((link) => link.familyProfile.userId);

  await Promise.all(
    familyUserIds.map((familyUserId) =>
      notify({
        userId: familyUserId,
        type: 'VISIT_UPDATE',
        title: 'Caregiver checked in',
        body: `${who} checked in for ${visit.senior.firstName} at ${formatTime(now)}.`,
        href: '/app/family',
        seniorId: visit.seniorId,
        templateKey: 'visit.checked-in',
      }),
    ),
  ).catch((error) => log.warn('visit.check-in.notify.failed', { error: String(error) }));

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'visit.checked-in',
    entity: 'Visit',
    entityId: id,
    seniorId: visit.seniorId,
    metadata: { locationVerified, locationShared: input.latitude != null },
  });

  return ok({ checkInAt: now.toISOString(), locationVerified });
});

/** Great-circle distance in metres. */
function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
