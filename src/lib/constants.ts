/**
 * Allowed values for the schema's String status/type columns, plus their human labels.
 *
 * The database stores strings so ops can extend vocabularies through the admin console
 * without a migration. These constants are the *code-side* contract: zod validates
 * against them at the API edge and the UI reads labels from here, so a new value added
 * in the database degrades to its raw key rather than crashing a page.
 */

export const ROLES = [
  'ADMIN',
  'OPS_MANAGER',
  'NURSE',
  'CAREGIVER',
  'FAMILY',
  'SENIOR',
  'REFERRAL_PARTNER',
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  OPS_MANAGER: 'Operations manager',
  NURSE: 'Nurse / care supervisor',
  CAREGIVER: 'Caregiver',
  FAMILY: 'Family member',
  SENIOR: 'Senior',
  REFERRAL_PARTNER: 'Referral partner',
};

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/app/admin',
  OPS_MANAGER: '/app/admin',
  NURSE: '/app/nurse',
  CAREGIVER: '/app/caregiver',
  FAMILY: '/app/family',
  SENIOR: '/app/senior',
  REFERRAL_PARTNER: '/app/partner',
};

export const INTERNAL_ROLES: Role[] = ['ADMIN', 'OPS_MANAGER'];
export const STAFF_ROLES: Role[] = ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER'];

// --- Acquisition -----------------------------------------------------------

export const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'ASSESSMENT_BOOKED',
  'ASSESSMENT_COMPLETED',
  'PROPOSAL_SENT',
  'WON',
  'LOST',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  ASSESSMENT_BOOKED: 'Assessment booked',
  ASSESSMENT_COMPLETED: 'Assessment completed',
  PROPOSAL_SENT: 'Proposal sent',
  WON: 'Won',
  LOST: 'Lost',
};

/** Ordered pipeline shown as columns in the CRM. WON/LOST are terminal. */
export const LEAD_PIPELINE: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'ASSESSMENT_BOOKED',
  'ASSESSMENT_COMPLETED',
  'PROPOSAL_SENT',
];

export const URGENCIES = ['TODAY', 'WITHIN_24H', 'FEW_DAYS', 'WITHIN_WEEK', 'EXPLORING'] as const;
export type Urgency = (typeof URGENCIES)[number];

export const URGENCY_LABELS: Record<Urgency, string> = {
  TODAY: 'Today',
  WITHIN_24H: 'Within 24 hours',
  FEW_DAYS: 'Within a few days',
  WITHIN_WEEK: 'Within a week',
  EXPLORING: 'Just exploring',
};

export const BUDGET_BANDS = ['UNDER_10K', '10K_25K', '25K_50K', 'ABOVE_50K', 'UNSURE'] as const;
export const BUDGET_BAND_LABELS: Record<string, string> = {
  UNDER_10K: 'Under ₹10,000 / month',
  '10K_25K': '₹10,000 – ₹25,000 / month',
  '25K_50K': '₹25,000 – ₹50,000 / month',
  ABOVE_50K: 'Above ₹50,000 / month',
  UNSURE: 'Not sure yet',
};

export const JOURNEYS = ['FAMILY_LOCAL', 'NRI', 'PARTNER'] as const;
export type Journey = (typeof JOURNEYS)[number];
export const JOURNEY_LABELS: Record<Journey, string> = {
  FAMILY_LOCAL: 'Family in Mumbai',
  NRI: 'NRI / out-of-city family',
  PARTNER: 'Hospital / doctor referral',
};

export const REFERRAL_STATUSES = [
  'SUBMITTED',
  'CONTACTED',
  'ASSESSMENT',
  'CONVERTED',
  'DECLINED',
  'LOST',
] as const;
export const REFERRAL_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  CONTACTED: 'Contacted',
  ASSESSMENT: 'Assessment',
  CONVERTED: 'Converted',
  DECLINED: 'Declined',
  LOST: 'Lost',
};

