import { prisma } from '@/lib/db';
import { ApiError, created, enforceRateLimit, handler, parseBody } from '@/lib/api';
import { intakeSubmissionSchema } from '@/lib/validation/intake';
import { recommendPackage, firstContactSlaHours } from '@/lib/services/recommendation';
import { notify, notifyInternal } from '@/lib/integrations/notifications';
import { audit } from '@/lib/audit';
import { reference } from '@/lib/utils';
import { writeList } from '@/lib/json-list';
import { log } from '@/lib/log';
import { URGENCY_LABELS, label, type Situation, type Urgency } from '@/lib/constants';

/**
 * POST /api/intake — Workflow A, the whole funnel in one transaction.
 *
 * Creates, atomically:
 *   IntakeSubmission (raw answers, for funnel analytics)
 *   User(FAMILY) + FamilyProfile   — matched by phone/email if they already exist
 *   Senior + SeniorFamilyLink      — patient and payer, correctly separated
 *   Lead + LeadActivity            — the CRM record
 *   Assessment(status=REQUESTED)   — the thing the family actually asked for
 *
 * Then, outside the transaction because a notification failure must not lose the lead:
 *   notify ops, notify the family, write an audit entry.
 *
 * Two decisions worth noting:
 *  * No password is set. The account is created in INVITED state so a coordinator can
 *    talk to the family before anyone is asked to choose credentials — asking for a
 *    password at the moment of a hospital discharge loses leads for no benefit.
 *  * An existing family (matched on phone) gets a *new* senior rather than an error. The
 *    second parent is a normal case, not a duplicate.
 */
