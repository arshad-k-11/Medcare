import type { Tone } from '@/components/ui';
import {
  ASSESSMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_LABELS,
  CAREGIVER_STATUS_LABELS,
  CARE_PLAN_STATUS_LABELS,
  INCIDENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  LEAD_STATUS_LABELS,
  MEDICATION_REMINDER_LABELS,
  REFERRAL_STATUS_LABELS,
  SENIOR_STATUS_LABELS,
  SEVERITY_LABELS,
  URGENCY_LABELS,
  VERIFICATION_STATUS_LABELS,
  VISIT_STATUS_LABELS,
  VITAL_FLAG_LABELS,
  label,
} from './constants';

/**
 * Single source of truth for "what colour and what words does this status get".
 *
 * Keeping the mapping here rather than inline at each call site is what stops the same
 * status appearing green on one screen and grey on another — which, on a care product,
 * reads as the system disagreeing with itself.
 */

export type StatusDisplay = { tone: Tone; label: string };

function display(
  map: Record<string, string>,
  tones: Record<string, Tone>,
  value: string | null | undefined,
): StatusDisplay {
  return { tone: (value && tones[value]) || 'neutral', label: label(map, value) };
}

export function visitStatus(value: string | null | undefined): StatusDisplay {
  return display(
    VISIT_STATUS_LABELS,
    {
      SCHEDULED: 'info',
      IN_PROGRESS: 'brand',
      COMPLETED: 'success',
      MISSED: 'danger',
      CANCELLED: 'neutral',
    },
    value,
  );
}

export function leadStatus(value: string | null | undefined): StatusDisplay {
  return display(
    LEAD_STATUS_LABELS,
    {
      NEW: 'info',
      CONTACTED: 'brand',
      QUALIFIED: 'brand',
      ASSESSMENT_BOOKED: 'warning',
      ASSESSMENT_COMPLETED: 'warning',
      PROPOSAL_SENT: 'warning',
      WON: 'success',
      LOST: 'neutral',
    },
    value,
  );
}

export function urgency(value: string | null | undefined): StatusDisplay {
  return display(
    URGENCY_LABELS,
    {
      TODAY: 'danger',
      WITHIN_24H: 'warning',
      FEW_DAYS: 'info',
      WITHIN_WEEK: 'neutral',
      EXPLORING: 'neutral',
    },
    value,
  );
}

export function seniorStatus(value: string | null | undefined): StatusDisplay {
  return display(
    SENIOR_STATUS_LABELS,
    {
      PROSPECT: 'neutral',
      ASSESSMENT: 'warning',
      ACTIVE: 'success',
      PAUSED: 'warning',
      DISCHARGED: 'neutral',
      INACTIVE: 'neutral',
    },
    value,
  );
}

export function caregiverStatus(value: string | null | undefined): StatusDisplay {
  return display(
    CAREGIVER_STATUS_LABELS,
    {
      AVAILABLE: 'success',
      ASSIGNED: 'brand',
      ON_LEAVE: 'warning',
      UNAVAILABLE: 'warning',
      UNDER_REVIEW: 'danger',
      INACTIVE: 'neutral',
    },
    value,
  );
}

/**
 * Verification deliberately shows UNVERIFIED as a warning, not a neutral shrug: the
 * business must never let the UI imply a check has happened when it has not.
 */
export function verificationStatus(value: string | null | undefined): StatusDisplay {
  return display(
    VERIFICATION_STATUS_LABELS,
    {
      VERIFIED: 'success',
      IN_PROGRESS: 'warning',
      UNVERIFIED: 'warning',
      REJECTED: 'danger',
    },
    value,
  );
}

export function assignmentStatus(value: string | null | undefined): StatusDisplay {
  return display(
    ASSIGNMENT_STATUS_LABELS,
    {
      PROPOSED: 'info',
      ACTIVE: 'success',
      NEEDS_REPLACEMENT: 'danger',
      ENDED: 'neutral',
    },
    value,
  );
}

export function incidentStatus(value: string | null | undefined): StatusDisplay {
  return display(
    INCIDENT_STATUS_LABELS,
    {
      OPEN: 'danger',
      UNDER_REVIEW: 'warning',
      ACTION_TAKEN: 'info',
      RESOLVED: 'success',
      CLOSED: 'neutral',
    },
    value,
  );
}

export function severity(value: string | null | undefined): StatusDisplay {
  return display(SEVERITY_LABELS, { LOW: 'neutral', MEDIUM: 'warning', HIGH: 'danger' }, value);
}

export function invoiceStatus(value: string | null | undefined): StatusDisplay {
  return display(
    INVOICE_STATUS_LABELS,
    {
      DRAFT: 'neutral',
      SENT: 'info',
      PAID: 'success',
      PARTIAL: 'warning',
      OVERDUE: 'danger',
      VOID: 'neutral',
    },
    value,
  );
}

export function carePlanStatus(value: string | null | undefined): StatusDisplay {
  return display(
    CARE_PLAN_STATUS_LABELS,
    {
      DRAFT: 'neutral',
      ACTIVE: 'success',
      UNDER_REVIEW: 'warning',
      SUPERSEDED: 'neutral',
      CLOSED: 'neutral',
    },
    value,
  );
}

export function assessmentStatus(value: string | null | undefined): StatusDisplay {
  return display(
    ASSESSMENT_STATUS_LABELS,
    {
      REQUESTED: 'info',
      SCHEDULED: 'warning',
      COMPLETED: 'success',
      CANCELLED: 'neutral',
      NO_SHOW: 'danger',
    },
    value,
  );
}

export function referralStatus(value: string | null | undefined): StatusDisplay {
  return display(
    REFERRAL_STATUS_LABELS,
    {
      SUBMITTED: 'info',
      CONTACTED: 'brand',
      ASSESSMENT: 'warning',
      CONVERTED: 'success',
      DECLINED: 'neutral',
      LOST: 'neutral',
    },
    value,
  );
}

/**
 * A flagged reading is a warning, never a danger: the platform is saying "a nurse should
 * look at this", not "this is an emergency".
 */
export function vitalFlag(value: string | null | undefined): StatusDisplay {
  return display(VITAL_FLAG_LABELS, { NORMAL: 'success', REQUIRES_REVIEW: 'warning' }, value);
}

export function reminderStatus(value: string | null | undefined): StatusDisplay {
  return display(
    MEDICATION_REMINDER_LABELS,
    { PENDING: 'neutral', CONFIRMED: 'success', MISSED: 'danger', SKIPPED: 'warning' },
    value,
  );
}
