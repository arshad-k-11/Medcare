/**
 * Acquisition and money: leads across the whole pipeline, referrals with attribution,
 * CRM follow-ups, bookings, subscriptions, invoices, payments, notifications and audit.
 *
 * The lead set deliberately includes a LOST enquiry from an area the business does not
 * serve, because "we told them honestly instead of stretching cover" is the behaviour the
 * product is meant to support.
 */
import type { PrismaClient } from '@prisma/client';
import { at, list } from './seed-utils';
import type { CatalogueIds } from './seed-catalogue';
import type { PeopleIds } from './seed-people';

export async function seedPipeline(
  prisma: PrismaClient,
  catalogue: CatalogueIds,
  people: PeopleIds,
) {
  const { packages, leadSources } = catalogue;
  const { admin, ops, partners, nurses, caregivers } = people;

  // ---------------------------------------------------------------------
  // Leads
  // ---------------------------------------------------------------------
  type LeadSeed = {
    reference: string;
    status: string;
    urgency: string;
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    relationship: string;
    contactCity: string;
    contactCountry: string;
    careNeedSummary: string;
    situations: string[];
    area: string;
    budgetBand: string;
    journey: string;
    sourceKey: string;
    packageSlug?: string;
    familyProfileId?: string;
    seniorId?: string;
    partnerId?: string;
    ownerUserId?: string;
    createdAt: Date;
    followUpAt?: Date;
    wonAt?: Date;
    lostReason?: string;
    notes?: string;
  };

  const leadSeeds: LeadSeed[] = [
    {
      reference: 'MC-7F3K2P',
      status: 'WON',
      urgency: 'WITHIN_24H',
      contactName: 'Priyanka Deshmukh',
      contactPhone: '9000000101',
      contactEmail: 'family@medcare.demo',
      relationship: 'DAUGHTER',
      contactCity: 'Mumbai',
      contactCountry: 'India',
      careNeedSummary:
        'Father discharged after hip surgery. Needs daily support and medication supervision.',
      situations: ['POST_DISCHARGE', 'MOBILITY_DIFFICULTY', 'MEDICATION_DIFFICULTY'],
      area: 'Andheri West',
      budgetBand: '25K_50K',
      journey: 'FAMILY_LOCAL',
      sourceKey: 'WEBSITE',
      packageSlug: '14-day-post-discharge-recovery',
      familyProfileId: people.family1.id,
      seniorId: people.senior1.id,
      ownerUserId: ops.id,
      createdAt: at(-11, 20),
      wonAt: at(-10, 11),
    },
    {
      reference: 'MC-9B4T6X',
      status: 'WON',
      urgency: 'FEW_DAYS',
      contactName: 'Sameer Joshi',
      contactPhone: '9000000102',
      contactEmail: 'family2@medcare.demo',
      relationship: 'SON',
      contactCity: 'Mumbai',
      contactCountry: 'India',
      careNeedSummary:
        'Mother lives alone in Thane with arthritis. Needs regular visits and medication reminders.',
      situations: ['LIVING_ALONE', 'CHRONIC_CONDITION'],
      area: 'Thane West',
      budgetBand: '10K_25K',
      journey: 'FAMILY_LOCAL',
      sourceKey: 'HOUSING_SOCIETY',
      packageSlug: 'monthly-chronic-care-support',
      familyProfileId: people.family2.id,
      seniorId: people.senior2.id,
      ownerUserId: ops.id,
      createdAt: at(-72, 11),
      wonAt: at(-69, 16),
    },
    {
      reference: 'MC-2H8N5J',
      status: 'WON',
      urgency: 'WITHIN_WEEK',
      contactName: 'Neha Raghavan',
      contactPhone: '+14165550142',
      contactEmail: 'nri@medcare.demo',
      relationship: 'DAUGHTER',
      contactCity: 'Toronto',
      contactCountry: 'Canada',
      careNeedSummary:
        'Both parents in Powai. Wants a single coordinator and reliable reporting from Canada.',
      situations: ['NRI_SUPPORT', 'CHRONIC_CONDITION', 'MOBILITY_DIFFICULTY'],
      area: 'Powai',
      budgetBand: 'ABOVE_50K',
      journey: 'NRI',
      sourceKey: 'NRI_NETWORK',
      packageSlug: 'nri-parent-care-coordination',
      familyProfileId: people.family3.id,
      seniorId: people.senior3.id,
      ownerUserId: ops.id,
      createdAt: at(-48, 7),
      wonAt: at(-45, 9),
    },
    {
      reference: 'MC-5R9W3D',
      status: 'ASSESSMENT_BOOKED',
      urgency: 'FEW_DAYS',
      contactName: 'Farhan Merchant',
      contactPhone: '9000000401',
      contactEmail: 'farhan.demo@example.com',
      relationship: 'SON',
      contactCity: 'Mumbai',
      contactCountry: 'India',
      careNeedSummary:
        'Mother had a knee replacement three weeks ago and lives alone in Bandra.',
      situations: ['POST_DISCHARGE', 'LIVING_ALONE', 'MOBILITY_DIFFICULTY'],
      area: 'Bandra West',
      budgetBand: '25K_50K',
      journey: 'FAMILY_LOCAL',
      sourceKey: 'WEBSITE',
      packageSlug: '14-day-post-discharge-recovery',
      seniorId: people.senior5.id,
      ownerUserId: ops.id,
      createdAt: at(-3, 21, 40),
      followUpAt: at(1, 11),
    },
    {
      reference: 'MC-6L2V8Y',
      status: 'CONTACTED',
      urgency: 'TODAY',
      contactName: 'Ganesh Iyer',
      contactPhone: '9000000402',
      relationship: 'SON',
      contactCity: 'Mumbai',
      contactCountry: 'India',
      careNeedSummary: 'Father being discharged this evening. No attendant arranged.',
      situations: ['POST_DISCHARGE', 'CAREGIVER_UNAVAILABLE'],
      area: 'Goregaon',
      budgetBand: 'UNSURE',
      journey: 'PARTNER',
      sourceKey: 'HOSPITAL',
      packageSlug: '14-day-post-discharge-recovery',
      partnerId: partners[1].id,
      ownerUserId: ops.id,
      createdAt: at(0, 8, 15),
      followUpAt: at(0, 13),
    },
    {
      reference: 'MC-3T7C1M',
      status: 'QUALIFIED',
      urgency: 'WITHIN_WEEK',
      contactName: 'Dilip Shetty',
      contactPhone: '9000000403',
      contactEmail: 'dilip.demo@example.com',
      relationship: 'SPOUSE',
      contactCity: 'Mumbai',
      contactCountry: 'India',
      careNeedSummary:
        'Wife has memory difficulty. Looking for a consistent companion during the day.',
      situations: ['COGNITIVE_SUPPORT', 'COMPANIONSHIP'],
      area: 'Malad',
      budgetBand: '25K_50K',
      journey: 'FAMILY_LOCAL',
      sourceKey: 'DOCTOR',
      packageSlug: 'companion-dementia-support',
      partnerId: partners[0].id,
      ownerUserId: admin.id,
      createdAt: at(-6, 17),
      followUpAt: at(2, 10),
      notes:
        'Told him honestly that the dementia plan is not open yet in Malad. He wants to be contacted when it is.',
    },
    {
      reference: 'MC-8D4G6K',
      status: 'PROPOSAL_SENT',
      urgency: 'FEW_DAYS',
      contactName: 'Rina Patel',
      contactPhone: '+447700900123',
      contactEmail: 'rina.demo@example.com',
      relationship: 'DAUGHTER',
      contactCity: 'London',
      contactCountry: 'United Kingdom',
      careNeedSummary:
        'Father alone in Borivali since her mother passed away. Wants weekly visits and reporting.',
      situations: ['NRI_SUPPORT', 'LIVING_ALONE', 'COMPANIONSHIP'],
      area: 'Borivali',
      budgetBand: '10K_25K',
      journey: 'NRI',
      sourceKey: 'WEBSITE',
      packageSlug: 'nri-parent-care-coordination',
      ownerUserId: ops.id,
      createdAt: at(-8, 6, 30),
      followUpAt: at(0, 19),
    },
    {
      reference: 'MC-4Y9P2Q',
      status: 'NEW',
      urgency: 'EXPLORING',
      contactName: 'Suresh Bhide',
      contactPhone: '9000000404',
      relationship: 'SELF',
      contactCity: 'Mumbai',
      contactCountry: 'India',
      careNeedSummary: 'Planning ahead for himself and his wife. Wants to understand the options.',
      situations: ['LIVING_ALONE', 'OTHER'],
      area: 'Kandivali',
      budgetBand: 'UNSURE',
      journey: 'FAMILY_LOCAL',
      sourceKey: 'COMMUNITY_EVENT',
      createdAt: at(0, 7, 5),
    },
    {
      reference: 'MC-1Z5F8B',
      status: 'LOST',
      urgency: 'WITHIN_24H',
      contactName: 'Anita Kulkarni',
      contactPhone: '9000000405',
      relationship: 'DAUGHTER',
      contactCity: 'Pune',
      contactCountry: 'India',
      careNeedSummary: 'Mother in Vashi. Needed daily attendant support.',
      situations: ['LIVING_ALONE', 'MOBILITY_DIFFICULTY'],
      area: 'Vashi / Navi Mumbai',
      budgetBand: '10K_25K',
      journey: 'FAMILY_LOCAL',
      sourceKey: 'WEBSITE',
      ownerUserId: ops.id,
      createdAt: at(-15, 13),
      lostReason:
        'We do not currently serve Vashi. Told her honestly rather than stretching cover, and offered to call when the area opens.',
    },
  ];

  const leadIds: Record<string, string> = {};
  for (const seed of leadSeeds) {
    const lead = await prisma.lead.create({
      data: {
        reference: seed.reference,
        status: seed.status,
        urgency: seed.urgency,
        contactName: seed.contactName,
        contactPhone: seed.contactPhone,
        contactEmail: seed.contactEmail ?? null,
        relationship: seed.relationship,
        contactCity: seed.contactCity,
        contactCountry: seed.contactCountry,
        careNeedSummary: seed.careNeedSummary,
        situations: list(seed.situations),
        area: seed.area,
        budgetBand: seed.budgetBand,
        journey: seed.journey,
        sourceId: leadSources[seed.sourceKey],
        familyProfileId: seed.familyProfileId ?? null,
        seniorId: seed.seniorId ?? null,
        partnerId: seed.partnerId ?? null,
        recommendedPackageId: seed.packageSlug ? packages[seed.packageSlug] : null,
        ownerUserId: seed.ownerUserId ?? null,
        followUpAt: seed.followUpAt ?? null,
        wonAt: seed.wonAt ?? null,
        lostReason: seed.lostReason ?? null,
        notes: seed.notes ?? null,
        createdAt: seed.createdAt,
      },
    });
    leadIds[seed.reference] = lead.id;

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'SYSTEM',
        summary: 'Enquiry received and lead created.',
        toStatus: 'NEW',
        createdAt: seed.createdAt,
      },
    });

    if (seed.status !== 'NEW') {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'CALL',
          summary:
            'Called the family to understand the situation and explain how the free assessment works.',
          outcome: 'Spoke to the family. They want to go ahead with an assessment.',
          fromStatus: 'NEW',
          toStatus: 'CONTACTED',
          actorUserId: seed.ownerUserId ?? ops.id,
          createdAt: new Date(seed.createdAt.getTime() + 3 * 3600_000),
        },
      });
    }

    if (seed.status === 'LOST') {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'NOTE',
          summary: seed.lostReason ?? 'Closed.',
          fromStatus: 'CONTACTED',
          toStatus: 'LOST',
          actorUserId: ops.id,
          createdAt: new Date(seed.createdAt.getTime() + 26 * 3600_000),
        },
      });
    }

    if (seed.status === 'WON' && seed.wonAt) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'ASSESSMENT',
          summary: 'Home assessment completed and the recommended plan was accepted.',
          fromStatus: 'PROPOSAL_SENT',
          toStatus: 'WON',
          actorUserId: ops.id,
          createdAt: seed.wonAt,
        },
      });
    }
  }

  // The website enquiry whose assessment is booked but not yet done.
  await prisma.assessment.create({
    data: {
      seniorId: people.senior5.id,
      leadId: leadIds['MC-5R9W3D'],
      type: 'HOME_VISIT',
      status: 'SCHEDULED',
      requestedFor: at(-3, 22),
      scheduledAt: at(1, 11, 0),
      nurseId: nurses[1].id,
    },
  });

  await prisma.intakeSubmission.create({
    data: {
      leadId: leadIds['MC-5R9W3D'],
      journey: 'FAMILY_LOCAL',
      answers: JSON.stringify({
        careRecipient: 'PARENT',
        situations: ['POST_DISCHARGE', 'LIVING_ALONE', 'MOBILITY_DIFFICULTY'],
        urgency: 'FEW_DAYS',
        area: 'Bandra West',
        preferredAssessmentSlot: 'MORNING',
      }),
      recommendedPackageSlug: '14-day-post-discharge-recovery',
      completedSteps: 7,
      submittedAt: at(-3, 21, 40),
    },
  });

  await prisma.crmTask.createMany({
    data: [
      {
        title: 'Call Ganesh Iyer — discharge is this evening',
        details:
          'Confirm the discharge time and whether an attendant is needed tonight or from tomorrow morning.',
        dueAt: at(0, 13, 0),
        priority: 'HIGH',
        leadId: leadIds['MC-6L2V8Y'],
        assigneeUserId: ops.id,
        createdByUserId: admin.id,
      },
      {
        title: 'Follow up on the Borivali proposal',
        details: 'Rina asked for a call at 7pm IST to go through the coordination plan.',
        dueAt: at(0, 19, 0),
        priority: 'NORMAL',
        leadId: leadIds['MC-8D4G6K'],
        assigneeUserId: ops.id,
        createdByUserId: ops.id,
      },
      {
        title: "Confirm tomorrow's assessment with the Merchant family",
        dueAt: at(0, 17, 0),
        priority: 'NORMAL',
        leadId: leadIds['MC-5R9W3D'],
        assigneeUserId: ops.id,
        createdByUserId: ops.id,
      },
      {
        title: 'Arrange replacement cover for the Thane patient',
        details:
          'Primary caregiver on emergency leave for seven days. Three visits affected.',
        dueAt: at(0, 12, 0),
        priority: 'HIGH',
        assigneeUserId: ops.id,
        createdByUserId: admin.id,
      },
      {
        title: 'Ask the Deshmukh family about extending beyond day 14',
        details: 'Plan review is due. Decide with the family whether to move to a monthly plan.',
        dueAt: at(3, 11, 0),
        priority: 'NORMAL',
        leadId: leadIds['MC-7F3K2P'],
        assigneeUserId: ops.id,
        createdByUserId: ops.id,
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Referrals — including one declined because the area is not served.
  // ---------------------------------------------------------------------
  const referralSeeds = [
    {
      reference: 'REF-3M8K2V',
      partnerId: partners[1].id,
      patientName: 'Mr G. Iyer (senior)',
      patientAgeYears: 79,
      contactName: 'Ganesh Iyer',
      contactPhone: '9000000402',
      patientArea: 'Goregaon',
      dischargeStatus: 'PRE_DISCHARGE',
      dischargeDate: at(0, 19),
      reason:
        'Being discharged this evening after a chest infection. Family has no attendant arranged and both children work full time.',
      urgency: 'TODAY',
      status: 'CONTACTED',
      contactedAt: at(0, 9, 10),
      leadRef: 'MC-6L2V8Y',
      createdAt: at(0, 8, 5),
    },
    {
      reference: 'REF-7Q4X9L',
      partnerId: partners[0].id,
      patientName: 'Mrs S. Shetty (senior)',
      patientAgeYears: 74,
      contactName: 'Dilip Shetty',
      contactPhone: '9000000403',
      patientArea: 'Malad',
      dischargeStatus: 'NOT_APPLICABLE',
      reason:
        'Progressive memory difficulty. Husband is the sole carer and is exhausted. Would benefit from consistent daytime companionship.',
      urgency: 'WITHIN_WEEK',
      status: 'ASSESSMENT',
      contactedAt: at(-6, 18),
      leadRef: 'MC-3T7C1M',
      createdAt: at(-6, 16, 30),
    },
    {
      reference: 'REF-5B2N7H',
      partnerId: partners[0].id,
      patientName: 'Mr A. Deshmukh (senior)',
      patientAgeYears: 73,
      contactName: 'Priyanka Deshmukh',
      contactPhone: '9000000101',
      patientArea: 'Andheri West',
      dischargeStatus: 'DISCHARGED_THIS_WEEK',
      reason:
        'Post hip-surgery recovery support at home. Fall risk and a six-item medication list.',
      urgency: 'WITHIN_24H',
      status: 'CONVERTED',
      contactedAt: at(-11, 21),
      convertedAt: at(-10, 11),
      leadRef: 'MC-7F3K2P',
      seniorId: people.senior1.id,
      createdAt: at(-11, 20, 10),
    },
    {
      reference: 'REF-9J6T3C',
      partnerId: partners[1].id,
      patientName: 'Mrs P. Nadkarni (senior)',
      patientAgeYears: 84,
      contactName: 'Vikram Nadkarni',
      contactPhone: '9000000406',
      patientArea: 'South Mumbai',
      dischargeStatus: 'DISCHARGED_TODAY',
      reason: 'Discharged after a fall. Needs an attendant and a home safety review.',
      urgency: 'WITHIN_24H',
      status: 'DECLINED',
      contactedAt: at(-20, 12),
      statusNote:
        'We do not yet staff South Mumbai. Told the partner the same day rather than accepting work we cannot deliver.',
      createdAt: at(-20, 11),
    },
    {
      reference: 'REF-2V8L5R',
      partnerId: partners[1].id,
      patientName: 'Mr R. Dsouza (senior)',
      patientAgeYears: 71,
      contactName: 'Clara Dsouza',
      contactPhone: '9000000407',
      patientArea: 'Andheri East',
      dischargeStatus: 'DISCHARGED_THIS_WEEK',
      reason:
        'Recovering after cardiac surgery. Family wants nurse-supervised support for a fortnight.',
      urgency: 'FEW_DAYS',
      status: 'SUBMITTED',
      createdAt: at(-1, 15, 20),
    },
  ];
  for (const seed of referralSeeds) {
    await prisma.referral.create({
      data: {
        reference: seed.reference,
        partnerId: seed.partnerId,
        patientName: seed.patientName,
        patientAgeYears: seed.patientAgeYears ?? null,
        contactName: seed.contactName,
        contactPhone: seed.contactPhone,
        patientArea: seed.patientArea,
        dischargeStatus: seed.dischargeStatus,
        dischargeDate: seed.dischargeDate ?? null,
        reason: seed.reason,
        urgency: seed.urgency,
        consentConfirmed: true,
        status: seed.status,
        contactedAt: seed.contactedAt ?? null,
        convertedAt: seed.convertedAt ?? null,
        statusNote: seed.statusNote ?? null,
        leadId: seed.leadRef ? leadIds[seed.leadRef] : null,
        seniorId: seed.seniorId ?? null,
        createdAt: seed.createdAt,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Bookings, subscriptions, invoices, payments
  // ---------------------------------------------------------------------
  const booking1 = await prisma.booking.create({
    data: {
      reference: 'BK-7F3K2P',
      familyProfileId: people.family1.id,
      seniorId: people.senior1.id,
      packageId: packages['14-day-post-discharge-recovery'],
      leadId: leadIds['MC-7F3K2P'],
      status: 'ACTIVE',
      startDate: at(-9),
      quotedAmountPaise: 2950000,
      createdAt: at(-10, 11, 30),
    },
  });

  const invoice1 = await prisma.invoice.create({
    data: {
      number: 'MC-INV-000101',
      familyProfileId: people.family1.id,
      seniorId: people.senior1.id,
      bookingId: booking1.id,
      items: JSON.stringify([
        { label: '14-Day Post-Discharge Recovery plan', quantity: 1, unitPricePaise: 2800000, amountPaise: 2800000 },
        { label: 'Additional caregiver hours (2h × 7 days)', quantity: 14, unitPricePaise: 22000, amountPaise: 308000 },
      ]),
      subtotalPaise: 3108000,
      taxPaise: 0,
      discountPaise: 158000,
      totalPaise: 2950000,
      amountPaidPaise: 2950000,
      status: 'PAID',
      issuedAt: at(-10, 12),
      dueDate: at(-8),
      paidAt: at(-10, 13, 20),
      notes: "Tax treatment is pending confirmation from the business's accountant.",
    },
  });
  await prisma.payment.create({
    data: {
      invoiceId: invoice1.id,
      gateway: 'RAZORPAY',
      gatewayOrderId: 'demo_order_000101',
      gatewayPaymentId: 'demo_pay_000101',
      amountPaise: 2950000,
      method: 'UPI',
      status: 'CAPTURED',
      createdAt: at(-10, 13, 18),
    },
  });

  const subscription2 = await prisma.subscription.create({
    data: {
      familyProfileId: people.family2.id,
      seniorId: people.senior2.id,
      packageId: packages['monthly-chronic-care-support'],
      status: 'PAST_DUE',
      amountPaise: 1950000,
      billingCycle: 'MONTHLY',
      startDate: at(-68),
      nextBillingDate: at(6),
      createdAt: at(-68),
    },
  });
  await prisma.invoice.create({
    data: {
      number: 'MC-INV-000098',
      familyProfileId: people.family2.id,
      seniorId: people.senior2.id,
      subscriptionId: subscription2.id,
      items: JSON.stringify([
        { label: 'Monthly Chronic Care Support — current month', quantity: 1, unitPricePaise: 1950000, amountPaise: 1950000 },
      ]),
      subtotalPaise: 1950000,
      totalPaise: 1950000,
      amountPaidPaise: 0,
      status: 'OVERDUE',
      issuedAt: at(-12, 9),
      dueDate: at(-2),
    },
  });

  const subscription3 = await prisma.subscription.create({
    data: {
      familyProfileId: people.family3.id,
      seniorId: people.senior3.id,
      packageId: packages['nri-parent-care-coordination'],
      status: 'ACTIVE',
      amountPaise: 4200000,
      billingCycle: 'MONTHLY',
      startDate: at(-44),
      nextBillingDate: at(14),
      createdAt: at(-44),
    },
  });
  await prisma.invoice.createMany({
    data: [
      {
        number: 'MC-INV-000099',
        familyProfileId: people.family3.id,
        seniorId: people.senior3.id,
        subscriptionId: subscription3.id,
        items: JSON.stringify([
          { label: 'NRI Parent Care Coordination — both parents', quantity: 1, unitPricePaise: 4200000, amountPaise: 4200000 },
        ]),
        subtotalPaise: 4200000,
        totalPaise: 4200000,
        amountPaidPaise: 4200000,
        status: 'PAID',
        issuedAt: at(-44, 9),
        dueDate: at(-37),
        paidAt: at(-43, 17),
      },
      {
        number: 'MC-INV-000104',
        familyProfileId: people.family3.id,
        seniorId: people.senior3.id,
        subscriptionId: subscription3.id,
        items: JSON.stringify([
          { label: 'NRI Parent Care Coordination — both parents', quantity: 1, unitPricePaise: 4200000, amountPaise: 4200000 },
          { label: 'Appointment escort (neurology review)', quantity: 1, unitPricePaise: 140000, amountPaise: 140000 },
        ]),
        subtotalPaise: 4340000,
        totalPaise: 4340000,
        status: 'SENT',
        issuedAt: at(-1, 9),
        dueDate: at(9),
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Notifications, including one that honestly reports a disabled channel.
  // ---------------------------------------------------------------------
  await prisma.notification.createMany({
    data: [
      { userId: people.familyUser1.id, type: 'VISIT_UPDATE', title: 'Caregiver checked in', body: 'Sunita Waghmare checked in for Anil Deshmukh at 8:12 am.', channel: 'IN_APP', href: '/app/family', seniorId: people.senior1.id, sentAt: at(0, 8, 12), deliveryStatus: 'SENT', createdAt: at(0, 8, 12) },
      { userId: people.familyUser1.id, type: 'APPOINTMENT_REMINDER', title: 'Orthopaedic follow-up in two days', body: 'Anil Deshmukh has an orthopaedic follow-up. Transport and an escort are arranged.', channel: 'IN_APP', href: '/app/family/appointments', seniorId: people.senior1.id, sentAt: at(0, 7, 0), deliveryStatus: 'SENT', createdAt: at(0, 7, 0) },
      { userId: people.familyUser1.id, type: 'CARE_PLAN_UPDATE', title: 'Care plan updated to version 2', body: 'The caregiver shift was extended to 2pm and a walking goal was added after the day-3 nurse review.', channel: 'IN_APP', href: '/app/family', seniorId: people.senior1.id, readAt: at(-6, 20), sentAt: at(-6, 16, 20), deliveryStatus: 'SENT', createdAt: at(-6, 16, 20) },
      { userId: people.familyUser2.id, type: 'INCIDENT_ALERT', title: 'Caregiver change this week', body: 'Your assigned caregiver is on emergency leave and a replacement is being arranged. Reference INC-8Q3R7T.', channel: 'IN_APP', severity: 'WARNING', href: '/app/family', seniorId: people.senior2.id, sentAt: at(-1, 10), deliveryStatus: 'SENT', createdAt: at(-1, 10) },
      { userId: people.familyUser2.id, type: 'PAYMENT_REMINDER', title: 'Invoice MC-INV-000098 is overdue', body: 'Your monthly care plan invoice was due two days ago. You can pay from your dashboard.', channel: 'IN_APP', severity: 'WARNING', href: '/app/family/billing', sentAt: at(-1, 9), deliveryStatus: 'SENT', createdAt: at(-1, 9) },
      { userId: people.familyUser3.id, type: 'CARE_REPORT', title: 'Weekly care summary is ready', body: 'Four visits completed, one nurse review scheduled, one reading flagged for review.', channel: 'IN_APP', href: '/app/family/updates', seniorId: people.senior3.id, sentAt: at(-1, 21), deliveryStatus: 'SENT', createdAt: at(-1, 21) },
      { userId: nurses[0].userId, type: 'REVIEW_REQUIRED', title: 'A reading needs your review', body: 'A blood pressure reading for Venkat Raghavan is outside the configured band.', channel: 'IN_APP', severity: 'WARNING', href: '/app/nurse/reviews', seniorId: people.senior4.id, sentAt: at(-2, 12), deliveryStatus: 'SENT', createdAt: at(-2, 12) },
      { userId: caregivers[0].userId, type: 'VISIT_UPDATE', title: "Today's schedule is ready", body: 'One shift today: Anil Deshmukh, 8:00am–2:00pm, Andheri West.', channel: 'IN_APP', href: '/app/caregiver', sentAt: at(0, 6, 30), deliveryStatus: 'SENT', createdAt: at(0, 6, 30) },
      { userId: ops.id, type: 'LEAD_NEW', title: 'New care enquiry — needed today', body: 'Ganesh Iyer (Goregaon) needs support this evening. Reference MC-6L2V8Y.', channel: 'IN_APP', severity: 'WARNING', href: '/app/admin/leads', sentAt: at(0, 8, 15), deliveryStatus: 'SENT', createdAt: at(0, 8, 15) },
      { userId: ops.id, type: 'SYSTEM', title: 'SMS channel is not configured', body: 'An SMS notification was queued but not delivered because no SMS provider is configured. Nothing was lost — the message is recorded here.', channel: 'IN_APP', href: '/app/admin/settings/templates', deliveryStatus: 'SENT', sentAt: at(-1, 10, 1), createdAt: at(-1, 10, 1) },
      { userId: people.seniorUser1.id, type: 'VISIT_UPDATE', title: 'Sunita is here today', body: 'Your caregiver Sunita arrived at 8:12 am.', channel: 'IN_APP', href: '/app/senior', seniorId: people.senior1.id, sentAt: at(0, 8, 12), deliveryStatus: 'SENT', createdAt: at(0, 8, 12) },
      { userId: partners[1].userId, type: 'SYSTEM', title: 'Referral REF-3M8K2V has been contacted', body: 'Our team spoke to the family this morning and an assessment is being arranged.', channel: 'IN_APP', href: '/app/partner/referrals', sentAt: at(0, 9, 15), deliveryStatus: 'SENT', createdAt: at(0, 9, 15) },
    ],
  });

  await prisma.notificationPreference.createMany({
    data: [
      { userId: people.familyUser1.id, type: 'VISIT_UPDATE', channel: 'EMAIL', enabled: false },
      { userId: people.familyUser1.id, type: 'VISIT_UPDATE', channel: 'WHATSAPP', enabled: true },
      { userId: people.familyUser2.id, type: 'CARE_REPORT', channel: 'SMS', enabled: false },
      { userId: people.familyUser3.id, type: 'VISIT_UPDATE', channel: 'EMAIL', enabled: true },
      { userId: people.familyUser3.id, type: 'CARE_REPORT', channel: 'EMAIL', enabled: true },
    ],
  });

  // ---------------------------------------------------------------------
  // Audit trail. Note there are no PHI values here — only what happened.
  // ---------------------------------------------------------------------
  await prisma.auditLog.createMany({
    data: [
      { actorUserId: ops.id, actorRole: 'OPS_MANAGER', action: 'lead.created', entity: 'Lead', entityId: leadIds['MC-6L2V8Y'], outcome: 'SUCCESS', createdAt: at(0, 8, 15) },
      { actorUserId: caregivers[0].userId, actorRole: 'CAREGIVER', action: 'visit.checked-in', entity: 'Visit', seniorId: people.senior1.id, outcome: 'SUCCESS', metadata: JSON.stringify({ locationVerified: true }), createdAt: at(0, 8, 12) },
      { actorUserId: caregivers[0].userId, actorRole: 'CAREGIVER', action: 'vital.created', entity: 'Vital', seniorId: people.senior1.id, outcome: 'SUCCESS', metadata: JSON.stringify({ type: 'BLOOD_PRESSURE', flag: 'REQUIRES_REVIEW' }), createdAt: at(-3, 10) },
      { actorUserId: nurses[0].userId, actorRole: 'NURSE', action: 'care-plan.updated', entity: 'CarePlan', entityId: people.plan1.id, seniorId: people.senior1.id, outcome: 'SUCCESS', metadata: JSON.stringify({ version: 2 }), createdAt: at(-6, 16, 20) },
      { actorUserId: ops.id, actorRole: 'OPS_MANAGER', action: 'incident.created', entity: 'Incident', seniorId: people.senior2.id, outcome: 'SUCCESS', metadata: JSON.stringify({ type: 'CAREGIVER_UNAVAILABLE', severity: 'MEDIUM' }), createdAt: at(-1, 9, 30) },
      { actorUserId: people.familyUser2.id, actorRole: 'FAMILY', action: 'patient.read', entity: 'Senior', entityId: people.senior2.id, seniorId: people.senior2.id, outcome: 'SUCCESS', createdAt: at(-1, 10, 20) },
      { actorUserId: people.familyUser1.id, actorRole: 'FAMILY', action: 'document.downloaded', entity: 'Document', seniorId: people.senior1.id, outcome: 'SUCCESS', metadata: JSON.stringify({ category: 'DISCHARGE_SUMMARY' }), createdAt: at(-5, 20) },
      { actorUserId: null, actorRole: null, action: 'auth.login.failed', entity: 'User', outcome: 'FAILURE', metadata: JSON.stringify({ reason: 'bad-credentials' }), createdAt: at(-1, 22, 14) },
      { actorUserId: caregivers[3].userId, actorRole: 'CAREGIVER', action: 'authz.capability.denied', entity: 'Capability', entityId: 'invoice:read:all', outcome: 'DENIED', createdAt: at(-2, 15, 3) },
      { actorUserId: admin.id, actorRole: 'ADMIN', action: 'config.service-area.updated', entity: 'ServiceArea', outcome: 'SUCCESS', metadata: JSON.stringify({ name: 'Vashi / Navi Mumbai', isActive: false }), createdAt: at(-30, 11) },
    ],
  });
}