export const PARTNER_TYPES = [
  'HOSPITAL',
  'DOCTOR',
  'GERIATRICIAN',
  'PHYSIOTHERAPIST',
  'PHARMACY',
  'DIAGNOSTIC_CENTRE',
  'HOUSING_SOCIETY',
  'COMMUNITY_ORG',
  'OTHER',
] as const;
export const PARTNER_TYPE_LABELS: Record<string, string> = {
  HOSPITAL: 'Hospital',
  DOCTOR: 'Doctor',
  GERIATRICIAN: 'Geriatrician',
  PHYSIOTHERAPIST: 'Physiotherapist',
  PHARMACY: 'Pharmacy',
  DIAGNOSTIC_CENTRE: 'Diagnostic centre',
  HOUSING_SOCIETY: 'Housing society',
  COMMUNITY_ORG: 'Community organisation',
  OTHER: 'Other',
};

// --- Intake ----------------------------------------------------------------

export const CARE_RECIPIENTS = ['PARENT', 'GRANDPARENT', 'SPOUSE', 'SELF', 'OTHER'] as const;
export const CARE_RECIPIENT_LABELS: Record<string, string> = {
  PARENT: 'My parent',
  GRANDPARENT: 'My grandparent',
  SPOUSE: 'My spouse',
  SELF: 'Myself',
  OTHER: 'Someone else',
};

export const SITUATIONS = [
  'POST_DISCHARGE',
  'LIVING_ALONE',
  'CHRONIC_CONDITION',
  'MOBILITY_DIFFICULTY',
  'MEDICATION_DIFFICULTY',
  'COGNITIVE_SUPPORT',
  'CAREGIVER_UNAVAILABLE',
  'COMPANIONSHIP',
  'NRI_SUPPORT',
  'OTHER',
] as const;
export type Situation = (typeof SITUATIONS)[number];

export const SITUATION_LABELS: Record<Situation, string> = {
  POST_DISCHARGE: 'Recently discharged from hospital',
  LIVING_ALONE: 'Living alone',
  CHRONIC_CONDITION: 'Has a chronic condition',
  MOBILITY_DIFFICULTY: 'Difficulty moving around',
  MEDICATION_DIFFICULTY: 'Difficulty managing medication',
  COGNITIVE_SUPPORT: 'Memory or cognitive support needed',
  CAREGIVER_UNAVAILABLE: 'Current caregiver unavailable',
  COMPANIONSHIP: 'Needs regular companionship',
  NRI_SUPPORT: 'Family lives outside Mumbai / abroad',
  OTHER: 'Something else',
};

export const RELATIONSHIPS = [
  'SON',
  'DAUGHTER',
  'SPOUSE',
  'RELATIVE',
  'GUARDIAN',
  'SELF',
  'OTHER',
] as const;
export const RELATIONSHIP_LABELS: Record<string, string> = {
  SON: 'Son',
  DAUGHTER: 'Daughter',
  SPOUSE: 'Spouse',
  RELATIVE: 'Other relative',
  GUARDIAN: 'Legal guardian',
  SELF: 'Self',
  OTHER: 'Other',
};

export const LIVING_ARRANGEMENTS = [
  'ALONE',
  'WITH_SPOUSE',
  'WITH_FAMILY',
  'WITH_ATTENDANT',
  'ASSISTED_FACILITY',
] as const;
export const LIVING_ARRANGEMENT_LABELS: Record<string, string> = {
  ALONE: 'Lives alone',
  WITH_SPOUSE: 'Lives with spouse',
  WITH_FAMILY: 'Lives with family',
  WITH_ATTENDANT: 'Lives with an attendant',
  ASSISTED_FACILITY: 'In an assisted-living facility',
};

export const MOBILITY_LEVELS = ['INDEPENDENT', 'WALKING_AID', 'WHEELCHAIR', 'BEDRIDDEN'] as const;
export const MOBILITY_LABELS: Record<string, string> = {
  INDEPENDENT: 'Walks independently',
  WALKING_AID: 'Uses a stick or walker',
  WHEELCHAIR: 'Uses a wheelchair',
  BEDRIDDEN: 'Mostly in bed',
};

export const GENDERS = ['FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED'] as const;
export const GENDER_LABELS: Record<string, string> = {
  FEMALE: 'Female',
  MALE: 'Male',
  OTHER: 'Other',
  UNDISCLOSED: 'Prefer not to say',
};

