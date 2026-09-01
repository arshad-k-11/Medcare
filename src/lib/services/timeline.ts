import { CARE_NOTE_TYPE_LABELS, VITAL_FLAG_LABELS, label } from '../constants';
import { formatVital } from '../format';

/**
 * Builds the unified care timeline a family sees.
 *
 * The timeline is the product for an NRI family: it is the answer to "what happened
 * today". It merges events from six tables into one ordered stream, and it respects
 * visibility — a note marked internal never appears in a family's feed.
 */

export type TimelineKind =
  | 'VISIT_START'
  | 'VISIT_END'
  | 'VISIT_MISSED'
  | 'TASK'
  | 'NOTE'
  | 'VITAL'
  | 'MEDICATION'
  | 'APPOINTMENT'
  | 'INCIDENT'
  | 'CARE_PLAN'
  | 'ASSIGNMENT';

export type TimelineEntry = {
  id: string;
  at: Date;
  kind: TimelineKind;
  title: string;
  detail?: string | null;
  actor?: string | null;
  tone: 'neutral' | 'positive' | 'attention' | 'critical';
  href?: string | null;
};

export type TimelineSources = {
  visits: {
    id: string;
    kind: string;
    status: string;
    scheduledStart: Date;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    summary: string | null;
    caregiver: { user: { name: string } } | null;
    nurse: { user: { name: string } } | null;
    tasks: { label: string; status: string; completedAt: Date | null }[];
  }[];
  notes: {
    id: string;
    type: string;
    body: string;
    createdAt: Date;
    authorRole: string;
    author: { name: string };
  }[];
  vitals: {
    id: string;
    type: string;
    valueNumber: number;
    valueSecondary: number | null;
    measuredAt: Date;
    flag: string;
    recordedBy: { name: string };
  }[];
  reminders: {
    id: string;
    status: string;
    dueAt: Date;
    actedAt: Date | null;
    medication: { name: string };
  }[];
  appointments: {
    id: string;
    title: string;
    scheduledAt: Date;
    status: string;
    doctorName: string | null;
    facility: string | null;
  }[];
  incidents: {
    id: string;
    reference: string;
    title: string;
    severity: string;
    status: string;
    reportedAt: Date;
    familyNotifiedAt: Date | null;
  }[];
  planVersions?: {
    id: string;
    version: number;
    changeNote: string | null;
    createdAt: Date;
  }[];
  assignments?: {
    id: string;
    startDate: Date;
    role: string;
    replacementReason: string | null;
    caregiver: { user: { name: string } };
  }[];
};

