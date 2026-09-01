import { z } from 'zod';
import {
  cuid,
  internationalPhone,
  isoDate,
  longText,
  optionalEmail,
  optionalIsoDate,
  personName,
  requiredLongText,
  shortText,
  stringList,
} from './common';
import {
  BUDGET_BANDS,
  CHANNELS,
  DOCUMENT_CATEGORIES,
  FEEDBACK_TYPES,
  FREQUENCIES,
  INVOICE_STATUSES,
  JOURNEYS,
  LEAD_STATUSES,
  NOTIFICATION_TYPES,
  PACKAGE_AUDIENCES,
  PARTNER_TYPES,
  REFERRAL_STATUSES,
  SERVICE_CLASSES,
  URGENCIES,
} from '../constants';

// --- CRM -------------------------------------------------------------------

export const createLeadSchema = z
  .object({
    contactName: personName,
    contactPhone: internationalPhone,
    contactEmail: optionalEmail,
    relationship: shortText.optional(),
    contactCity: shortText.optional(),
    contactCountry: shortText.default('India'),
    careNeedSummary: longText.optional(),
    situations: stringList.default([]),
    area: shortText.optional(),
    urgency: z.enum(URGENCIES).default('EXPLORING'),
    budgetBand: z.enum(BUDGET_BANDS).optional(),
    journey: z.enum(JOURNEYS).default('FAMILY_LOCAL'),
    sourceKey: shortText.optional(),
    recommendedPackageId: cuid.optional(),
    notes: longText.optional(),
  })
  .strict();

export const updateLeadSchema = z
  .object({
    status: z.enum(LEAD_STATUSES).optional(),
    ownerUserId: cuid.nullable().optional(),
    urgency: z.enum(URGENCIES).optional(),
    budgetBand: z.enum(BUDGET_BANDS).optional(),
    area: shortText.optional(),
    followUpAt: optionalIsoDate,
    recommendedPackageId: cuid.nullable().optional(),
    lostReason: shortText.optional(),
    notes: longText.optional(),
  })
  .strict()
  .refine((value) => value.status !== 'LOST' || Boolean(value.lostReason), {
    message: 'Record why the enquiry was lost — this feeds the funnel report',
    path: ['lostReason'],
  });

export const leadActivitySchema = z
  .object({
    type: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'NOTE', 'ASSESSMENT']),
    summary: requiredLongText,
    outcome: shortText.optional(),
  })
  .strict();

export const crmTaskSchema = z
  .object({
    title: shortText.min(3, 'Describe the follow-up'),
    details: longText.optional(),
    dueAt: isoDate,
    priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
    leadId: cuid.optional(),
    assigneeUserId: cuid,
  })
  .strict();