export const CONTACT_CHANNELS = ['PHONE', 'WHATSAPP', 'EMAIL', 'IN_APP'] as const;
export const CONTACT_CHANNEL_LABELS: Record<string, string> = {
  PHONE: 'Phone call',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  IN_APP: 'In-app only',
};

// --- Care delivery ---------------------------------------------------------

export const SENIOR_STATUSES = [
  'PROSPECT',
  'ASSESSMENT',
  'ACTIVE',
  'PAUSED',
  'DISCHARGED',
  'INACTIVE',
] as const;
export const SENIOR_STATUS_LABELS: Record<string, string> = {
  PROSPECT: 'Prospect',
  ASSESSMENT: 'In assessment',
  ACTIVE: 'Active care',
  PAUSED: 'Paused',
  DISCHARGED: 'Discharged',
  INACTIVE: 'Inactive',
};

export const CAREGIVER_STATUSES = [
  'AVAILABLE',
  'ASSIGNED',
  'ON_LEAVE',
  'UNAVAILABLE',
  'UNDER_REVIEW',
  'INACTIVE',
] as const;
export const CAREGIVER_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  ASSIGNED: 'Assigned',
  ON_LEAVE: 'On leave',
  UNAVAILABLE: 'Unavailable',
  UNDER_REVIEW: 'Under review',
  INACTIVE: 'Inactive',
};

export const VERIFICATION_STATUSES = ['UNVERIFIED', 'IN_PROGRESS', 'VERIFIED', 'REJECTED'] as const;
export const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  UNVERIFIED: 'Not yet verified',
  IN_PROGRESS: 'Verification in progress',
  VERIFIED: 'Verification complete',
  REJECTED: 'Verification failed',
};

export const VISIT_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'MISSED',
  'CANCELLED',
] as const;
export const VISIT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  MISSED: 'Missed',
  CANCELLED: 'Cancelled',
};

export const VISIT_KINDS = ['CAREGIVER_SHIFT', 'NURSE_REVIEW', 'ASSESSMENT'] as const;
export const VISIT_KIND_LABELS: Record<string, string> = {
  CAREGIVER_SHIFT: 'Caregiver shift',
  NURSE_REVIEW: 'Nurse review',
  ASSESSMENT: 'Assessment visit',
};

export const VISIT_TASK_STATUSES = ['PENDING', 'DONE', 'REFUSED', 'NOT_APPLICABLE'] as const;

export const CARE_NOTE_TYPES = [
  'DAILY',
  'CONCERN',
  'INCIDENT',
  'REFUSAL',
  'MISSED_TASK',
  'FAMILY_COMMUNICATION',
  'NURSE_REVIEW',
  'CARE_PLAN_CHANGE',
] as const;
export const CARE_NOTE_TYPE_LABELS: Record<string, string> = {
  DAILY: 'Daily note',
  CONCERN: 'Concern',
  INCIDENT: 'Incident note',
  REFUSAL: 'Care refused',
  MISSED_TASK: 'Missed task',
  FAMILY_COMMUNICATION: 'Family communication',
  NURSE_REVIEW: 'Nurse review',
  CARE_PLAN_CHANGE: 'Care-plan change',
};

export const VITAL_TYPES = [
  'BLOOD_PRESSURE',
  'HEART_RATE',
  'TEMPERATURE',
  'BLOOD_GLUCOSE',
  'SPO2',
  'WEIGHT',
] as const;
export type VitalType = (typeof VITAL_TYPES)[number];

export const VITAL_META: Record<
  VitalType,
  { label: string; unit: string; secondaryLabel?: string; decimals: number }
> = {
  BLOOD_PRESSURE: { label: 'Blood pressure', unit: 'mmHg', secondaryLabel: 'Diastolic', decimals: 0 },
  HEART_RATE: { label: 'Heart rate', unit: 'bpm', decimals: 0 },
  TEMPERATURE: { label: 'Temperature', unit: '°C', decimals: 1 },
  BLOOD_GLUCOSE: { label: 'Blood glucose', unit: 'mg/dL', decimals: 0 },
  SPO2: { label: 'Oxygen saturation', unit: '%', decimals: 0 },
  WEIGHT: { label: 'Weight', unit: 'kg', decimals: 1 },
};

