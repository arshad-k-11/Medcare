import { z } from 'zod';
import {
  cuid,
  isoDate,
  longText,
  optionalIsoDate,
  personName,
  requiredLongText,
  shortText,
  stringList,
} from './common';
import {
  APPOINTMENT_STATUSES,
  ASSESSMENT_STATUSES,
  CARE_NOTE_TYPES,
  CARE_PLAN_STATUSES,
  ESCALATION_LEVELS,
  ESCALATION_TRIGGERS,
  FREQUENCIES,
  GENDERS,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  LIVING_ARRANGEMENTS,
  MEDICATION_FORMS,
  MOBILITY_LEVELS,
  SENIOR_STATUSES,
  SEVERITIES,
  SHIFT_PATTERNS,
  VISIT_KINDS,
  VISIT_STATUSES,
  VISIT_TASK_STATUSES,
  VITAL_TYPES,
} from '../constants';

// --- Patients --------------------------------------------------------------

export const createSeniorSchema = z
  .object({
    firstName: personName,
    lastName: personName,
    ageYears: z.coerce.number().int().min(40).max(120).optional(),
    dateOfBirth: optionalIsoDate,
    gender: z.enum(GENDERS).optional(),
    addressLine: shortText.optional(),
    area: shortText.min(2, 'Enter the area in Mumbai'),
    pincode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter a 6-digit pincode')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    livingArrangement: z.enum(LIVING_ARRANGEMENTS).optional(),
    mobility: z.enum(MOBILITY_LEVELS).optional(),
    conditions: stringList.default([]),
    allergies: shortText.optional(),
    languages: stringList.default([]),
    emergencyContactName: personName.optional(),
    emergencyContactPhone: shortText.optional(),
    hospitalPreference: shortText.optional(),
    relationship: shortText.min(2).optional(),
    notes: longText.optional(),
  })
  .strict();

export const updateSeniorSchema = createSeniorSchema
  .partial()
  .extend({
    status: z.enum(SENIOR_STATUSES).optional(),
    supervisingNurseId: cuid.nullable().optional(),
    serviceAreaId: cuid.nullable().optional(),
  })
  .strict();

// --- Assessments -----------------------------------------------------------

export const createAssessmentSchema = z
  .object({
    seniorId: cuid,
    type: z.enum(['HOME_VISIT', 'TELE', 'REASSESSMENT']).default('HOME_VISIT'),
    requestedFor: optionalIsoDate,
    leadId: cuid.optional(),
  })
  .strict();

export const updateAssessmentSchema = z
  .object({
    status: z.enum(ASSESSMENT_STATUSES).optional(),
    scheduledAt: optionalIsoDate,
    nurseId: cuid.nullable().optional(),
    summary: longText.optional(),
    riskFlags: stringList.optional(),
    recommendedPackageSlug: shortText.optional(),
    followUpNotes: longText.optional(),
    answers: z
      .array(z.object({ questionId: cuid, value: shortText, notes: shortText.optional() }))
      .max(60)
      .optional(),
  })
  .strict();

// --- Care plans ------------------------------------------------------------

export const createCarePlanSchema = z
  .object({
    seniorId: cuid,
    title: shortText.min(3, 'Give the plan a title'),
    assessmentId: cuid.optional(),
    packageId: cuid.optional(),
    primaryGoals: stringList.min(1, 'Add at least one goal'),
    careRequirements: stringList.default([]),
    scheduleSummary: longText.optional(),
    mobilityNotes: longText.optional(),
    dietaryNotes: longText.optional(),
    familyPreferences: longText.optional(),
    escalationPreferences: longText.optional(),
    startDate: optionalIsoDate,
    reviewDate: optionalIsoDate,
    services: z
      .array(
        z.object({
          serviceId: cuid,
          frequency: z.enum(FREQUENCIES).default('WEEKLY'),
          quantity: z.coerce.number().int().min(1).max(60).default(1),
          durationMinutes: z.coerce.number().int().min(15).max(1440).optional(),
          notes: shortText.optional(),
        }),
      )
      .default([]),
  })
  .strict();