export const listLeadsQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  q: shortText.optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  urgency: z.enum(URGENCIES).optional(),
  journey: z.enum(JOURNEYS).optional(),
  ownerUserId: cuid.optional(),
  sort: z.enum(['createdAt', 'followUpAt', 'urgency']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

// --- Referrals -------------------------------------------------------------

export const createReferralSchema = z
  .object({
    patientName: personName,
    patientAgeYears: z.coerce.number().int().min(40).max(120).optional(),
    contactName: personName,
    contactPhone: internationalPhone,
    contactEmail: optionalEmail,
    patientArea: shortText.min(2, 'Enter the area in Mumbai'),
    dischargeStatus: z
      .enum(['PRE_DISCHARGE', 'DISCHARGED_TODAY', 'DISCHARGED_THIS_WEEK', 'NOT_APPLICABLE'])
      .default('NOT_APPLICABLE'),
    dischargeDate: optionalIsoDate,
    reason: requiredLongText,
    requestedServiceId: cuid.optional(),
    urgency: z.enum(URGENCIES).default('FEW_DAYS'),
    notes: longText.optional(),
    /**
     * A partner must confirm the patient or family agreed to the referral. Health data
     * cannot be passed to a third party on the partner's word alone.
     */
    consentConfirmed: z.literal(true, {
      errorMap: () => ({
        message: 'Please confirm the patient or family has agreed to this referral',
      }),
    }),
  })
  .strict();

export const updateReferralSchema = z
  .object({
    status: z.enum(REFERRAL_STATUSES).optional(),
    statusNote: shortText.optional(),
    seniorId: cuid.optional(),
  })
  .strict();

export const partnerRegistrationSchema = z
  .object({
    organisationName: shortText.min(2, 'Enter the organisation name'),
    partnerType: z.enum(PARTNER_TYPES),
    contactPerson: personName,
    designation: shortText.optional(),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    phone: internationalPhone,
    area: shortText.optional(),
    addressLine: shortText.optional(),
    notes: longText.optional(),
  })
  .strict();

// --- Documents & feedback --------------------------------------------------

export const documentMetaSchema = z
  .object({
    seniorId: cuid,
    category: z.enum(DOCUMENT_CATEGORIES),
    label: shortText.min(2, 'Give the document a name'),
    isRestricted: z.coerce.boolean().default(false),
  })
  .strict();

export const feedbackSchema = z
  .object({
    seniorId: cuid.optional(),
    type: z.enum(FEEDBACK_TYPES).default('RATING'),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    subject: shortText.optional(),
    comment: longText.optional(),
    relatedVisitId: cuid.optional(),
  })
  .strict()
  .refine((value) => value.type !== 'RATING' || value.rating != null, {
    message: 'Please choose a rating',
    path: ['rating'],
  })
  .refine((value) => value.type !== 'COMPLAINT' || Boolean(value.comment), {
    message: 'Please tell us what went wrong so we can act on it',
    path: ['comment'],
  });

export const resolveFeedbackSchema = z
  .object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    resolution: longText.optional(),
  })
  .strict();

// --- Messaging & notifications --------------------------------------------

export const createThreadSchema = z
  .object({
    subject: shortText.min(3, 'Add a subject'),
    body: requiredLongText,
    seniorId: cuid.optional(),
    category: z.enum(['GENERAL', 'CARE', 'BILLING', 'COMPLAINT', 'PARTNER']).default('GENERAL'),
    participantUserIds: z.array(cuid).max(10).default([]),
  })
  .strict();

export const postMessageSchema = z
  .object({
    threadId: cuid,
    body: requiredLongText,
  })
  .strict();

export const notificationPreferenceSchema = z
  .object({
    preferences: z
      .array(
        z.object({
          type: z.enum(NOTIFICATION_TYPES),
          channel: z.enum(CHANNELS),
          enabled: z.boolean(),
        }),
      )
      .max(60),
  })
  .strict();

// --- Money -----------------------------------------------------------------

export const createInvoiceSchema = z
  .object({
    familyProfileId: cuid,
    seniorId: cuid.optional(),
    bookingId: cuid.optional(),
    items: z
      .array(
        z.object({
          label: shortText.min(2),
          quantity: z.coerce.number().int().min(1).max(500).default(1),
          unitPricePaise: z.coerce.number().int().min(0).max(100_000_000),
        }),
      )
      .min(1, 'Add at least one line item'),
    taxPaise: z.coerce.number().int().min(0).default(0),
    discountPaise: z.coerce.number().int().min(0).default(0),
    dueDate: optionalIsoDate,
    notes: longText.optional(),
  })
  .strict();

export const updateInvoiceSchema = z
  .object({
    status: z.enum(INVOICE_STATUSES).optional(),
    dueDate: optionalIsoDate,
    notes: longText.optional(),
  })
  .strict();

export const createPaymentSchema = z
  .object({
    invoiceId: cuid,
  })
  .strict();

export const verifyPaymentSchema = z
  .object({
    orderId: shortText,
    paymentId: shortText,
    signature: shortText,
  })
  .strict();