export const POST = handler(async (request) => {
  await enforceRateLimit('intake', null, request);

  const input = await parseBody(request, intakeSubmissionSchema);

  const recommendation = recommendPackage({
    situations: input.situations as Situation[],
    urgency: input.urgency as Urgency,
    journey: input.journey,
    livingArrangement: input.livingArrangement,
    mobility: input.mobility,
    conditionCount: input.conditions.length,
  });

  // The family's explicit choice wins over the recommendation.
  const chosenSlug = input.selectedPackageSlug || recommendation.slug;
  const [recommendedPackage, serviceArea] = await Promise.all([
    prisma.carePackage.findUnique({ where: { slug: chosenSlug }, select: { id: true, name: true } }),
    prisma.serviceArea.findFirst({ where: { name: input.area }, select: { id: true } }),
  ]);

  const leadReference = reference('MC');

  const requestedFor = input.preferredAssessmentDate
    ? new Date(`${input.preferredAssessmentDate}T09:00:00`)
    : null;

  const result = await prisma.$transaction(async (tx) => {
    // --- Family account: match an existing one before creating a new one -----
    const normalisedPhone = input.contactPhone.replace(/\s/g, '');
    const existingUser = await tx.user.findFirst({
      where: {
        OR: [
          { phone: normalisedPhone },
          ...(input.contactEmail ? [{ email: input.contactEmail }] : []),
        ],
      },
      include: { familyProfile: true },
    });

    let familyProfileId: string;
    let familyUserId: string;
    let createdAccount = false;

    if (existingUser?.familyProfile) {
      familyUserId = existingUser.id;
      familyProfileId = existingUser.familyProfile.id;
    } else if (existingUser) {
      // A user exists in another role (say a caregiver enquiring for their own parent).
      // Give them a family profile rather than refusing the enquiry.
      const profile = await tx.familyProfile.create({
        data: {
          userId: existingUser.id,
          relationship: input.relationship,
          city: input.contactCity ?? null,
          country: input.contactCountry,
          isNri: input.contactCountry.trim().toLowerCase() !== 'india',
          preferredChannel: input.preferredChannel,
        },
      });
      familyUserId = existingUser.id;
      familyProfileId = profile.id;
    } else {
      const user = await tx.user.create({
        data: {
          name: input.contactName,
          email: input.contactEmail ?? null,
          phone: normalisedPhone,
          // No password yet: the family sets one when they first sign in, via OTP or a
          // reset link. Asking for credentials mid-discharge costs leads and gains nothing.
          passwordHash: null,
          role: 'FAMILY',
          status: 'INVITED',
          timezone: input.contactCountry.trim().toLowerCase() === 'india' ? 'Asia/Kolkata' : 'UTC',
          familyProfile: {
            create: {
              relationship: input.relationship,
              city: input.contactCity ?? null,
              country: input.contactCountry,
              isNri: input.contactCountry.trim().toLowerCase() !== 'india',
              preferredChannel: input.preferredChannel,
            },
          },
        },
        include: { familyProfile: true },
      });
      familyUserId = user.id;
      familyProfileId = user.familyProfile!.id;
      createdAccount = true;
    }

    // --- The patient ---------------------------------------------------------
    const senior = await tx.senior.create({
      data: {
        firstName: input.seniorFirstName,
        lastName: input.seniorLastName,
        ageYears: input.ageYears,
        gender: input.gender,
        area: input.area,
        serviceAreaId: serviceArea?.id ?? null,
        livingArrangement: input.livingArrangement,
        mobility: input.mobility,
        conditions: writeList(input.conditions),
        status: 'PROSPECT',
        notes: input.additionalNotes ?? null,
        // Consent is captured at intake and attributed to whoever gave it.
        consentCapturedAt: new Date(),
        consentCapturedBy: `${input.contactName} (${input.relationship.toLowerCase()}) via web intake`,
        familyLinks: {
          create: {
            familyProfileId,
            relationship: input.relationship,
            isPrimaryContact: true,
            isPrimaryPayer: true,
            canViewClinical: true,
          },
        },
      },
    });

    // --- The lead ------------------------------------------------------------
    const source = await tx.leadSource.findUnique({
      where: { key: input.journey === 'PARTNER' ? 'HOSPITAL' : 'WEBSITE' },
      select: { id: true },
    });

    const lead = await tx.lead.create({
      data: {
        reference: leadReference,
        status: 'NEW',
        urgency: input.urgency,
        contactName: input.contactName,
        contactPhone: normalisedPhone,
        contactEmail: input.contactEmail ?? null,
        relationship: input.relationship,
        contactCity: input.contactCity ?? null,
        contactCountry: input.contactCountry,
        preferredChannel: input.preferredChannel,
        careNeedSummary: buildSummary(input),
        situations: writeList(input.situations),
        area: input.area,
        budgetBand: input.budgetBand ?? null,
        journey: input.journey,
        utmSource: input.utmSource ?? null,
        utmCampaign: input.utmCampaign ?? null,
        sourceId: source?.id ?? null,
        familyProfileId,
        seniorId: senior.id,
        recommendedPackageId: recommendedPackage?.id ?? null,
        notes: input.additionalNotes ?? null,
        activities: {
          create: {
            type: 'SYSTEM',
            summary: `Website enquiry received. Recommended plan: ${recommendedPackage?.name ?? 'none'}.`,
            toStatus: 'NEW',
          },
        },
      },
    });

    // --- The assessment request ---------------------------------------------
    const assessment = await tx.assessment.create({
      data: {
        seniorId: senior.id,
        leadId: lead.id,
        type: 'HOME_VISIT',
        status: 'REQUESTED',
        requestedFor,
      },
    });

    // --- Raw answers, for funnel analytics ----------------------------------
    await tx.intakeSubmission.create({
      data: {
        leadId: lead.id,
        journey: input.journey,
        answers: JSON.stringify({
          ...input,
          // Never store the consent checkbox as an "answer"; the consent record on the
          // senior is the authoritative version.
          consentToContact: undefined,
        }),
        recommendedPackageSlug: chosenSlug,
        completedSteps: 7,
      },
    });

    return { lead, senior, assessment, familyUserId, familyProfileId, createdAccount };
  });

  // --- Side effects, deliberately outside the transaction -------------------
  const slaHours = firstContactSlaHours(input.urgency as Urgency);

  await notifyInternal({
    type: 'LEAD_NEW',
    title:
      input.urgency === 'TODAY'
        ? `Urgent enquiry — needed today (${input.area})`
        : `New care enquiry (${input.area})`,
    body: `${input.contactName} enquired about care for a ${input.ageYears}-year-old in ${input.area}. Urgency: ${label(URGENCY_LABELS, input.urgency)}. Target first contact: ${slaHours}h. Reference ${result.lead.reference}.`,
    severity: input.urgency === 'TODAY' || input.urgency === 'WITHIN_24H' ? 'WARNING' : 'INFO',
    href: `/app/admin/leads/${result.lead.id}`,
    seniorId: result.senior.id,
    templateKey: 'lead.new',
  }).catch((error) => log.warn('intake.notifyInternal.failed', { error: String(error) }));

  await notify({
    userId: result.familyUserId,
    type: 'SYSTEM',
    title: 'We have your care assessment request',
    body: `Your reference is ${result.lead.reference}. A care coordinator will contact you ${
      slaHours <= 4 ? `within about ${slaHours} hours during operating hours` : 'within one working day'
    }. Nothing has been charged.`,
    href: `/track/${result.lead.reference}`,
    seniorId: result.senior.id,
    // Mirror to the channel they asked for. Adapters report honestly if unconfigured.
    channels:
      input.preferredChannel === 'WHATSAPP'
        ? ['WHATSAPP']
        : input.preferredChannel === 'EMAIL'
          ? ['EMAIL']
          : input.preferredChannel === 'PHONE'
            ? ['SMS']
            : [],
  }).catch((error) => log.warn('intake.notifyFamily.failed', { error: String(error) }));

  await audit({
    actorUserId: result.familyUserId,
    actorRole: 'FAMILY',
    action: 'intake.submitted',
    entity: 'Lead',
    entityId: result.lead.id,
    seniorId: result.senior.id,
    metadata: {
      journey: input.journey,
      urgency: input.urgency,
      area: input.area,
      recommendedPackage: chosenSlug,
      createdAccount: result.createdAccount,
    },
  });

  return created({
    reference: result.lead.reference,
    leadId: result.lead.id,
    assessmentId: result.assessment.id,
    recommendedPackageSlug: chosenSlug,
    firstContactSlaHours: slaHours,
    trackUrl: `/track/${result.lead.reference}`,
  });
});

/** A one-line summary an ops person can read at a glance in the CRM list. */
function buildSummary(input: {
  situations: string[];
  situationOther?: string;
  ageYears: number;
  livingArrangement: string;
  conditions: string[];
}): string {
  const parts: string[] = [`${input.ageYears} years old`];
  if (input.livingArrangement === 'ALONE') parts.push('lives alone');
  if (input.conditions.length) parts.push(`conditions: ${input.conditions.join(', ')}`);
  if (input.situations.length) {
    parts.push(
      `situation: ${input.situations
        .map((situation) => situation.toLowerCase().replace(/_/g, ' '))
        .join(', ')}`,
    );
  }
  if (input.situationOther) parts.push(`also: ${input.situationOther}`);
  return parts.join(' · ');
}