export const updateCarePlanSchema = createCarePlanSchema
  .omit({ seniorId: true })
  .partial()
  .extend({
    status: z.enum(CARE_PLAN_STATUSES).optional(),
    /** Required on any change, so the version history explains itself later. */
    changeNote: shortText.min(3, 'Describe what changed').optional(),
  })
  .strict();

// --- Visits ----------------------------------------------------------------

export const createVisitSchema = z
  .object({
    seniorId: cuid,
    kind: z.enum(VISIT_KINDS).default('CAREGIVER_SHIFT'),
    caregiverId: cuid.optional(),
    nurseId: cuid.optional(),
    assignmentId: cuid.optional(),
    carePlanId: cuid.optional(),
    scheduledStart: isoDate,
    scheduledEnd: isoDate,
    instructions: longText.optional(),
    taskTemplateKeys: stringList.default([]),
  })
  .strict()
  .refine((value) => value.scheduledEnd > value.scheduledStart, {
    message: 'The visit must end after it starts',
    path: ['scheduledEnd'],
  });

export const updateVisitSchema = z
  .object({
    status: z.enum(VISIT_STATUSES).optional(),
    scheduledStart: optionalIsoDate,
    scheduledEnd: optionalIsoDate,
    caregiverId: cuid.nullable().optional(),
    instructions: longText.optional(),
    cancelReason: shortText.optional(),
    atRisk: z.boolean().optional(),
  })
  .strict();

export const checkInSchema = z
  .object({
    /** Optional because a caregiver may decline location sharing; the visit still runs. */
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    accuracyMetres: z.coerce.number().min(0).max(10000).optional(),
  })
  .strict();

export const checkOutSchema = z
  .object({
    summary: longText.optional(),
  })
  .strict();

export const updateVisitTaskSchema = z
  .object({
    status: z.enum(VISIT_TASK_STATUSES),
    note: shortText.optional(),
  })
  .strict()
  .refine((value) => value.status !== 'REFUSED' || Boolean(value.note), {
    message: 'Please record why the task was declined',
    path: ['note'],
  });

// --- Notes, vitals, medication --------------------------------------------

export const createCareNoteSchema = z
  .object({
    seniorId: cuid,
    visitId: cuid.optional(),
    type: z.enum(CARE_NOTE_TYPES),
    body: requiredLongText,
    visibleToFamily: z.boolean().default(true),
    requiresReview: z.boolean().default(false),
  })
  .strict();

export const createVitalSchema = z
  .object({
    seniorId: cuid,
    visitId: cuid.optional(),
    type: z.enum(VITAL_TYPES),
    valueNumber: z.coerce.number().min(0).max(1000),
    valueSecondary: z.coerce.number().min(0).max(1000).optional(),
    context: z.enum(['FASTING', 'POST_MEAL', 'RESTING', 'POST_ACTIVITY']).optional(),
    measuredAt: isoDate,
    note: shortText.optional(),
  })
  .strict()
  .refine(
    (value) => value.type !== 'BLOOD_PRESSURE' || value.valueSecondary != null,
    { message: 'Blood pressure needs both systolic and diastolic values', path: ['valueSecondary'] },
  )
  .refine(
    (value) =>
      value.type !== 'BLOOD_PRESSURE' ||
      value.valueSecondary == null ||
      value.valueSecondary < value.valueNumber,
    { message: 'Diastolic should be lower than systolic', path: ['valueSecondary'] },
  );

export const createMedicationSchema = z
  .object({
    seniorId: cuid,
    name: shortText.min(2, 'Enter the medication name as written on the prescription'),
    dose: shortText.min(1, 'Enter the dose exactly as prescribed'),
    form: z.enum(MEDICATION_FORMS).optional(),
    timings: z
      .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour times like 08:00'))
      .min(1, 'Add at least one reminder time')
      .max(6),
    instructions: shortText.optional(),
    prescribedBy: shortText.optional(),
    startDate: isoDate,
    endDate: optionalIsoDate,
  })
  .strict();

