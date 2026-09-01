import type { Role } from '@/lib/constants';

/**
 * Navigation per role.
 *
 * Deliberately short for every role. An ops dashboard can afford twelve items; a
 * caregiver's phone cannot, and a senior's home screen must not. The `mobileTabs` subset
 * is what appears in the bottom bar on small screens for the two mobile-first roles.
 */

export type NavItem = {
  href: string;
  label: string;
  /** Lucide icon name, resolved in the nav component. */
  icon: string;
  /** Shown in the mobile tab bar. */
  mobile?: boolean;
  /** Matched as a prefix, so child routes keep the parent highlighted. */
  match?: string;
};

export const NAV: Record<Role, NavItem[]> = {
  FAMILY: [
    { href: '/app/family', label: 'Today', icon: 'Home', mobile: true },
    { href: '/app/family/updates', label: 'Care updates', icon: 'Activity', mobile: true },
    { href: '/app/family/appointments', label: 'Appointments', icon: 'CalendarDays', mobile: true },
    { href: '/app/family/documents', label: 'Documents', icon: 'FileText' },
    { href: '/app/family/messages', label: 'Messages', icon: 'MessageSquare', mobile: true },
    { href: '/app/family/billing', label: 'Billing', icon: 'Receipt' },
    { href: '/app/family/support', label: 'Get help', icon: 'LifeBuoy' },
  ],

  SENIOR: [
    { href: '/app/senior', label: "Today's care", icon: 'Home', mobile: true },
    { href: '/app/senior/caregiver', label: 'My caregiver', icon: 'UserRound', mobile: true },
    { href: '/app/senior/appointments', label: 'Appointments', icon: 'CalendarDays', mobile: true },
    { href: '/app/senior/help', label: 'Help', icon: 'LifeBuoy', mobile: true },
  ],

  CAREGIVER: [
    { href: '/app/caregiver', label: 'Today', icon: 'Home', mobile: true },
    { href: '/app/caregiver/schedule', label: 'Schedule', icon: 'CalendarDays', mobile: true },
    { href: '/app/caregiver/patients', label: 'My patients', icon: 'UsersRound', mobile: true },
    { href: '/app/caregiver/leave', label: 'Leave', icon: 'CalendarOff' },
    { href: '/app/caregiver/profile', label: 'My profile', icon: 'IdCard', mobile: true },
  ],

  NURSE: [
    { href: '/app/nurse', label: 'Overview', icon: 'LayoutDashboard' },
    { href: '/app/nurse/reviews', label: 'Needs review', icon: 'ClipboardCheck' },
    { href: '/app/nurse/patients', label: 'Patients', icon: 'UsersRound', match: '/app/nurse/patients' },
    { href: '/app/nurse/visits', label: 'Visits', icon: 'CalendarDays' },
    { href: '/app/nurse/escalations', label: 'Escalations', icon: 'TriangleAlert' },
  ],

  ADMIN: ADMIN_NAV(),
  OPS_MANAGER: ADMIN_NAV(),

  REFERRAL_PARTNER: [
    { href: '/app/partner', label: 'Overview', icon: 'LayoutDashboard' },
    { href: '/app/partner/refer', label: 'Refer a patient', icon: 'UserPlus' },
    { href: '/app/partner/referrals', label: 'My referrals', icon: 'ClipboardList', match: '/app/partner/referrals' },
    { href: '/app/partner/reports', label: 'Reports', icon: 'ChartNoAxesColumn' },
  ],
};

function ADMIN_NAV(): NavItem[] {
  return [
    { href: '/app/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
    { href: '/app/admin/leads', label: 'Leads', icon: 'Inbox', match: '/app/admin/leads' },
    { href: '/app/admin/patients', label: 'Patients', icon: 'UsersRound', match: '/app/admin/patients' },
    { href: '/app/admin/caregivers', label: 'Caregivers', icon: 'HeartHandshake', match: '/app/admin/caregivers' },
    { href: '/app/admin/assignments', label: 'Assignments', icon: 'RefreshCcw', match: '/app/admin/assignments' },
    { href: '/app/admin/visits', label: 'Visits', icon: 'CalendarDays' },
    { href: '/app/admin/incidents', label: 'Incidents', icon: 'TriangleAlert' },
    { href: '/app/admin/referrals', label: 'Referrals', icon: 'Share2' },
    { href: '/app/admin/billing', label: 'Billing', icon: 'Receipt', match: '/app/admin/billing' },
    { href: '/app/admin/analytics', label: 'Analytics', icon: 'ChartNoAxesColumn' },
    { href: '/app/admin/feedback', label: 'Feedback', icon: 'MessageSquare' },
    { href: '/app/admin/settings', label: 'Configuration', icon: 'Settings', match: '/app/admin/settings' },
  ];
}

/** Which `data-surface` the app shell sets, driving target size and base font size. */
export function surfaceFor(role: Role): 'senior' | 'caregiver' | 'default' {
  if (role === 'SENIOR') return 'senior';
  if (role === 'CAREGIVER') return 'caregiver';
  return 'default';
}

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.match) return pathname === item.match || pathname.startsWith(`${item.match}/`);
  return pathname === item.href;
}
