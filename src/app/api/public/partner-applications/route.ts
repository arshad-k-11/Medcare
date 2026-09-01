import { prisma } from '@/lib/db';
import { ApiError, created, enforceRateLimit, handler, parseBody } from '@/lib/api';
import { partnerRegistrationSchema } from '@/lib/validation/business';
import { notifyInternal } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { reference } from '@/lib/utils';
import { log } from '@/lib/log';
import { PARTNER_TYPE_LABELS, label } from '@/lib/constants';

/**
 * POST /api/public/partner-applications
 *
 * Creates an INVITED partner user with a PENDING agreement — never an active account.
 * A referral partner receives patient-adjacent information, so a person must review the
 * relationship before it goes live. The route deliberately cannot grant access; only an
 * admin action can move `agreementStatus` to ACTIVE.
 */
export const POST = handler(async (request) => {
  await enforceRateLimit('contact', null, request);
  const input = await parseBody(request, partnerRegistrationSchema);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
    select: { id: true, role: true },
  });

  if (existing) {
    // Do not reveal which field matched or what role the account holds.
    throw new ApiError(
      'CONFLICT',
      'An account already exists with these details. Please sign in, or contact us and we will sort it out.',
    );
  }

  const attributionCode = `PART-${reference('X').split('-')[1]}`;

  const user = await prisma.user.create({
    data: {
      name: input.contactPerson,
      email: input.email,
      phone: input.phone,
      role: 'REFERRAL_PARTNER',
      // INVITED, with no password: they cannot sign in until an admin enables the account.
      status: 'INVITED',
      passwordHash: null,
      partnerProfile: {
        create: {
          organisationName: input.organisationName,
          partnerType: input.partnerType,
          contactPerson: input.contactPerson,
          designation: input.designation ?? null,
          addressLine: input.addressLine ?? null,
          area: input.area ?? null,
          attributionCode,
          agreementStatus: 'PENDING',
          notes: input.notes ?? null,
        },
      },
    },
    include: { partnerProfile: { select: { id: true } } },
  });

  await notifyInternal({
    type: 'SYSTEM',
    title: 'New referral partner request',
    body: `${input.organisationName} (${label(PARTNER_TYPE_LABELS, input.partnerType)}) has asked to become a referral partner. Review before enabling the account.`,
    href: '/app/admin/partners',
    severity: 'INFO',
  }).catch((error) => log.warn('partner.notify.failed', { error: String(error) }));

  await audit({
    action: 'partner.application.submitted',
    entity: 'PartnerProfile',
    entityId: user.partnerProfile?.id ?? null,
    metadata: { partnerType: input.partnerType, attributionCode },
  });

  return created({ reference: attributionCode });
});