/**
 * Default review bands, overridable per senior via VitalThreshold.
 * A reading outside the band is flagged REQUIRES_REVIEW — never "abnormal" or
 * "emergency". Interpretation is a clinician's job, not the platform's.
 */
export const DEFAULT_VITAL_THRESHOLDS: Record<
  VitalType,
  { low?: number; high?: number; lowSecondary?: number; highSecondary?: number }
> = {
  BLOOD_PRESSURE: { low: 90, high: 150, lowSecondary: 55, highSecondary: 95 },
  HEART_RATE: { low: 50, high: 105 },
  TEMPERATURE: { low: 35.5, high: 37.8 },
  BLOOD_GLUCOSE: { low: 70, high: 200 },
  SPO2: { low: 93 },
  WEIGHT: {},
};

export const VITAL_FLAGS = ['NORMAL', 'REQUIRES_REVIEW'] as const;
export const VITAL_FLAG_LABELS: Record<string, string> = {
  NORMAL: 'Within expected range',
  REQUIRES_REVIEW: 'Requires review',
};

export const MEDICATION_REMINDER_STATUSES = ['PENDING', 'CONFIRMED', 'MISSED', 'SKIPPED'] as const;
export const MEDICATION_REMINDER_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  MISSED: 'Missed',
  SKIPPED: 'Skipped',
};

export const MEDICATION_FORMS = [
  'TABLET',
  'CAPSULE',
  'SYRUP',
  'INJECTION',
  'INHALER',
  'DROPS',
  'OTHER',
] as const;

export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'MISSED',
  'RESCHEDULED',
] as const;

export const INCIDENT_TYPES = [
  'FALL',
  'REFUSED_CARE',
  'MEDICATION_MISSED',
  'HEALTH_CONCERN',
  'EQUIPMENT',
  'SAFETY',
  'CAREGIVER_UNAVAILABLE',
  'FAMILY_COMPLAINT',
  'OTHER',
] as const;
export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  FALL: 'Fall or near-fall',
  REFUSED_CARE: 'Care refused',
  MEDICATION_MISSED: 'Medication missed',
  HEALTH_CONCERN: 'Health concern',
  EQUIPMENT: 'Equipment problem',
  SAFETY: 'Home safety',
  CAREGIVER_UNAVAILABLE: 'Caregiver unavailable',
  FAMILY_COMPLAINT: 'Family complaint',
  OTHER: 'Other',
};

export const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const INCIDENT_STATUSES = [
  'OPEN',
  'UNDER_REVIEW',
  'ACTION_TAKEN',
  'RESOLVED',
  'CLOSED',
] as const;
export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'Under review',
  ACTION_TAKEN: 'Action taken',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const ESCALATION_LEVELS = ['NURSE', 'OPS', 'FAMILY', 'EMERGENCY_SERVICES'] as const;
export const ESCALATION_LEVEL_LABELS: Record<string, string> = {
  NURSE: 'Nurse / supervisor',
  OPS: 'Operations team',
  FAMILY: 'Family',
  EMERGENCY_SERVICES: 'Emergency services',
};

export const ESCALATION_TRIGGERS = [
  'INCIDENT_HIGH',
  'INCIDENT_MEDIUM',
  'VITAL_REVIEW',
  'MISSED_VISIT',
  'CAREGIVER_UNAVAILABLE',
  'SENIOR_HELP_REQUEST',
] as const;

export const DOCUMENT_CATEGORIES = [
  'DISCHARGE_SUMMARY',
  'PRESCRIPTION',
  'LAB_REPORT',
  'ID_PROOF',
  'CARE_PLAN',
  'INVOICE',
  'OTHER',
] as const;
export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  DISCHARGE_SUMMARY: 'Discharge summary',
  PRESCRIPTION: 'Prescription',
  LAB_REPORT: 'Lab / diagnostic report',
  ID_PROOF: 'ID document',
  CARE_PLAN: 'Care plan',
  INVOICE: 'Bill or invoice',
  OTHER: 'Other',
};

