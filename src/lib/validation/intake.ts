import { z } from 'zod';
import {
  internationalPhone,
  longText,
  optionalEmail,
  personName,
  shortText,
} from './common';
import {
  BUDGET_BANDS,
  CARE_RECIPIENTS,
  CONTACT_CHANNELS,
  GENDERS,
  JOURNEYS,
  LIVING_ARRANGEMENTS,
  MOBILITY_LEVELS,
  RELATIONSHIPS,
  SITUATIONS,
  URGENCIES,
} from '../constants';

/**
 * The public intake funnel. Validated per step on the client for immediate feedback and
 * re-validated as a whole on submit, because a partially-filled wizard state can reach
 * the API from a resumed session or a crafted request.
 */

export const intakeStep1 = z.object({
  careRecipient: z.enum(CARE_RECIPIENTS, {
    errorMap: () => ({ message: 'Please tell us who needs care' }),
  }),
});

export const intakeStep2 = z.object({
  situations: z
    .array(z.enum(SITUATIONS))
    .min(1, 'Please choose at least one that applies')
    .max(10),
  situationOther: shortText.optional(),
});

export const intakeStep3 = z.object({
  seniorFirstName: personName,
  seniorLastName: personName,
  ageYears: z.coerce
    .number({ invalid_type_error: 'Enter an age' })
    .int('Enter a whole number')
    .min(40, 'This service is designed for older adults (40+)')
    .max(120, 'Please check the age'),
  gender: z.enum(GENDERS),
  area: shortText.min(2, 'Choose or type the area in Mumbai'),
  livingArrangement: z.enum(LIVING_ARRANGEMENTS),
  mobility: z.enum(MOBILITY_LEVELS),
  conditions: z.array(shortText.min(1)).max(20).default([]),
  currentCaregiverSituation: z
    .enum(['NONE', 'FAMILY_ONLY', 'PART_TIME_HELP', 'FULL_TIME_ATTENDANT', 'AGENCY', 'OTHER'])
    .default('NONE'),
});

export const intakeStep4 = z.object({
  urgency: z.enum(URGENCIES, {
    errorMap: () => ({ message: 'Please tell us how soon support is needed' }),
  }),
});

export const intakeStep5 = z.object({
  contactName: personName,
  relationship: z.enum(RELATIONSHIPS),
  contactPhone: internationalPhone,
  contactEmail: optionalEmail,
  contactCity: shortText.optional(),
  contactCountry: shortText.default('India'),
  preferredChannel: z.enum(CONTACT_CHANNELS).default('PHONE'),
  consentToContact: z.literal(true, {
    errorMap: () => ({ message: 'We need your permission to contact you about this enquiry' }),
  }),
});

export const intakeStep6 = z.object({
  selectedPackageSlug: shortText.optional(),
  budgetBand: z.enum(BUDGET_BANDS).optional(),
});

export const intakeStep7 = z.object({
  preferredAssessmentDate: shortText.optional(),
  preferredAssessmentSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE']).default('FLEXIBLE'),
  additionalNotes: longText.optional(),
});

export const intakeSubmissionSchema = intakeStep1
  .merge(intakeStep2)
  .merge(intakeStep3)
  .merge(intakeStep4)
  .merge(intakeStep5)
  .merge(intakeStep6)
  .merge(intakeStep7)
  .extend({
    journey: z.enum(JOURNEYS).default('FAMILY_LOCAL'),
    utmSource: shortText.optional(),
    utmCampaign: shortText.optional(),
  })
  .strict();

export type IntakeSubmission = z.infer<typeof intakeSubmissionSchema>;

export const contactSchema = z
  .object({
    name: personName,
    phone: internationalPhone,
    email: optionalEmail,
    subject: shortText.min(2, 'Please add a subject'),
    message: longText.min(10, 'Please tell us a little more'),
    consentToContact: z.literal(true, {
      errorMap: () => ({ message: 'We need your permission to reply to you' }),
    }),
  })
  .strict();
