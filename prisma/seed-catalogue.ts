/**
 * Configurable business catalogue: service areas, services, packages, task templates,
 * assessment questions, escalation rules, notification templates, lead sources and
 * default vitals review bands.
 *
 * Everything in here is data the admin console can edit. It is seeded rather than
 * hard-coded precisely because the business will change it without an engineer.
 */
import type { PrismaClient } from '@prisma/client';
import { at, list } from './seed-utils';

export type CatalogueIds = {
  areas: Record<string, string>;
  services: Record<string, string>;
  packages: Record<string, string>;
  taskTemplates: Record<string, string>;
  leadSources: Record<string, string>;
};

export async function seedCatalogue(prisma: PrismaClient): Promise<CatalogueIds> {
  // ---------------------------------------------------------------------
  // Service areas. The business does NOT claim to serve all of Mumbai —
  // two areas are seeded inactive on purpose.
  // ---------------------------------------------------------------------
  const areaRows = [
    { name: 'Andheri West', zone: 'MUMBAI', pincodes: ['400053', '400058', '400061'], isActive: true },
    { name: 'Andheri East', zone: 'MUMBAI', pincodes: ['400069', '400093', '400099'], isActive: true },
    { name: 'Bandra West', zone: 'MUMBAI', pincodes: ['400050', '400051'], isActive: true },
    { name: 'Khar / Santacruz', zone: 'MUMBAI', pincodes: ['400052', '400054', '400055'], isActive: true },
    { name: 'Goregaon', zone: 'MUMBAI', pincodes: ['400062', '400063', '400090'], isActive: true },
    { name: 'Malad', zone: 'MUMBAI', pincodes: ['400064', '400095', '400097'], isActive: true },
    { name: 'Kandivali', zone: 'MUMBAI', pincodes: ['400067', '400101'], isActive: true },
    { name: 'Borivali', zone: 'MUMBAI', pincodes: ['400066', '400091', '400092'], isActive: true },
    { name: 'Powai', zone: 'MUMBAI', pincodes: ['400076', '400072'], isActive: true },
    { name: 'Thane West', zone: 'THANE', pincodes: ['400601', '400602', '400610'], isActive: true },
    {
      name: 'Vashi / Navi Mumbai',
      zone: 'NAVI_MUMBAI',
      pincodes: ['400703', '400705'],
      isActive: false,
      notes: 'Not yet staffed — enquiries from here are waitlisted, not accepted.',
    },
    {
      name: 'South Mumbai',
      zone: 'MUMBAI',
      pincodes: ['400001', '400005', '400026'],
      isActive: false,
      notes: 'Planned for the next expansion phase.',
    },
  ];
  const areas: Record<string, string> = {};
  for (const [index, row] of areaRows.entries()) {
    const created = await prisma.serviceArea.create({
      data: {
        name: row.name,
        zone: row.zone,
        pincodes: list(row.pincodes),
        isActive: row.isActive,
        notes: row.notes ?? null,
        sortOrder: index,
      },
    });
    areas[row.name] = created.id;
  }

  // ---------------------------------------------------------------------
  // Services. Rates are indicative and maintained by ops; the public site
  // shows them only as "starting from".
  // ---------------------------------------------------------------------
  const serviceRows = [
    {
      slug: 'home-care-assessment',
      name: 'Home care assessment',
      category: 'ASSESSMENT',
      serviceClass: 'COORDINATION',
      description:
        'A nurse or care coordinator visits the home, reviews the current situation, discharge papers and medication list, and produces a written care plan.',
      unit: 'ONE_TIME',
      basePricePaise: 150000,
      requiredSkills: [],
    },
    {
      slug: 'attendant-support',
      name: 'Caregiver / attendant support',
      category: 'ATTENDANT',
      serviceClass: 'NON_MEDICAL',
      description:
        'Non-medical support at home: mobility help, meal assistance, personal hygiene support, companionship and medication reminders.',
      unit: 'HOUR',
      basePricePaise: 22000,
      requiredSkills: ['mobility-support', 'personal-care'],
    },
    {
      slug: 'attendant-12h-shift',
      name: 'Caregiver 12-hour shift',
      category: 'ATTENDANT',
      serviceClass: 'NON_MEDICAL',
      description: 'A single 12-hour attendant shift, day or night.',
      unit: 'SHIFT',
      basePricePaise: 190000,
      requiredSkills: ['mobility-support', 'personal-care'],
    },
    {
      slug: 'nurse-review-visit',
      name: 'Nurse review visit',
      category: 'NURSING',
      serviceClass: 'NURSING',
      description:
        'A qualified nurse reviews the care plan, checks recorded vitals and caregiver notes, and updates the plan or escalates as needed.',
      unit: 'VISIT',
      basePricePaise: 120000,
      requiredSkills: [],
    },
    {
      slug: 'care-coordination',
      name: 'Care coordination',
      category: 'COORDINATION',
      serviceClass: 'COORDINATION',
      description:
        'Scheduling, caregiver management, appointment coordination and structured family updates.',
      unit: 'MONTH',
      basePricePaise: 350000,
      requiredSkills: [],
    },
    {
      slug: 'medication-reminder-support',
      name: 'Medication reminder support',
      category: 'MONITORING',
      serviceClass: 'NON_MEDICAL',
      description:
        'Scheduled reminders and confirmation logging against a medication list entered by the family or a nurse. We do not prescribe or change medication.',
      unit: 'MONTH',
      basePricePaise: 120000,
      requiredSkills: ['medication-reminders'],
    },
    {
      slug: 'vitals-monitoring',
      name: 'Basic vitals tracking',
      category: 'MONITORING',
      serviceClass: 'NON_MEDICAL',
      description:
        'Recording blood pressure, pulse, temperature, glucose, oxygen saturation or weight at agreed intervals, for review by a nurse.',
      unit: 'MONTH',
      basePricePaise: 90000,
      requiredSkills: ['vitals-recording'],
    },
    {
      slug: 'appointment-escort',
      name: 'Appointment escort',
      category: 'COORDINATION',
      serviceClass: 'NON_MEDICAL',
      description:
        'A caregiver accompanies the senior to a clinic or hospital appointment, including transport coordination.',
      unit: 'VISIT',
      basePricePaise: 140000,
      requiredSkills: ['appointment-escort'],
    },
    {
      slug: 'home-safety-review',
      name: 'Home safety & fall-risk review',
      category: 'ASSESSMENT',
      serviceClass: 'COORDINATION',
      description:
        'A room-by-room review of trip hazards, lighting, bathroom safety and mobility routes, with a written list of recommendations.',
      unit: 'ONE_TIME',
      basePricePaise: 200000,
      requiredSkills: [],
    },
    {
      slug: 'companion-visits',
      name: 'Companion visits',
      category: 'COMPANION',
      serviceClass: 'NON_MEDICAL',
      description:
        'Regular conversation, walks, reading and structured activity for seniors who are largely alone during the day.',
      unit: 'VISIT',
      basePricePaise: 80000,
      requiredSkills: ['companion-care'],
    },
    {
      slug: 'family-reporting',
      name: 'Family care reporting',
      category: 'COORDINATION',
      serviceClass: 'COORDINATION',
      description:
        'A written weekly summary and a monthly care report covering visits, notes, vitals, appointments and any incidents.',
      unit: 'MONTH',
      basePricePaise: 100000,
      requiredSkills: [],
    },
    {
      slug: 'dementia-companion-care',
      name: 'Dementia companion care',
      category: 'COMPANION',
      serviceClass: 'NON_MEDICAL',
      description:
        'Routine-led companionship for seniors with memory difficulty, delivered by caregivers who have completed our dementia-awareness training.',
      unit: 'SHIFT',
      basePricePaise: 210000,
      requiredSkills: ['dementia-care', 'companion-care'],
    },
  ];
  const services: Record<string, string> = {};
  for (const [index, row] of serviceRows.entries()) {
    const created = await prisma.service.create({
      data: {
        slug: row.slug,
        name: row.name,
        category: row.category,
        serviceClass: row.serviceClass,
        description: row.description,
        unit: row.unit,
        basePricePaise: row.basePricePaise,
        requiredSkills: list(row.requiredSkills),
        sortOrder: index,
      },
    });
    services[row.slug] = created.id;
  }

  // ---------------------------------------------------------------------
  // Packages. The business sells outcomes, not caregiver hours — so each
  // package carries an explicit outcomes list AND an explicit scope limit.
  // ---------------------------------------------------------------------
  const packageRows = [
    {
      slug: '14-day-post-discharge-recovery',
      name: '14-Day Post-Discharge Recovery',
      tagline: 'Structured support through the two weeks that decide the recovery',
      audience: 'POST_DISCHARGE',
      durationLabel: '14 days',
      billingCycle: 'ONE_TIME',
      priceFromPaise: 2800000,
      isFeatured: true,
      summary:
        'The fortnight after a hospital stay is when readmissions happen. This plan puts an assessment, a written care plan, daily attendant support, nurse review and family reporting around that window.',
      details:
        'A nurse or care coordinator visits within 24 hours of enrolment and reviews the discharge summary, the medication list and the home itself. We produce a written care plan, assign a caregiver who already works in your area, and set up medication reminders and any vitals tracking the plan calls for.\n\nA nurse reviews the caregiver notes and recorded readings twice during the fortnight and updates the plan. Your family receives a daily timeline and a written summary at the end of the plan, along with a recommendation on whether ongoing support is needed.',
      outcomes: [
        'Home assessment and written care plan within 24 hours',
        'A named caregiver, with cover arranged if they become unavailable',
        'Medication reminders logged and confirmed each day',
        'Two nurse reviews during the fortnight',
        'Daily family updates and an end-of-plan written summary',
        'A defined escalation path if something changes',
      ],
      notIncluded: [
        'Medical treatment, procedures or prescriptions',
        'Emergency medical response — call emergency services first',
        'Doctor consultations (we coordinate them, we do not provide them)',
        'Hospital equipment rental',
      ],
      services: [
        { slug: 'home-care-assessment', quantity: 1, frequency: 'ONE_TIME' },
        { slug: 'attendant-support', quantity: 6, frequency: 'DAILY' },
        { slug: 'nurse-review-visit', quantity: 2, frequency: 'FORTNIGHTLY' },
        { slug: 'medication-reminder-support', quantity: 1, frequency: 'DAILY' },
        { slug: 'vitals-monitoring', quantity: 1, frequency: 'DAILY' },
        { slug: 'family-reporting', quantity: 1, frequency: 'DAILY' },
      ],
    },
    {
      slug: 'monthly-chronic-care-support',
      name: 'Monthly Chronic Care Support',
      tagline: 'Steady, supervised support for one to three ongoing conditions',
      audience: 'CHRONIC',
      durationLabel: 'Monthly',
      billingCycle: 'MONTHLY',
      priceFromPaise: 1800000,
      isFeatured: true,
      summary:
        'For seniors managing ongoing conditions at home: regular check-ins, medication adherence support, basic vitals tracking and nurse supervision, with a monthly report for the family.',
      details:
        'We start with a home assessment and a written care plan built around the conditions being managed and what the family can realistically cover themselves. A caregiver attends on the agreed schedule; a nurse reviews the notes and readings each month and adjusts the plan.\n\nAppointments are coordinated rather than left to chance, and the family gets a weekly summary plus a monthly care report. The plan is reviewed formally every month, so it changes as the situation does.',
      outcomes: [
        'Written care plan reviewed monthly by a nurse',
        'Scheduled caregiver visits on an agreed pattern',
        'Medication reminders with confirmation logging',
        'Basic vitals tracking, with readings flagged for nurse review',
        'Appointment coordination',
        'Weekly summaries and a monthly care report',
      ],
      notIncluded: [
        'Prescriptions or changes to medication',
        'Diagnosis or clinical interpretation outside a nurse review',
        'Emergency medical response',
        'Physiotherapy sessions (coordinated on request, billed separately)',
      ],
      services: [
        { slug: 'home-care-assessment', quantity: 1, frequency: 'ONE_TIME' },
        { slug: 'attendant-support', quantity: 4, frequency: 'ALTERNATE_DAYS' },
        { slug: 'nurse-review-visit', quantity: 1, frequency: 'MONTHLY' },
        { slug: 'medication-reminder-support', quantity: 1, frequency: 'DAILY' },
        { slug: 'vitals-monitoring', quantity: 1, frequency: 'WEEKLY' },
        { slug: 'family-reporting', quantity: 1, frequency: 'WEEKLY' },
      ],
    },
    {
      slug: 'nri-parent-care-coordination',
      name: 'NRI Parent Care Coordination',
      tagline: 'One coordinator, scheduled visits, and a clear picture from wherever you are',
      audience: 'NRI',
      durationLabel: 'Monthly',
      billingCycle: 'MONTHLY',
      priceFromPaise: 2200000,
      isFeatured: true,
      summary:
        'Built for families outside Mumbai. A named care coordinator, scheduled home visits, appointment management and reporting written for someone who cannot drop in and see for themselves.',
      details:
        "You get one named coordinator who knows your parent's situation, so you are not re-explaining it to a call centre. Home visits happen on a fixed schedule and each one produces a timeline entry you can read the same day, in your own timezone.\n\nThe coordinator manages appointments end to end — booking, escort, and a written outcome — and handles caregiver changes so a caregiver falling sick does not become your problem at 2am in another country. You receive a weekly summary, a monthly care report, and a direct line for anything urgent.",
      outcomes: [
        'A named care coordinator, not a general helpline',
        'Home visits on a fixed, published schedule',
        'Appointment booking, escort and written outcomes',
        'Same-day visit updates, readable in your timezone',
        'Monthly care report covering visits, readings and any incidents',
        'Caregiver replacement handled by us, with you informed',
      ],
      notIncluded: [
        'Medical treatment or prescriptions',
        'Emergency medical response',
        'Legal, property or financial services',
        'Live video monitoring of the home',
      ],
      services: [
        { slug: 'home-care-assessment', quantity: 1, frequency: 'ONE_TIME' },
        { slug: 'care-coordination', quantity: 1, frequency: 'MONTHLY' },
        { slug: 'attendant-support', quantity: 4, frequency: 'WEEKLY' },
        { slug: 'nurse-review-visit', quantity: 1, frequency: 'MONTHLY' },
        { slug: 'appointment-escort', quantity: 2, frequency: 'MONTHLY' },
        { slug: 'family-reporting', quantity: 1, frequency: 'WEEKLY' },
      ],
    },
    {
      slug: 'fall-prevention-home-safety',
      name: 'Fall Prevention & Home Safety Assessment',
      tagline: 'Find the risks in the home before they become a hospital admission',
      audience: 'SAFETY',
      durationLabel: 'One-time visit + follow-up',
      billingCycle: 'ONE_TIME',
      priceFromPaise: 350000,
      summary:
        'A room-by-room safety review, a mobility-risk assessment, a written list of prioritised recommendations, and a follow-up call to check what was actually done.',
      details:
        'A nurse or care coordinator walks the home with you or your parent: bathroom, stairs, lighting, floor surfaces, furniture heights and the routes used at night. We assess how your parent actually moves rather than how they say they move.\n\nYou receive a written report with prioritised recommendations, separated into things to change today, things to buy, and things worth a professional opinion. We follow up two weeks later to see what has been done and what is blocked.',
      outcomes: [
        'Room-by-room hazard review',
        'Mobility and fall-risk assessment',
        'Prioritised written recommendations',
        'Follow-up call after two weeks',
      ],
      notIncluded: [
        'Building or carpentry work',
        'Supply of grab rails or equipment',
        'Physiotherapy assessment',
        'Any clinical diagnosis',
      ],
      services: [
        { slug: 'home-safety-review', quantity: 1, frequency: 'ONE_TIME' },
        { slug: 'nurse-review-visit', quantity: 1, frequency: 'ONE_TIME' },
      ],
    },
    {
      slug: 'companion-dementia-support',
      name: 'Companion & Dementia Support',
      tagline: 'Routine-led companionship from caregivers trained for memory difficulty',
      audience: 'COMPANION',
      durationLabel: 'Monthly',
      billingCycle: 'MONTHLY',
      // Zero means the UI shows "talk to us" instead of inventing a figure.
      priceFromPaise: 0,
      isComingSoon: true,
      summary:
        'Consistent companionship built around a predictable daily routine, for seniors living with memory difficulty. We are completing caregiver training before opening this plan.',
      details:
        'Memory difficulty needs consistency far more than it needs hours: the same caregiver, the same routine, the same order of the day. We are building this plan around a small group of caregivers completing dedicated dementia-awareness training, and we will open it only when we can staff it properly in a given area.\n\nIf this is what your family needs now, tell us during the assessment. We will be honest about whether we can currently serve your area, and we will not take the work if we cannot do it well.',
      outcomes: [
        'A consistent caregiver rather than a rota of strangers',
        'Routine-led daily structure agreed with the family',
        'Caregivers who have completed dementia-awareness training',
        'Nurse supervision and family reporting',
      ],
      notIncluded: [
        'Cognitive assessment or diagnosis',
        'Behavioural or psychiatric treatment',
        'Secure residential care',
        'Emergency medical response',
      ],
      services: [
        { slug: 'dementia-companion-care', quantity: 1, frequency: 'DAILY' },
        { slug: 'companion-visits', quantity: 3, frequency: 'WEEKLY' },
        { slug: 'nurse-review-visit', quantity: 1, frequency: 'MONTHLY' },
        { slug: 'family-reporting', quantity: 1, frequency: 'WEEKLY' },
      ],
    },
  ];
  const packages: Record<string, string> = {};
  for (const [index, row] of packageRows.entries()) {
    const created = await prisma.carePackage.create({
      data: {
        slug: row.slug,
        name: row.name,
        tagline: row.tagline,
        audience: row.audience,
        summary: row.summary,
        details: row.details,
        durationLabel: row.durationLabel,
        billingCycle: row.billingCycle,
        priceFromPaise: row.priceFromPaise,
        isComingSoon: row.isComingSoon ?? false,
        isFeatured: row.isFeatured ?? false,
        sortOrder: index,
        outcomes: list(row.outcomes),
        notIncluded: list(row.notIncluded),
        services: {
          create: row.services.map((service, order) => ({
            serviceId: services[service.slug],
            quantity: service.quantity,
            frequency: service.frequency,
            sortOrder: order,
          })),
        },
      },
    });
    packages[row.slug] = created.id;
  }

  // ---------------------------------------------------------------------
  // Task catalogue. Tasks a caregiver may not perform are simply absent —
  // the catalogue is the boundary, not a warning in the instructions.
  // ---------------------------------------------------------------------
  const taskTemplateRows = [
    {
      key: 'mobility-assist',
      label: 'Help with walking and moving around',
      category: 'MOBILITY',
      instructions:
        'Support at the senior\'s own pace. Never lift alone — ask for help or call the supervisor.',
    },
    {
      key: 'transfer-assist',
      label: 'Assist with bed / chair transfer',
      category: 'MOBILITY',
      instructions: 'Use the technique recorded in the care plan. Stop and report if there is pain.',
    },
    { key: 'breakfast-support', label: 'Breakfast support', category: 'MEALS' },
    { key: 'lunch-support', label: 'Lunch support', category: 'MEALS' },
    { key: 'dinner-support', label: 'Dinner support', category: 'MEALS' },
    { key: 'hydration-check', label: 'Encourage fluids through the day', category: 'MEALS' },
    {
      key: 'medication-reminder',
      label: 'Medication reminder',
      category: 'MEDICATION',
      instructions:
        'Remind and confirm only. Never change a dose, and never give anything that is not on the list entered by the family or a nurse.',
    },
    {
      key: 'personal-hygiene',
      label: 'Personal hygiene support',
      category: 'HYGIENE',
      instructions: 'Maintain privacy and dignity. Stop if the senior declines, and record it.',
    },
    { key: 'grooming', label: 'Grooming and dressing support', category: 'HYGIENE' },
    { key: 'companion-time', label: 'Conversation and companionship', category: 'COMPANION' },
    { key: 'light-activity', label: 'Light activity or short walk', category: 'COMPANION' },
    {
      key: 'tidy-care-space',
      label: "Tidy the senior's room and care items",
      category: 'HOUSEHOLD',
      instructions: 'Care-related tidying only. General housekeeping is not part of the service.',
    },
    { key: 'appointment-prep', label: 'Prepare for an appointment', category: 'APPOINTMENT' },
    {
      key: 'record-vitals',
      label: 'Record agreed vitals',
      category: 'MONITORING',
      instructions:
        'Record the reading exactly as shown. Do not interpret it. Anything the family asks about goes to the nurse.',
    },
    { key: 'observe-mood', label: 'Note mood and alertness', category: 'MONITORING' },
  ];
  const taskTemplates: Record<string, string> = {};
  for (const [index, row] of taskTemplateRows.entries()) {
    const created = await prisma.taskTemplate.create({
      data: {
        key: row.key,
        label: row.label,
        category: row.category,
        instructions: row.instructions ?? null,
        sortOrder: index,
      },
    });
    taskTemplates[row.key] = created.id;
  }

  // ---------------------------------------------------------------------
  // Assessment questionnaire (configurable).
  // ---------------------------------------------------------------------
  const questionRows = [
    { key: 'home-entry-access', section: 'HOME_SAFETY', prompt: 'Is the entrance to the home accessible without stairs?', inputType: 'SINGLE_CHOICE', options: ['Yes', 'A few steps', 'Several stairs, no lift', 'Stairs with a lift'] },
    { key: 'bathroom-safety', section: 'HOME_SAFETY', prompt: 'Does the bathroom have grab support and a non-slip surface?', inputType: 'SINGLE_CHOICE', options: ['Both', 'Grab support only', 'Non-slip only', 'Neither'] },
    { key: 'night-lighting', section: 'HOME_SAFETY', prompt: 'Is there adequate lighting on the route used at night?', inputType: 'BOOLEAN' },
    { key: 'mobility-observed', section: 'MOBILITY', prompt: 'Observed mobility during the visit', inputType: 'SINGLE_CHOICE', options: ['Walks unaided', 'Uses a stick or walker', 'Needs a person to steady them', 'Wheelchair', 'Mostly in bed'], isRequired: true },
    { key: 'fall-history', section: 'MOBILITY', prompt: 'Any falls or near-falls in the last six months?', inputType: 'SINGLE_CHOICE', options: ['None', 'One near-fall', 'One fall', 'More than one fall'], isRequired: true },
    { key: 'medication-count', section: 'MEDICATION', prompt: 'How many regular medications are on the current list?', inputType: 'SCALE' },
    { key: 'medication-management', section: 'MEDICATION', prompt: 'Who currently manages the medication routine?', inputType: 'SINGLE_CHOICE', options: ['Senior independently', 'Family member', 'Existing attendant', 'Nobody consistently'], isRequired: true },
    { key: 'appetite-nutrition', section: 'NUTRITION', prompt: 'Appetite and eating pattern as described', inputType: 'SINGLE_CHOICE', options: ['Normal', 'Reduced', 'Irregular', 'Needs assistance to eat'] },
    { key: 'orientation', section: 'COGNITION', prompt: 'Orientation to time, place and person during the visit', inputType: 'SINGLE_CHOICE', options: ['Fully oriented', 'Occasionally confused', 'Frequently confused', 'Not assessed'] },
    { key: 'support-network', section: 'SUPPORT', prompt: 'Who is available locally in an emergency?', inputType: 'TEXT', isRequired: true },
    { key: 'family-location', section: 'SUPPORT', prompt: 'Where is the primary decision-maker based?', inputType: 'SINGLE_CHOICE', options: ['Same home', 'Elsewhere in Mumbai', 'Elsewhere in India', 'Outside India'] },
    { key: 'family-goals', section: 'GOALS', prompt: 'What would the family most like to change in the next month?', inputType: 'TEXT', isRequired: true },
  ];
  for (const [index, row] of questionRows.entries()) {
    await prisma.assessmentQuestion.create({
      data: {
        key: row.key,
        section: row.section,
        prompt: row.prompt,
        inputType: row.inputType,
        options: list(row.options ?? []),
        isRequired: row.isRequired ?? false,
        sortOrder: index,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Escalation rules. Note that no rule auto-contacts emergency services:
  // that stays a human decision.
  // ---------------------------------------------------------------------
  const escalationRows = [
    {
      key: 'incident-high',
      trigger: 'INCIDENT_HIGH',
      notifyLevel: 'NURSE',
      notifyFamily: true,
      withinMinutes: 15,
      instructions:
        'Nurse supervisor reviews immediately and calls the caregiver. Family is told the recorded facts, not an interpretation. If the situation is medically urgent, the caregiver calls emergency services first and records it afterwards.',
    },
    {
      key: 'incident-medium',
      trigger: 'INCIDENT_MEDIUM',
      notifyLevel: 'NURSE',
      notifyFamily: true,
      withinMinutes: 60,
      instructions:
        'Nurse supervisor reviews within the hour and decides whether an unscheduled visit is needed.',
    },
    {
      key: 'vital-review',
      trigger: 'VITAL_REVIEW',
      notifyLevel: 'NURSE',
      notifyFamily: false,
      withinMinutes: 120,
      instructions:
        'A reading outside the configured band is queued for nurse review. No clinical conclusion is drawn or shared until a nurse has looked at it.',
    },
    {
      key: 'missed-visit',
      trigger: 'MISSED_VISIT',
      notifyLevel: 'OPS',
      notifyFamily: true,
      withinMinutes: 30,
      instructions:
        'Operations confirms whether the caregiver is delayed or unavailable, arranges cover, and tells the family what is happening and when.',
    },
    {
      key: 'caregiver-unavailable',
      trigger: 'CAREGIVER_UNAVAILABLE',
      notifyLevel: 'OPS',
      notifyFamily: true,
      withinMinutes: 60,
      instructions:
        'Operations runs the replacement match, assigns cover, and informs the family who is coming and why the change happened.',
    },
    {
      key: 'senior-help-request',
      trigger: 'SENIOR_HELP_REQUEST',
      notifyLevel: 'OPS',
      notifyFamily: true,
      withinMinutes: 10,
      instructions:
        'Call the senior back promptly. This is a support route, not an emergency line — the app tells seniors to call emergency services directly if they are unwell.',
    },
  ];
  for (const [index, row] of escalationRows.entries()) {
    await prisma.escalationRule.create({ data: { ...row, sortOrder: index } });
  }

  // ---------------------------------------------------------------------
  // Notification templates.
  // ---------------------------------------------------------------------
  const templateRows = [
    { key: 'visit.checked-in', channel: 'IN_APP', subject: 'Caregiver checked in', body: '{{caregiverName}} checked in for {{seniorName}} at {{time}}.', description: 'Sent when a caregiver starts a visit.' },
    { key: 'visit.completed', channel: 'IN_APP', subject: 'Visit completed', body: "{{caregiverName}} completed today's visit for {{seniorName}}. {{tasksDone}} of {{tasksTotal}} planned tasks were completed.", description: 'Sent at check-out.' },
    { key: 'visit.missed', channel: 'SMS', subject: null, body: 'Medcare: a scheduled visit for {{seniorName}} was missed. Our team is arranging cover and will call you shortly.', description: 'Sent when a visit is marked missed.' },
    { key: 'caregiver.assigned', channel: 'IN_APP', subject: 'Caregiver assigned', body: '{{caregiverName}} has been assigned to {{seniorName}} as the {{role}} caregiver, starting {{startDate}}.', description: 'Sent on a new assignment.' },
    { key: 'caregiver.replacement', channel: 'WHATSAPP', subject: null, body: 'Medcare: {{outgoingName}} is unavailable, so {{caregiverName}} will attend {{seniorName}} from {{startDate}}. Reason recorded: {{reason}}.', description: 'Sent when a replacement is arranged.' },
    { key: 'appointment.reminder', channel: 'IN_APP', subject: 'Appointment tomorrow', body: '{{seniorName}} has {{title}} on {{when}}.', description: 'Sent a day before an appointment.' },
    { key: 'incident.family', channel: 'IN_APP', subject: 'A care incident needs your attention', body: 'An incident was recorded for {{seniorName}}: {{title}}. Reference {{reference}}. Our nurse supervisor is reviewing it and will contact you.', description: 'Sent when an incident is shared with the family.' },
    { key: 'payment.due', channel: 'EMAIL', subject: 'Your Medcare invoice {{number}} is due', body: 'Invoice {{number}} for {{amount}} is due on {{dueDate}}. You can pay from your family dashboard.', description: 'Sent before an invoice due date.' },
    { key: 'report.weekly', channel: 'EMAIL', subject: 'Weekly care summary for {{seniorName}}', body: 'Visits completed: {{visits}}. Nurse reviews: {{reviews}}. Items flagged for review: {{flagged}}. Full detail is in your dashboard.', description: 'Weekly digest for families.' },
    { key: 'lead.new', channel: 'IN_APP', subject: 'New care enquiry', body: 'New enquiry from {{contactName}} ({{area}}), urgency {{urgency}}. Reference {{reference}}.', description: 'Internal alert on a new lead.' },
  ];
  for (const row of templateRows) {
    await prisma.notificationTemplate.create({ data: row });
  }

  // ---------------------------------------------------------------------
  // Lead sources.
  // ---------------------------------------------------------------------
  const sourceRows = [
    { key: 'WEBSITE', label: 'Website enquiry', category: 'DIGITAL' },
    { key: 'DOCTOR', label: 'Doctor referral', category: 'MEDICAL' },
    { key: 'HOSPITAL', label: 'Hospital referral', category: 'MEDICAL' },
    { key: 'PHYSIOTHERAPIST', label: 'Physiotherapist', category: 'MEDICAL' },
    { key: 'PHARMACY', label: 'Pharmacy', category: 'MEDICAL' },
    { key: 'HOUSING_SOCIETY', label: 'Housing society', category: 'COMMUNITY' },
    { key: 'WHATSAPP', label: 'WhatsApp enquiry', category: 'DIGITAL' },
    { key: 'REFERRAL', label: 'Existing customer referral', category: 'PARTNER' },
    { key: 'NRI_NETWORK', label: 'NRI network', category: 'COMMUNITY' },
    { key: 'COMMUNITY_EVENT', label: 'Community event', category: 'COMMUNITY' },
    { key: 'OTHER', label: 'Other', category: 'OTHER' },
  ];
  const leadSources: Record<string, string> = {};
  for (const [index, row] of sourceRows.entries()) {
    const created = await prisma.leadSource.create({ data: { ...row, sortOrder: index } });
    leadSources[row.key] = created.id;
  }

  // ---------------------------------------------------------------------
  // Default vitals review bands. Global rows have seniorId = null.
  // ---------------------------------------------------------------------
  const thresholdRows = [
    { type: 'BLOOD_PRESSURE', lowValue: 90, highValue: 150, lowSecondary: 55, highSecondary: 95 },
    { type: 'HEART_RATE', lowValue: 50, highValue: 105 },
    { type: 'TEMPERATURE', lowValue: 35.5, highValue: 37.8 },
    { type: 'BLOOD_GLUCOSE', lowValue: 70, highValue: 200 },
    { type: 'SPO2', lowValue: 93, highValue: null },
  ];
  for (const row of thresholdRows) {
    await prisma.vitalThreshold.create({
      data: {
        seniorId: null,
        type: row.type,
        lowValue: row.lowValue ?? null,
        highValue: row.highValue ?? null,
        lowSecondary: row.lowSecondary ?? null,
        highSecondary: row.highSecondary ?? null,
        note: 'Platform default band. A reading outside it is flagged for nurse review, never interpreted.',
      },
    });
  }

  await prisma.appSetting.createMany({
    data: [
      { key: 'business.name', value: JSON.stringify('Medcare Elder Care') },
      { key: 'business.city', value: JSON.stringify('Mumbai') },
      {
        key: 'sla.firstContactHours',
        value: JSON.stringify({ TODAY: 2, WITHIN_24H: 4, FEW_DAYS: 12, WITHIN_WEEK: 24, EXPLORING: 48 }),
      },
      {
        key: 'legal.reviewStatus',
        value: JSON.stringify(
          'Draft — all legal, consent, privacy and clinical wording is pending professional review before launch.',
        ),
      },
      { key: 'catalogue.seededAt', value: JSON.stringify(at(0).toISOString()) },
    ],
  });

  return { areas, services, packages, taskTemplates, leadSources };
}
