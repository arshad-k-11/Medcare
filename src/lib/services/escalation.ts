import type { Channel } from '../constants';

/**
 * Escalation routing.
 *
 * The chain is caregiver → nurse/supervisor → family → emergency services, and the
 * platform never skips to the last step on its own: calling emergency services is a
 * human decision, and the app's job is to put the right person in front of it fast.
 * Rules are stored in EscalationRule so ops can retune them; this module resolves a
 * trigger against those rows and falls back to the safest built-in route.
 */

export type EscalationRuleRow = {
  trigger: string;
  notifyLevel: string;
  notifyFamily: boolean;
  withinMinutes: number;
  instructions: string;
  isActive: boolean;
};

export type EscalationPlan = {
  level: 'NURSE' | 'OPS' | 'FAMILY' | 'EMERGENCY_SERVICES';
  notifyFamily: boolean;
  withinMinutes: number;
  instructions: string;
  channels: Channel[];
};

const BUILT_IN: Record<string, EscalationPlan> = {
  INCIDENT_HIGH: {
    level: 'NURSE',
    notifyFamily: true,
    withinMinutes: 15,
    instructions:
      'Nurse supervisor reviews immediately and calls the caregiver. Family is informed with the facts recorded, not an interpretation. If the situation is medically urgent, the caregiver is instructed to call emergency services first and the platform second.',
    channels: ['IN_APP', 'SMS'],
  },
  INCIDENT_MEDIUM: {
    level: 'NURSE',
    notifyFamily: true,
    withinMinutes: 60,
    instructions: 'Nurse supervisor reviews within the hour and decides whether a visit is needed.',
    channels: ['IN_APP'],
  },
  VITAL_REVIEW: {
    level: 'NURSE',
    notifyFamily: false,
    withinMinutes: 120,
    instructions:
      'A reading outside the configured range is queued for nurse review. No clinical conclusion is drawn or communicated until a nurse has looked at it.',
    channels: ['IN_APP'],
  },
  MISSED_VISIT: {
    level: 'OPS',
    notifyFamily: true,
    withinMinutes: 30,
    instructions:
      'Operations confirms whether the caregiver is delayed or unavailable, arranges cover, and tells the family what is happening and when.',
    channels: ['IN_APP', 'SMS'],
  },
  CAREGIVER_UNAVAILABLE: {
    level: 'OPS',
    notifyFamily: true,
    withinMinutes: 60,
    instructions:
      'Operations runs the replacement match, assigns cover and informs the family who is coming and why the change happened.',
    channels: ['IN_APP', 'WHATSAPP'],
  },
  SENIOR_HELP_REQUEST: {
    level: 'OPS',
    notifyFamily: true,
    withinMinutes: 10,
    instructions:
      'A senior asking for help is called back promptly. This is a support request route, not an emergency line — the app tells the senior to call emergency services directly if they are unwell.',
    channels: ['IN_APP', 'SMS'],
  },
};

export function resolveEscalation(trigger: string, rules: EscalationRuleRow[]): EscalationPlan {
  const rule = rules.find((r) => r.trigger === trigger && r.isActive);
  if (rule) {
    return {
      level: rule.notifyLevel as EscalationPlan['level'],
      notifyFamily: rule.notifyFamily,
      withinMinutes: rule.withinMinutes,
      instructions: rule.instructions,
      channels: rule.notifyLevel === 'NURSE' ? ['IN_APP'] : ['IN_APP', 'SMS'],
    };
  }
  return (
    BUILT_IN[trigger] ?? {
      level: 'OPS',
      notifyFamily: false,
      withinMinutes: 120,
      instructions: 'Reviewed by the operations team.',
      channels: ['IN_APP'],
    }
  );
}

export function severityToTrigger(severity: string): string {
  if (severity === 'HIGH') return 'INCIDENT_HIGH';
  if (severity === 'MEDIUM') return 'INCIDENT_MEDIUM';
  return 'INCIDENT_MEDIUM';
}
