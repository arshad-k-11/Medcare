import type { Role } from './constants';

/**
 * Capability map — deny by default.
 *
 * A capability answers "may this role perform this kind of action at all". It is
 * deliberately separate from row scoping ("on which patient"), which lives in scope.ts.
 * Both checks run on every protected route: capability first, then scope.
 */
export const CAPABILITIES = {
  // Acquisition
  'lead:read': ['ADMIN', 'OPS_MANAGER'],
  'lead:write': ['ADMIN', 'OPS_MANAGER'],
  'referral:read:all': ['ADMIN', 'OPS_MANAGER', 'NURSE'],
  'referral:read:own': ['REFERRAL_PARTNER'],
  'referral:create': ['ADMIN', 'OPS_MANAGER', 'REFERRAL_PARTNER'],
  'referral:update': ['ADMIN', 'OPS_MANAGER'],
  'crm-task:manage': ['ADMIN', 'OPS_MANAGER'],

  // Patients
  'patient:read': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER', 'FAMILY', 'SENIOR'],
  'patient:create': ['ADMIN', 'OPS_MANAGER', 'FAMILY'],
  'patient:update': ['ADMIN', 'OPS_MANAGER', 'NURSE'],
  'patient:list:all': ['ADMIN', 'OPS_MANAGER', 'NURSE'],

  // Clinical-adjacent
  'assessment:read': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'FAMILY', 'SENIOR'],
  'assessment:write': ['ADMIN', 'OPS_MANAGER', 'NURSE'],
  'care-plan:read': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER', 'FAMILY', 'SENIOR'],
  'care-plan:write': ['ADMIN', 'OPS_MANAGER', 'NURSE'],
  'visit:read': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER', 'FAMILY', 'SENIOR'],
  'visit:schedule': ['ADMIN', 'OPS_MANAGER', 'NURSE'],
  'visit:attend': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER'],
  'care-note:read': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER', 'FAMILY'],
  'care-note:write': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER'],
  'care-note:review': ['ADMIN', 'OPS_MANAGER', 'NURSE'],
  'vital:read': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER', 'FAMILY', 'SENIOR'],
  'vital:write': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER'],
  'medication:read': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER', 'FAMILY', 'SENIOR'],
  'medication:write': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'FAMILY'],
  'medication:confirm': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER'],
  'appointment:read': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER', 'FAMILY', 'SENIOR'],
  'appointment:write': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'FAMILY'],
  'incident:read': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'FAMILY'],
  'incident:create': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER'],
  'incident:update': ['ADMIN', 'OPS_MANAGER', 'NURSE'],
  'escalation:raise': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'CAREGIVER', 'SENIOR', 'FAMILY'],
  'escalation:manage': ['ADMIN', 'OPS_MANAGER', 'NURSE'],
  'document:read': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'FAMILY', 'SENIOR'],
  'document:write': ['ADMIN', 'OPS_MANAGER', 'NURSE', 'FAMILY'],
  'document:delete': ['ADMIN', 'OPS_MANAGER'],

  // Staff
  'caregiver:read': ['ADMIN', 'OPS_MANAGER', 'NURSE'],
  'caregiver:write': ['ADMIN', 'OPS_MANAGER'],
  'assignment:read': ['ADMIN', 'OPS_MANAGER', 'NURSE'],
  'assignment:write': ['ADMIN', 'OPS_MANAGER'],
  'leave:request': ['CAREGIVER', 'NURSE'],
  'leave:decide': ['ADMIN', 'OPS_MANAGER'],

  // Money
  'invoice:read:all': ['ADMIN', 'OPS_MANAGER'],
  'invoice:read:own': ['FAMILY'],
  'invoice:write': ['ADMIN', 'OPS_MANAGER'],
  'payment:create': ['ADMIN', 'OPS_MANAGER', 'FAMILY'],
  'refund:manage': ['ADMIN'],

  // Communication
  'message:participate': [
    'ADMIN',
    'OPS_MANAGER',
    'NURSE',
    'CAREGIVER',
    'FAMILY',
    'SENIOR',
    'REFERRAL_PARTNER',
  ],
  'feedback:create': ['FAMILY', 'SENIOR'],
  'feedback:manage': ['ADMIN', 'OPS_MANAGER'],

  // Platform
  'config:read': ['ADMIN', 'OPS_MANAGER'],
  'config:write': ['ADMIN'],
  'analytics:read': ['ADMIN', 'OPS_MANAGER'],
  'analytics:read:clinical': ['ADMIN', 'OPS_MANAGER', 'NURSE'],
  'analytics:read:partner': ['REFERRAL_PARTNER'],
  'audit:read': ['ADMIN', 'OPS_MANAGER'],
} satisfies Record<string, Role[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (CAPABILITIES[capability] as readonly Role[]).includes(role);
}

export function canAny(role: Role | null | undefined, capabilities: Capability[]): boolean {
  return capabilities.some((capability) => can(role, capability));
}