export const pricingEstimateSchema = z
  .object({
    caregiverHoursPerDay: z.coerce.number().min(0).max(24).default(0),
    caregiverDaysPerWeek: z.coerce.number().int().min(0).max(7).default(0),
    nurseVisitsPerMonth: z.coerce.number().int().min(0).max(30).default(0),
    includeAssessment: z.coerce.boolean().default(true),
    additionalServiceIds: z.array(cuid).max(12).default([]),
    coordinationTier: z.enum(['NONE', 'STANDARD', 'DEDICATED']).default('NONE'),
  })
  .strict();

export const createBookingSchema = z
  .object({
    seniorId: cuid,
    packageId: cuid,
    leadId: cuid.optional(),
    startDate: optionalIsoDate,
    notes: longText.optional(),
  })
  .strict();

// --- Admin configuration ---------------------------------------------------

export const servicePayloadSchema = z
  .object({
    slug: shortText.min(2),
    name: shortText.min(2),
    category: z.enum([
      'ASSESSMENT',
      'ATTENDANT',
      'NURSING',
      'COORDINATION',
      'MONITORING',
      'COMPANION',
    ]),
    serviceClass: z.enum(SERVICE_CLASSES).default('NON_MEDICAL'),
    description: longText.min(10),
    unit: z.enum(['VISIT', 'HOUR', 'SHIFT', 'MONTH', 'ONE_TIME']).default('VISIT'),
    basePricePaise: z.coerce.number().int().min(0).max(100_000_000).default(0),
    requiredSkills: stringList.default([]),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  })
  .strict();

export const packagePayloadSchema = z
  .object({
    slug: shortText.min(2),
    name: shortText.min(2),
    tagline: shortText.min(4),
    audience: z.enum(PACKAGE_AUDIENCES),
    summary: longText.min(20),
    details: longText.min(20),
    durationLabel: shortText.min(2),
    billingCycle: z.enum(['ONE_TIME', 'MONTHLY']).default('ONE_TIME'),
    priceFromPaise: z.coerce.number().int().min(0).max(100_000_000).default(0),
    isPublished: z.boolean().default(true),
    isComingSoon: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
    outcomes: stringList.default([]),
    notIncluded: stringList.default([]),
    services: z
      .array(
        z.object({
          serviceId: cuid,
          quantity: z.coerce.number().int().min(1).max(60).default(1),
          frequency: z.enum(FREQUENCIES).default('AS_NEEDED'),
          notes: shortText.optional(),
        }),
      )
      .default([]),
  })
  .strict();

export const serviceAreaPayloadSchema = z
  .object({
    name: shortText.min(2),
    zone: z.enum(['MUMBAI', 'THANE', 'NAVI_MUMBAI']).default('MUMBAI'),
    pincodes: z.array(z.string().regex(/^\d{6}$/, 'Pincodes are 6 digits')).max(60).default([]),
    isActive: z.boolean().default(true),
    notes: shortText.optional(),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  })
  .strict();

export const taskTemplatePayloadSchema = z
  .object({
    key: shortText.min(2),
    label: shortText.min(2),
    category: z.enum([
      'MOBILITY',
      'MEALS',
      'MEDICATION',
      'HYGIENE',
      'COMPANION',
      'HOUSEHOLD',
      'APPOINTMENT',
      'MONITORING',
    ]),
    instructions: longText.optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  })
  .strict();

export const vitalThresholdPayloadSchema = z
  .object({
    seniorId: cuid.nullable().optional(),
    type: shortText.min(2),
    lowValue: z.coerce.number().min(0).max(1000).nullable().optional(),
    highValue: z.coerce.number().min(0).max(1000).nullable().optional(),
    lowSecondary: z.coerce.number().min(0).max(1000).nullable().optional(),
    highSecondary: z.coerce.number().min(0).max(1000).nullable().optional(),
    note: shortText.optional(),
    isActive: z.boolean().default(true),
  })
  .strict();
