import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  ApiError,
  created,
  enforceRateLimit,
  handler,
  ok,
  paginated,
  pagination,
  parseBody,
  parseQuery,
  requireCapability,
  requireUser,
} from '@/lib/api';
import { createReferralSchema } from '@/lib/validation/business';
import { paginationQuery } from '@/lib/validation/common';
import { can } from '@/lib/rbac';
import { notifyInternal } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { reference } from '@/lib/utils';
import { writeList } from '@/lib/json-list';
import { log } from '@/lib/log';
import { REFERRAL_STATUSES, URGENCY_LABELS, label } from '@/lib/constants';
import { firstContactSlaHours } from '@/lib/services/recommendation';
import type { Urgency } from '@/lib/constants';

const listQuery = paginationQuery.extend({
  status: z.enum(REFERRAL_STATUSES).optional(),
  partnerId: z.string().optional(),
});

/**
 * GET /api/referrals
 *
 * A partner sees only their own referrals — enforced by overriding partnerId from the
 * session rather than trusting the query parameter. Internal staff see all.
 */
export const GET = handler(async (request) => {
  const user = await requireUser();
  const query = parseQuery(request, listQuery);
  const { page, pageSize, skip, take } = pagination(query);

  const isInternal = can(user.role, 'referral:read:all');
  const isPartner = user.role === 'REFERRAL_PARTNER';
  if (!isInternal && !isPartner) {
    throw new ApiError('FORBIDDEN', 'Your account does not have access to referrals.');
  }

  const where = {
    // A partner's own id always wins over anything they send.
    ...(isPartner ? { partnerId: user.partnerProfileId ?? '__none__' } : {}),
    ...(isInternal && query.partnerId ? { partnerId: query.partnerId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { reference: { contains: query.q.toUpperCase() } },
            { patientName: { contains: query.q } },
            { contactName: { contains: query.q } },
            { patientArea: { contains: query.q } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.referral.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip,
      take,
      include: {
        partner: { select: { id: true, organisationName: true, partnerType: true } },
        requestedService: { select: { name: true } },
        // A partner must never see the patient's care record; only that it converted.
        ...(isInternal
          ? {
              lead: { select: { id: true, reference: true, status: true } },
              senior: { select: { id: true, firstName: true, lastName: true, status: true } },
            }
          : {}),
      },
    }),
    prisma.referral.count({ where }),
  ]);

  return ok(paginated(data, total, page, pageSize));
});

/**
 * POST /api/referrals
 *
 * A partner refers a patient. Consent confirmation is required by the schema and is not
 * optional: we will not accept health information about somebody who has not agreed to
 * being contacted, however well-intentioned the referrer.
 *
 * The referral also creates a Lead so it enters the same pipeline as every other enquiry —
 * a referral that lives in its own list is a referral that gets forgotten.
 */
export const POST = handler(async (request) => {
  const user = await requireCapability('referral:create');
  await enforceRateLimit('write', user.id, request);
  const input = await parseBody(request, createReferralSchema);

  const partnerId =
    user.role === 'REFERRAL_PARTNER' ? user.partnerProfileId : undefined;
  if (user.role === 'REFERRAL_PARTNER' && !partnerId) {
    throw new ApiError('FORBIDDEN', 'Your partner account is not fully set up. Please contact us.');
  }

  const partner = await prisma.partnerProfile.findUnique({
    where: { id: partnerId ?? '' },
    select: { id: true, organisationName: true, agreementStatus: true },
  });

  if (user.role === 'REFERRAL_PARTNER') {
    if (!partner) throw new ApiError('FORBIDDEN', 'Your partner account could not be found.');
    if (partner.agreementStatus === 'PAUSED') {
      throw new ApiError(
        'FORBIDDEN',
        'Your partner account is paused. Please contact our operations team.',
      );
    }
  }

  const [source, serviceArea] = await Promise.all([
    prisma.leadSource.findUnique({ where: { key: 'HOSPITAL' }, select: { id: true } }),
    prisma.serviceArea.findFirst({
      where: { name: input.patientArea },
      select: { isActive: true, name: true },
    }),
  ]);

  const referralReference = reference('REF');
  const leadReference = reference('MC');

  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        reference: leadReference,
        status: 'NEW',
        urgency: input.urgency,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail ?? null,
        contactCountry: 'India',
        careNeedSummary: input.reason,
        situations: writeList([]),
        area: input.patientArea,
        journey: 'PARTNER',
        sourceId: source?.id ?? null,
        partnerId: partner?.id ?? null,
        notes: input.notes ?? null,
        activities: {
          create: {
            type: 'SYSTEM',
            summary: `Referral received from ${partner?.organisationName ?? 'a partner'}.`,
            toStatus: 'NEW',
            actorUserId: user.id,
          },
        },
      },
      select: { id: true },
    });

    const referral = await tx.referral.create({
      data: {
        reference: referralReference,
        partnerId: partner?.id ?? '',
        patientName: input.patientName,
        patientAgeYears: input.patientAgeYears ?? null,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail ?? null,
        patientArea: input.patientArea,
        dischargeStatus: input.dischargeStatus,
        dischargeDate: input.dischargeDate ?? null,
        reason: input.reason,
        requestedServiceId: input.requestedServiceId ?? null,
        urgency: input.urgency,
        consentConfirmed: true,
        notes: input.notes ?? null,
        status: 'SUBMITTED',
        leadId: lead.id,
      },
      select: { id: true, reference: true },
    });

    return { referral, leadId: lead.id };
  });

  const slaHours = firstContactSlaHours(input.urgency as Urgency);
  const areaWarning = serviceArea && !serviceArea.isActive;

  await notifyInternal({
    type: 'LEAD_NEW',
    title: `${input.urgency === 'TODAY' ? 'Urgent referral' : 'New referral'} from ${partner?.organisationName ?? 'a partner'}`,
    body: `${input.patientName} in ${input.patientArea}. ${label(URGENCY_LABELS, input.urgency)}. Target first contact: ${slaHours}h. Reference ${result.referral.reference}.${
      areaWarning ? ' NOTE: we do not currently serve this area — decline honestly and today.' : ''
    }`,
    severity: input.urgency === 'TODAY' || areaWarning ? 'WARNING' : 'INFO',
    href: `/app/admin/leads/${result.leadId}`,
  }).catch((error) => log.warn('referral.notify.failed', { error: String(error) }));

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'referral.created',
    entity: 'Referral',
    entityId: result.referral.id,
    metadata: {
      reference: result.referral.reference,
      partnerId: partner?.id ?? null,
      area: input.patientArea,
      areaServed: serviceArea?.isActive ?? false,
      consentConfirmed: true,
    },
  });

  return created({
    id: result.referral.id,
    reference: result.referral.reference,
    targetContactHours: slaHours,
    areaServed: serviceArea?.isActive ?? false,
    message: areaWarning
      ? `Received — reference ${result.referral.reference}. We do not currently staff ${input.patientArea}, so we will call the family today to tell them honestly rather than accepting work we cannot deliver.`
      : `Received — reference ${result.referral.reference}. We aim to contact the family within ${slaHours} hours during operating hours, and you will see the contacted timestamp on this referral.`,
  });
});