export const CARE_PLAN_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'UNDER_REVIEW',
  'SUPERSEDED',
  'CLOSED',
] as const;
export const CARE_PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  UNDER_REVIEW: 'Under review',
  SUPERSEDED: 'Superseded',
  CLOSED: 'Closed',
};

export const ASSESSMENT_STATUSES = [
  'REQUESTED',
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const;
export const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'Not available',
};

export const ASSIGNMENT_STATUSES = ['PROPOSED', 'ACTIVE', 'NEEDS_REPLACEMENT', 'ENDED'] as const;
export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  PROPOSED: 'Proposed',
  ACTIVE: 'Active',
  NEEDS_REPLACEMENT: 'Needs replacement',
  ENDED: 'Ended',
};

export const SHIFT_PATTERNS = ['MORNING', 'DAY', 'EVENING', 'NIGHT', 'LIVE_IN', 'VISITS'] as const;
export const SHIFT_PATTERN_LABELS: Record<string, string> = {
  MORNING: 'Morning (7am–1pm)',
  DAY: 'Day (9am–5pm)',
  EVENING: 'Evening (2pm–8pm)',
  NIGHT: 'Night (8pm–8am)',
  LIVE_IN: 'Live-in',
  VISITS: 'Scheduled visits',
};

export const FREQUENCIES = [
  'DAILY',
  'ALTERNATE_DAYS',
  'WEEKLY',
  'FORTNIGHTLY',
  'MONTHLY',
  'ONE_TIME',
  'AS_NEEDED',
] as const;
export const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  ALTERNATE_DAYS: 'Every other day',
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
  ONE_TIME: 'One time',
  AS_NEEDED: 'As needed',
};

export const SERVICE_CLASSES = ['NON_MEDICAL', 'NURSING', 'COORDINATION'] as const;
export const SERVICE_CLASS_LABELS: Record<string, string> = {
  NON_MEDICAL: 'Non-medical support',
  NURSING: 'Nursing service',
  COORDINATION: 'Care coordination',
};

// --- Communication & money -------------------------------------------------

export const NOTIFICATION_TYPES = [
  'VISIT_UPDATE',
  'CAREGIVER_ASSIGNED',
  'APPOINTMENT_REMINDER',
  'PAYMENT_REMINDER',
  'INCIDENT_ALERT',
  'CARE_REPORT',
  'CARE_PLAN_UPDATE',
  'LEAD_NEW',
  'REVIEW_REQUIRED',
  'SYSTEM',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  VISIT_UPDATE: 'Visit updates',
  CAREGIVER_ASSIGNED: 'Caregiver assignment',
  APPOINTMENT_REMINDER: 'Appointment reminders',
  PAYMENT_REMINDER: 'Payment reminders',
  INCIDENT_ALERT: 'Incident alerts',
  CARE_REPORT: 'Care reports',
  CARE_PLAN_UPDATE: 'Care-plan updates',
  LEAD_NEW: 'New enquiries',
  REVIEW_REQUIRED: 'Items needing review',
  SYSTEM: 'Account and system',
};

export const CHANNELS = ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABELS: Record<Channel, string> = {
  IN_APP: 'In app',
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
};

export const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'VOID'] as const;
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Awaiting payment',
  PAID: 'Paid',
  PARTIAL: 'Partly paid',
  OVERDUE: 'Overdue',
  VOID: 'Cancelled',
};

export const PAYMENT_STATUSES = [
  'CREATED',
  'AUTHORISED',
  'CAPTURED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;

export const FEEDBACK_TYPES = ['RATING', 'COMPLAINT', 'CALLBACK_REQUEST', 'SUGGESTION'] as const;
export const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  RATING: 'Rating',
  COMPLAINT: 'Complaint',
  CALLBACK_REQUEST: 'Callback request',
  SUGGESTION: 'Suggestion',
};

// --- Misc ------------------------------------------------------------------

export const PACKAGE_AUDIENCES = [
  'POST_DISCHARGE',
  'CHRONIC',
  'NRI',
  'SAFETY',
  'COMPANION',
] as const;

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

/** Fallback label lookup so an unknown (admin-added) value never renders as blank. */
export function label(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return '—';
  return map[key] ?? titleise(key);
}

export function titleise(key: string): string {
  return key
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