export function buildTimeline(sources: TimelineSources): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const visit of sources.visits) {
    const who = visit.caregiver?.user.name ?? visit.nurse?.user.name ?? 'Care team';
    if (visit.checkInAt) {
      entries.push({
        id: `${visit.id}-in`,
        at: visit.checkInAt,
        kind: 'VISIT_START',
        title: `${who} arrived`,
        detail: visit.kind === 'NURSE_REVIEW' ? 'Nurse review visit' : null,
        actor: who,
        tone: 'positive',
      });
    }
    if (visit.checkOutAt) {
      const done = visit.tasks.filter((t) => t.status === 'DONE').length;
      entries.push({
        id: `${visit.id}-out`,
        at: visit.checkOutAt,
        kind: 'VISIT_END',
        title: `${who} completed the visit`,
        detail:
          visit.tasks.length > 0
            ? `${done} of ${visit.tasks.length} planned tasks completed${visit.summary ? ` — ${visit.summary}` : ''}`
            : visit.summary,
        actor: who,
        tone: 'positive',
      });
    }
    if (visit.status === 'MISSED') {
      entries.push({
        id: `${visit.id}-missed`,
        at: visit.scheduledStart,
        kind: 'VISIT_MISSED',
        title: 'Scheduled visit was missed',
        detail: 'Our operations team follows up on every missed visit and arranges cover.',
        tone: 'critical',
      });
    }
    for (const task of visit.tasks) {
      if (task.status === 'DONE' && task.completedAt) {
        entries.push({
          id: `${visit.id}-${task.label}-done`,
          at: task.completedAt,
          kind: 'TASK',
          title: `${task.label} completed`,
          actor: who,
          tone: 'positive',
        });
      } else if (task.status === 'REFUSED') {
        entries.push({
          id: `${visit.id}-${task.label}-refused`,
          at: visit.checkOutAt ?? visit.scheduledStart,
          kind: 'TASK',
          title: `${task.label} — declined`,
          detail: 'Recorded by the caregiver and passed to the nurse for review.',
          actor: who,
          tone: 'attention',
        });
      }
    }
  }

  for (const note of sources.notes) {
    entries.push({
      id: note.id,
      at: note.createdAt,
      kind: 'NOTE',
      title: label(CARE_NOTE_TYPE_LABELS, note.type),
      detail: note.body,
      actor: note.author.name,
      tone: ['CONCERN', 'REFUSAL', 'MISSED_TASK'].includes(note.type) ? 'attention' : 'neutral',
    });
  }

  for (const vital of sources.vitals) {
    entries.push({
      id: vital.id,
      at: vital.measuredAt,
      kind: 'VITAL',
      title: `${formatVital(vital.type, vital.valueNumber, vital.valueSecondary)} recorded`,
      detail:
        vital.flag === 'REQUIRES_REVIEW'
          ? label(VITAL_FLAG_LABELS, vital.flag)
          : null,
      actor: vital.recordedBy.name,
      tone: vital.flag === 'REQUIRES_REVIEW' ? 'attention' : 'neutral',
    });
  }

  for (const reminder of sources.reminders) {
    if (reminder.status === 'CONFIRMED') {
      entries.push({
        id: reminder.id,
        at: reminder.actedAt ?? reminder.dueAt,
        kind: 'MEDICATION',
        title: `Medication reminder completed — ${reminder.medication.name}`,
        tone: 'positive',
      });
    } else if (reminder.status === 'MISSED') {
      entries.push({
        id: reminder.id,
        at: reminder.dueAt,
        kind: 'MEDICATION',
        title: `Medication reminder missed — ${reminder.medication.name}`,
        detail: 'Flagged to the care team.',
        tone: 'attention',
      });
    }
  }

  for (const appointment of sources.appointments) {
    entries.push({
      id: appointment.id,
      at: appointment.scheduledAt,
      kind: 'APPOINTMENT',
      title: appointment.title,
      detail: [appointment.doctorName, appointment.facility].filter(Boolean).join(' · ') || null,
      tone: appointment.status === 'MISSED' ? 'attention' : 'neutral',
    });
  }

  for (const incident of sources.incidents) {
    entries.push({
      id: incident.id,
      at: incident.reportedAt,
      kind: 'INCIDENT',
      title: incident.title,
      detail: `Reference ${incident.reference} · ${incident.status.replace('_', ' ').toLowerCase()}`,
      tone: incident.severity === 'HIGH' ? 'critical' : 'attention',
    });
  }

  for (const version of sources.planVersions ?? []) {
    entries.push({
      id: version.id,
      at: version.createdAt,
      kind: 'CARE_PLAN',
      title: `Care plan updated to version ${version.version}`,
      detail: version.changeNote,
      tone: 'neutral',
    });
  }

  for (const assignment of sources.assignments ?? []) {
    entries.push({
      id: assignment.id,
      at: assignment.startDate,
      kind: 'ASSIGNMENT',
      title: `${assignment.caregiver.user.name} assigned as ${assignment.role.toLowerCase()} caregiver`,
      detail: assignment.replacementReason
        ? `Replacement arranged — ${assignment.replacementReason}`
        : null,
      tone: 'neutral',
    });
  }

  return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** Groups a timeline into day buckets for rendering. */
export function groupByDay(entries: TimelineEntry[]): { day: string; entries: TimelineEntry[] }[] {
  const buckets = new Map<string, TimelineEntry[]>();
  for (const entry of entries) {
    const key = entry.at.toISOString().slice(0, 10);
    const list = buckets.get(key);
    if (list) list.push(entry);
    else buckets.set(key, [entry]);
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, dayEntries]) => ({ day, entries: dayEntries }));
}