export const confirmReminderSchema = z
  .object({
    status: z.enum(['CONFIRMED', 'MISSED', 'SKIPPED']),
    note: shortText.optional(),
  })
  .strict();

// --- Appointments ----------------------------------------------------------

export const createAppointmentSchema = z
  .object({
    seniorId: cuid,
    title: shortText.min(3, 'Give the appointment a title'),
    doctorName: shortText.optional(),
    facility: shortText.optional(),
    specialty: shortText.optional(),
    scheduledAt: isoDate,
    durationMinutes: z.coerce.number().int().min(15).max(600).default(60),
    purpose: longText.optional(),
    transportRequired: z.boolean().default(false),
    companionRequired: z.boolean().default(false),
  })
  .strict();

export const updateAppointmentSchema = createAppointmentSchema
  .omit({ seniorId: true })
  .partial()
  .extend({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    outcomeNotes: longText.optional(),
  })
  .strict();

// --- Incidents & escalations ----------------------------------------------

export const createIncidentSchema = z
  .object({
    seniorId: cuid,
    visitId: cuid.optional(),
    type: z.enum(INCIDENT_TYPES),
    severity: z.enum(SEVERITIES).default('LOW'),
    title: shortText.min(4, 'Summarise what happened in a few words'),
    description: requiredLongText,
  })
  .strict();

export const updateIncidentSchema = z
  .object({
    status: z.enum(INCIDENT_STATUSES).optional(),
    severity: z.enum(SEVERITIES).optional(),
    actionsTaken: longText.optional(),
    resolution: longText.optional(),
    notifyFamily: z.boolean().optional(),
  })
  .strict();

export const createEscalationSchema = z
  .object({
    seniorId: cuid,
    incidentId: cuid.optional(),
    trigger: z.enum(ESCALATION_TRIGGERS),
    level: z.enum(ESCALATION_LEVELS).optional(),
    reason: requiredLongText,
  })
  .strict();

// --- Assignments -----------------------------------------------------------

export const createAssignmentSchema = z
  .object({
    seniorId: cuid,
    caregiverId: cuid,
    role: z.enum(['PRIMARY', 'BACKUP', 'REPLACEMENT']).default('PRIMARY'),
    shiftPattern: z.enum(SHIFT_PATTERNS).default('DAY'),
    shiftStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour times like 09:00')
      .optional(),
    shiftEnd: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour times like 17:00')
      .optional(),
    daysOfWeek: z.array(z.coerce.number().int().min(0).max(6)).max(7).default([]),
    startDate: optionalIsoDate,
    /** Set when this assignment replaces another — the reason is recorded, not optional. */
    replacedAssignmentId: cuid.optional(),
    replacementReason: shortText.optional(),
    matchScore: z.coerce.number().int().min(0).max(100).optional(),
    matchExplanation: longText.optional(),
  })
  .strict()
  .refine(
    (value) => !value.replacedAssignmentId || Boolean(value.replacementReason),
    { message: 'Record why the caregiver is being replaced', path: ['replacementReason'] },
  );

export const availableCaregiversQuery = z.object({
  seniorId: cuid,
  from: z.string().optional(),
  to: z.string().optional(),
  shiftPattern: z.enum(SHIFT_PATTERNS).optional(),
});

export const leaveRequestSchema = z
  .object({
    fromDate: isoDate,
    toDate: isoDate,
    reason: requiredLongText,
    type: z.enum(['PLANNED', 'SICK', 'EMERGENCY']).default('PLANNED'),
  })
  .strict()
  .refine((value) => value.toDate >= value.fromDate, {
    message: 'The end date cannot be before the start date',
    path: ['toDate'],
  });

export const decideLeaveSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    decisionNote: shortText.optional(),
  })
  .strict();
