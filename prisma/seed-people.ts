/**
 * Staff, families and patients, plus the care delivered to them.
 *
 * Three patient stories are seeded because they exercise different parts of the product:
 *   1. Anil Deshmukh, 73 — nine days post-discharge, local daughter pays. Rich timeline.
 *   2. Kamala Joshi, 81 — lives alone in Thane; her caregiver is on emergency leave, which
 *      is what makes the caregiver-replacement workflow demonstrable.
 *   3. The Raghavans, 78 and 82 — both parents in Powai, daughter in Toronto. The NRI case.
 * A fourth (Zarina Merchant) is a prospect awaiting assessment, so the "nothing has
 * happened yet" states are real rather than hypothetical.
 */
import type { PrismaClient } from '@prisma/client';
import { at, list } from './seed-utils';
import type { CatalogueIds } from './seed-catalogue';

export type PeopleIds = Awaited<ReturnType<typeof seedPeople>>;

export async function seedPeople(
  prisma: PrismaClient,
  passwordHash: string,
  catalogue: CatalogueIds,
) {
  const { areas, services, packages, taskTemplates } = catalogue;

  // =====================================================================
  // Internal team
  // =====================================================================
  const admin = await prisma.user.create({
    data: {
      name: 'Asha Menon',
      email: 'admin@medcare.demo',
      phone: '9000000001',
      passwordHash,
      role: 'ADMIN',
      emailVerifiedAt: at(-300),
      phoneVerifiedAt: at(-300),
    },
  });

  const ops = await prisma.user.create({
    data: {
      name: 'Rohit Kulkarni',
      email: 'ops@medcare.demo',
      phone: '9000000002',
      passwordHash,
      role: 'OPS_MANAGER',
      emailVerifiedAt: at(-280),
    },
  });

  // =====================================================================
  // Nurses. The second nurse has no verified registration number recorded,
  // so the UI has to handle "not yet verified" honestly.
  // =====================================================================
  const nurseSeeds = [
    {
      name: 'Sister Leena Fernandes',
      email: 'nurse@medcare.demo',
      phone: '9000000011',
      employeeCode: 'MC-N-001',
      registrationNumber: 'DEMO-RN-1042',
      registrationVerifiedAt: at(-400),
      specialisations: ['post-discharge care', 'chronic care', 'wound care'],
      languages: ['English', 'Marathi', 'Hindi', 'Konkani'],
      experienceYears: 14,
      isCareCoordinator: true,
    },
    {
      name: 'Sister Priya Nair',
      email: 'nurse2@medcare.demo',
      phone: '9000000012',
      employeeCode: 'MC-N-002',
      registrationNumber: null,
      registrationVerifiedAt: null,
      specialisations: ['geriatric care', 'diabetes support'],
      languages: ['English', 'Hindi', 'Malayalam'],
      experienceYears: 9,
      isCareCoordinator: false,
    },
  ];
  const nurses: { id: string; userId: string; name: string }[] = [];
  for (const seed of nurseSeeds) {
    const user = await prisma.user.create({
      data: {
        name: seed.name,
        email: seed.email,
        phone: seed.phone,
        passwordHash,
        role: 'NURSE',
        emailVerifiedAt: at(-260),
        nurseProfile: {
          create: {
            employeeCode: seed.employeeCode,
            registrationNumber: seed.registrationNumber,
            registrationVerifiedAt: seed.registrationVerifiedAt,
            specialisations: list(seed.specialisations),
            languages: list(seed.languages),
            experienceYears: seed.experienceYears,
            isCareCoordinator: seed.isCareCoordinator,
          },
        },
      },
      include: { nurseProfile: true },
    });
    nurses.push({ id: user.nurseProfile!.id, userId: user.id, name: user.name });
  }

  // =====================================================================
  // Caregivers — deliberately mixed verification states and availability.
  // =====================================================================
  const caregiverSeeds = [
    {
      name: 'Sunita Waghmare',
      email: 'caregiver@medcare.demo',
      phone: '9000000021',
      employeeCode: 'MC-C-001',
      verificationStatus: 'VERIFIED',
      status: 'ASSIGNED',
      qualifications: ['GNM assistant course', 'Elder care certificate (internal)'],
      skills: ['mobility-support', 'personal-care', 'medication-reminders', 'vitals-recording'],
      languages: ['Marathi', 'Hindi', 'English'],
      preferredAreas: ['Andheri West', 'Andheri East', 'Khar / Santacruz'],
      experienceYears: 7,
      performanceScore: 91,
      attendanceRate: 97,
      gender: 'FEMALE',
    },
    {
      name: 'Ramesh Pawar',
      email: 'caregiver2@medcare.demo',
      phone: '9000000022',
      employeeCode: 'MC-C-002',
      verificationStatus: 'VERIFIED',
      status: 'ASSIGNED',
      qualifications: ['Attendant training (internal)'],
      skills: ['mobility-support', 'personal-care', 'appointment-escort'],
      languages: ['Marathi', 'Hindi'],
      preferredAreas: ['Borivali', 'Kandivali', 'Malad'],
      experienceYears: 5,
      performanceScore: 84,
      attendanceRate: 93,
      gender: 'MALE',
    },
    {
      name: 'Farida Shaikh',
      email: 'caregiver3@medcare.demo',
      phone: '9000000023',
      employeeCode: 'MC-C-003',
      verificationStatus: 'VERIFIED',
      status: 'AVAILABLE',
      qualifications: ['Elder care certificate (internal)', 'Dementia awareness (in progress)'],
      skills: ['companion-care', 'medication-reminders', 'mobility-support', 'dementia-care'],
      languages: ['Hindi', 'Urdu', 'English', 'Marathi'],
      preferredAreas: ['Andheri West', 'Goregaon', 'Malad', 'Powai'],
      experienceYears: 9,
      performanceScore: 88,
      attendanceRate: 96,
      gender: 'FEMALE',
    },
    {
      name: "Joseph D'Souza",
      email: 'caregiver4@medcare.demo',
      phone: '9000000024',
      employeeCode: 'MC-C-004',
      verificationStatus: 'IN_PROGRESS',
      status: 'AVAILABLE',
      qualifications: ['Attendant training (internal)'],
      skills: ['mobility-support', 'appointment-escort', 'companion-care'],
      languages: ['English', 'Konkani', 'Hindi'],
      preferredAreas: ['Bandra West', 'Khar / Santacruz', 'Thane West'],
      experienceYears: 3,
      performanceScore: 74,
      attendanceRate: 90,
      gender: 'MALE',
    },
    {
      name: 'Kavita Jadhav',
      email: 'caregiver5@medcare.demo',
      phone: '9000000025',
      employeeCode: 'MC-C-005',
      verificationStatus: 'VERIFIED',
      status: 'ON_LEAVE',
      qualifications: ['GNM assistant course'],
      skills: ['personal-care', 'vitals-recording', 'medication-reminders'],
      languages: ['Marathi', 'Hindi'],
      preferredAreas: ['Thane West', 'Powai'],
      experienceYears: 6,
      performanceScore: 86,
      attendanceRate: 88,
      gender: 'FEMALE',
    },
    {
      name: 'Meena Prajapati',
      email: 'caregiver6@medcare.demo',
      phone: '9000000026',
      employeeCode: 'MC-C-006',
      verificationStatus: 'UNVERIFIED',
      status: 'UNDER_REVIEW',
      qualifications: [],
      skills: ['companion-care'],
      languages: ['Hindi', 'Gujarati'],
      preferredAreas: ['Goregaon', 'Malad', 'Thane West'],
      experienceYears: 2,
      performanceScore: 62,
      attendanceRate: 79,
      gender: 'FEMALE',
    },
  ];
  const caregivers: { id: string; userId: string; name: string; code: string }[] = [];
  for (const seed of caregiverSeeds) {
    const user = await prisma.user.create({
      data: {
        name: seed.name,
        email: seed.email,
        phone: seed.phone,
        passwordHash,
        role: 'CAREGIVER',
        emailVerifiedAt: at(-220),
        phoneVerifiedAt: at(-220),
        caregiverProfile: {
          create: {
            employeeCode: seed.employeeCode,
            gender: seed.gender,
            verificationStatus: seed.verificationStatus,
            verifiedAt: seed.verificationStatus === 'VERIFIED' ? at(-200) : null,
            verifiedBy: seed.verificationStatus === 'VERIFIED' ? 'Operations' : null,
            qualifications: list(seed.qualifications),
            skills: list(seed.skills),
            languages: list(seed.languages),
            preferredAreas: list(seed.preferredAreas),
            experienceYears: seed.experienceYears,
            status: seed.status,
            performanceScore: seed.performanceScore,
            attendanceRate: seed.attendanceRate,
          },
        },
      },
      include: { caregiverProfile: true },
    });
    const profile = user.caregiverProfile!;
    caregivers.push({ id: profile.id, userId: user.id, name: user.name, code: seed.employeeCode });

    for (const dayOfWeek of [1, 2, 3, 4, 5, 6]) {
      await prisma.staffAvailability.create({
        data: { caregiverId: profile.id, dayOfWeek, startTime: '08:00', endTime: '20:00' },
      });
    }

    if (seed.verificationStatus === 'VERIFIED') {
      await prisma.staffDocument.createMany({
        data: [
          {
            caregiverId: profile.id,
            category: 'ID_PROOF',
            label: 'Photo ID (demo placeholder)',
            storageKey: `demo/${seed.employeeCode}-id`,
            mimeType: 'application/pdf',
            sizeBytes: 148000,
            verifiedAt: at(-200),
            verifiedBy: 'Operations',
          },
          {
            caregiverId: profile.id,
            category: 'POLICE_VERIFICATION',
            label: 'Police verification (demo placeholder)',
            storageKey: `demo/${seed.employeeCode}-pv`,
            mimeType: 'application/pdf',
            sizeBytes: 212000,
            verifiedAt: at(-190),
            verifiedBy: 'Operations',
          },
        ],
      });
      await prisma.trainingRecord.create({
        data: {
          caregiverId: profile.id,
          courseName: 'Elder care fundamentals (internal)',
          completedAt: at(-180),
          score: 82,
        },
      });
    }
  }

  // Kavita's approved emergency leave is what drives the replacement demo.
  await prisma.leaveRequest.create({
    data: {
      caregiverId: caregivers[4].id,
      fromDate: at(-1, 0, 0),
      toDate: at(6, 23, 59),
      reason: 'Family medical situation out of town.',
      type: 'EMERGENCY',
      status: 'APPROVED',
      decidedAt: at(-2, 18),
      decidedBy: 'Rohit Kulkarni',
      decisionNote: 'Approved. Replacement cover to be arranged for the Thane patient.',
    },
  });
  await prisma.leaveRequest.create({
    data: {
      caregiverId: caregivers[1].id,
      fromDate: at(20, 0, 0),
      toDate: at(24, 23, 59),
      reason: 'Planned family function.',
      type: 'PLANNED',
      status: 'PENDING',
    },
  });

  // =====================================================================
  // Referral partners
  // =====================================================================
  const partnerSeeds = [
    {
      name: 'Dr. Vivek Rane',
      email: 'partner@medcare.demo',
      phone: '9000000031',
      organisationName: 'Rane Geriatric Clinic (demo)',
      partnerType: 'GERIATRICIAN',
      contactPerson: 'Dr. Vivek Rane',
      designation: 'Consulting geriatrician',
      area: 'Andheri West',
      attributionCode: 'PART-RANE',
    },
    {
      name: 'Nisha Bhatt',
      email: 'partner2@medcare.demo',
      phone: '9000000032',
      organisationName: 'Westside Multispeciality Hospital (demo)',
      partnerType: 'HOSPITAL',
      contactPerson: 'Nisha Bhatt',
      designation: 'Discharge coordinator',
      area: 'Goregaon',
      attributionCode: 'PART-WESTSIDE',
    },
  ];
  const partners: { id: string; userId: string; name: string; org: string }[] = [];
  for (const seed of partnerSeeds) {
    const user = await prisma.user.create({
      data: {
        name: seed.name,
        email: seed.email,
        phone: seed.phone,
        passwordHash,
        role: 'REFERRAL_PARTNER',
        emailVerifiedAt: at(-150),
        partnerProfile: {
          create: {
            organisationName: seed.organisationName,
            partnerType: seed.partnerType,
            contactPerson: seed.contactPerson,
            designation: seed.designation,
            area: seed.area,
            attributionCode: seed.attributionCode,
            agreementStatus: 'ACTIVE',
          },
        },
      },
      include: { partnerProfile: true },
    });
    partners.push({
      id: user.partnerProfile!.id,
      userId: user.id,
      name: user.name,
      org: seed.organisationName,
    });
  }

  // =====================================================================
  // Patient 1 — Anil Deshmukh, 73, nine days post-discharge.
  // =====================================================================
  const familyUser1 = await prisma.user.create({
    data: {
      name: 'Priyanka Deshmukh',
      email: 'family@medcare.demo',
      phone: '9000000101',
      passwordHash,
      role: 'FAMILY',
      emailVerifiedAt: at(-11),
      phoneVerifiedAt: at(-11),
      familyProfile: {
        create: {
          relationship: 'DAUGHTER',
          city: 'Mumbai',
          country: 'India',
          isNri: false,
          preferredChannel: 'WHATSAPP',
          bestTimeToCall: 'After 7pm on weekdays',
        },
      },
    },
    include: { familyProfile: true },
  });
  const family1 = familyUser1.familyProfile!;

  const senior1 = await prisma.senior.create({
    data: {
      firstName: 'Anil',
      lastName: 'Deshmukh',
      ageYears: 73,
      gender: 'MALE',
      addressLine: 'Flat 802, Sunbeam Apartments, Andheri West',
      area: 'Andheri West',
      pincode: '400053',
      serviceAreaId: areas['Andheri West'],
      livingArrangement: 'WITH_SPOUSE',
      mobility: 'WALKING_AID',
      conditions: list(['Type 2 diabetes', 'Hypertension', 'Recent hip surgery']),
      allergies: 'None recorded',
      languages: list(['Marathi', 'Hindi', 'English']),
      status: 'ACTIVE',
      emergencyContactName: 'Priyanka Deshmukh',
      emergencyContactPhone: '9000000101',
      hospitalPreference: 'Nearest hospital with orthopaedic cover',
      consentCapturedAt: at(-10),
      consentCapturedBy: 'Priyanka Deshmukh (daughter)',
      supervisingNurseId: nurses[0].id,
      notes: 'Prefers Marathi-speaking caregivers. Walks with a walker since surgery.',
      familyLinks: {
        create: {
          familyProfileId: family1.id,
          relationship: 'DAUGHTER',
          isPrimaryContact: true,
          isPrimaryPayer: true,
          canViewClinical: true,
        },
      },
    },
  });

  // A senior login, so the accessibility-first interface is demonstrable.
  const seniorUser1 = await prisma.user.create({
    data: {
      name: 'Anil Deshmukh',
      email: 'senior@medcare.demo',
      phone: '9000000201',
      passwordHash,
      role: 'SENIOR',
      phoneVerifiedAt: at(-9),
      textScale: 'large',
      seniorAccount: { connect: { id: senior1.id } },
    },
  });

  const assessment1 = await prisma.assessment.create({
    data: {
      seniorId: senior1.id,
      type: 'HOME_VISIT',
      status: 'COMPLETED',
      requestedFor: at(-10, 10),
      scheduledAt: at(-9, 11),
      completedAt: at(-9, 12, 30),
      nurseId: nurses[0].id,
      summary:
        'Home visit completed nine days after discharge following hip surgery. Mobility limited to walker-assisted short distances. Bathroom lacks grab support. Medication list of six items, currently managed by the spouse with occasional confusion between morning and evening doses. Family goal is to avoid a readmission and rebuild confidence walking.',
      riskFlags: list(['FALL_RISK', 'MEDICATION_COMPLEXITY', 'POST_SURGICAL']),
      recommendedPackageSlug: '14-day-post-discharge-recovery',
      followUpNotes: 'Recommend grab-rail installation and nurse reviews on day 3 and day 10.',
    },
  });

  const plan1 = await prisma.carePlan.create({
    data: {
      seniorId: senior1.id,
      assessmentId: assessment1.id,
      packageId: packages['14-day-post-discharge-recovery'],
      title: 'Post-discharge recovery plan — hip surgery',
      version: 2,
      status: 'ACTIVE',
      primaryGoals: list([
        'No readmission during the recovery fortnight',
        'Walk to the building lobby unaided by day 14',
        'Medication taken correctly at every scheduled time',
      ]),
      careRequirements: list([
        'Walker-assisted mobility support twice daily',
        'Medication reminders at 08:00, 14:00 and 21:00',
        'Blood pressure and glucose recorded daily',
        'Bathroom safety support until the grab rail is fitted',
      ]),
      scheduleSummary: 'Caregiver 08:00–14:00 daily. Nurse review on day 3 and day 10.',
      mobilityNotes: 'Walker at all times. No stairs. Two-person assist for any car transfer.',
      dietaryNotes: 'Diabetic diet as advised at discharge. Encourage fluids through the day.',
      familyPreferences: 'Daughter prefers WhatsApp updates by 8pm. Marathi-speaking caregiver.',
      escalationPreferences:
        'Call the daughter first. If unreachable within 15 minutes, call the spouse. Emergency services first if the situation is urgent.',
      startDate: at(-9),
      reviewDate: at(5),
      authoredByNurseId: nurses[0].id,
      approvedAt: at(-9, 14),
      approvedBy: 'Sister Leena Fernandes',
      services: {
        create: [
          { serviceId: services['attendant-support'], frequency: 'DAILY', quantity: 6, durationMinutes: 360 },
          { serviceId: services['nurse-review-visit'], frequency: 'FORTNIGHTLY', quantity: 2, durationMinutes: 60 },
          { serviceId: services['medication-reminder-support'], frequency: 'DAILY', quantity: 3 },
          { serviceId: services['vitals-monitoring'], frequency: 'DAILY', quantity: 1 },
        ],
      },
      versions: {
        create: [
          {
            version: 1,
            snapshot: JSON.stringify({
              title: 'Post-discharge recovery plan — hip surgery',
              goals: ['No readmission', 'Medication adherence'],
              schedule: 'Caregiver 09:00–13:00 daily',
            }),
            changeNote: 'Initial plan created after the home assessment.',
            createdBy: 'Sister Leena Fernandes',
            createdAt: at(-9, 14),
          },
          {
            version: 2,
            snapshot: JSON.stringify({
              title: 'Post-discharge recovery plan — hip surgery',
              goals: ['No readmission', 'Walk to lobby unaided by day 14', 'Medication adherence'],
              schedule: 'Caregiver 08:00–14:00 daily',
            }),
            changeNote:
              'Extended the caregiver shift by two hours and added a walking goal after the day-3 nurse review.',
            createdBy: 'Sister Leena Fernandes',
            createdAt: at(-6, 16),
          },
        ],
      },
    },
  });

  const assignment1 = await prisma.caregiverAssignment.create({
    data: {
      seniorId: senior1.id,
      caregiverId: caregivers[0].id,
      role: 'PRIMARY',
      shiftPattern: 'MORNING',
      shiftStart: '08:00',
      shiftEnd: '14:00',
      daysOfWeek: list(['0', '1', '2', '3', '4', '5', '6']),
      status: 'ACTIVE',
      startDate: at(-9),
      matchScore: 92,
      matchExplanation:
        'Already works in Andheri West · Speaks Marathi as the family asked · Has every skill the care plan needs · 7 years of experience',
    },
  });

  const medications1 = await Promise.all([
    prisma.medication.create({
      data: {
        seniorId: senior1.id,
        name: 'Metformin',
        dose: '500 mg',
        form: 'TABLET',
        timings: list(['08:00', '21:00']),
        instructions: 'After food. Entered from the discharge summary.',
        prescribedBy: 'Discharging hospital team (recorded for reference only)',
        startDate: at(-9),
        enteredByUserId: nurses[0].userId,
      },
    }),
    prisma.medication.create({
      data: {
        seniorId: senior1.id,
        name: 'Amlodipine',
        dose: '5 mg',
        form: 'TABLET',
        timings: list(['08:00']),
        instructions: 'Morning, with water.',
        prescribedBy: 'Discharging hospital team (recorded for reference only)',
        startDate: at(-9),
        enteredByUserId: nurses[0].userId,
      },
    }),
    prisma.medication.create({
      data: {
        seniorId: senior1.id,
        name: 'Paracetamol',
        dose: '650 mg',
        form: 'TABLET',
        timings: list(['14:00']),
        instructions: 'Only if pain is reported. Record whether it was needed.',
        prescribedBy: 'Discharging hospital team (recorded for reference only)',
        startDate: at(-9),
        endDate: at(3),
        enteredByUserId: nurses[0].userId,
      },
    }),
  ]);

  // Thirteen days of shifts: history behind, one running now, more ahead.
  for (let offset = -9; offset <= 3; offset += 1) {
    const isPast = offset < 0;
    const isToday = offset === 0;
    const missed = offset === -4;
    const status = missed
      ? 'MISSED'
      : isPast
        ? 'COMPLETED'
        : isToday
          ? 'IN_PROGRESS'
          : 'SCHEDULED';
    const completed = status === 'COMPLETED';
    const refusedHygiene = completed && offset === -7;

    const visit = await prisma.visit.create({
      data: {
        seniorId: senior1.id,
        kind: 'CAREGIVER_SHIFT',
        caregiverId: missed ? caregivers[0].id : caregivers[0].id,
        assignmentId: assignment1.id,
        carePlanId: plan1.id,
        scheduledStart: at(offset, 8, 0),
        scheduledEnd: at(offset, 14, 0),
        checkInAt: completed ? at(offset, 8, 6) : isToday ? at(0, 8, 12) : null,
        checkOutAt: completed ? at(offset, 14, 4) : null,
        checkInLat: completed || isToday ? 19.1364 : null,
        checkInLng: completed || isToday ? 72.8296 : null,
        checkInAccuracyM: completed || isToday ? 24 : null,
        locationVerified: completed || isToday,
        status,
        instructions:
          'Walker at all times. Reminders at 08:00 and 14:00. Record blood pressure and glucose.',
        summary: completed
          ? 'Morning routine completed. Walked the length of the corridor twice with the walker.'
          : null,
        cancelReason: missed
          ? 'Caregiver was held up by a local train disruption; cover could not reach in time.'
          : null,
        tasks: {
          create: [
            {
              templateId: taskTemplates['mobility-assist'],
              label: 'Help with walking and moving around',
              status: completed || isToday ? 'DONE' : 'PENDING',
              completedAt: completed ? at(offset, 9, 10) : isToday ? at(0, 9, 5) : null,
              sortOrder: 0,
            },
            {
              templateId: taskTemplates['breakfast-support'],
              label: 'Breakfast support',
              status: completed || isToday ? 'DONE' : 'PENDING',
              completedAt: completed ? at(offset, 9, 30) : isToday ? at(0, 9, 25) : null,
              sortOrder: 1,
            },
            {
              templateId: taskTemplates['medication-reminder'],
              label: 'Medication reminder',
              status: completed || isToday ? 'DONE' : 'PENDING',
              completedAt: completed ? at(offset, 8, 20) : isToday ? at(0, 8, 22) : null,
              sortOrder: 2,
            },
            {
              templateId: taskTemplates['record-vitals'],
              label: 'Record agreed vitals',
              status: completed ? 'DONE' : 'PENDING',
              completedAt: completed ? at(offset, 10, 0) : null,
              sortOrder: 3,
            },
            {
              templateId: taskTemplates['personal-hygiene'],
              label: 'Personal hygiene support',
              status: refusedHygiene ? 'REFUSED' : completed ? 'DONE' : 'PENDING',
              completedAt: completed && !refusedHygiene ? at(offset, 11, 0) : null,
              note: refusedHygiene
                ? 'Declined a bath today, said he would prefer tomorrow. Reported to the nurse.'
                : null,
              sortOrder: 4,
            },
            {
              templateId: taskTemplates['companion-time'],
              label: 'Conversation and companionship',
              status: completed ? 'DONE' : 'PENDING',
              completedAt: completed ? at(offset, 12, 30) : null,
              sortOrder: 5,
            },
          ],
        },
      },
    });

    if (completed) {
      await prisma.careNote.create({
        data: {
          seniorId: senior1.id,
          visitId: visit.id,
          authorUserId: caregivers[0].userId,
          authorRole: 'CAREGIVER',
          type: refusedHygiene ? 'REFUSAL' : 'DAILY',
          body: refusedHygiene
            ? 'Declined bathing support this morning, said he felt tired. Everything else completed as planned. Encouraged fluids.'
            : 'Good morning overall. Walked the corridor twice with the walker without pain. Ate a full breakfast. Mood was cheerful.',
          visibleToFamily: true,
          requiresReview: refusedHygiene,
          reviewedAt: refusedHygiene ? at(-6, 16) : null,
          reviewedBy: refusedHygiene ? 'Sister Leena Fernandes' : null,
          createdAt: at(offset, 14, 10),
        },
      });

      // One reading out of band, on day -3, which drives the incident below.
      const outOfBand = offset === -3;
      await prisma.vital.create({
        data: {
          seniorId: senior1.id,
          visitId: visit.id,
          type: 'BLOOD_PRESSURE',
          valueNumber: outOfBand ? 162 : 126 + Math.abs(offset % 4) * 4,
          valueSecondary: outOfBand ? 98 : 78 + Math.abs(offset % 3) * 2,
          unit: 'mmHg',
          context: 'RESTING',
          measuredAt: at(offset, 10, 0),
          recordedByUserId: caregivers[0].userId,
          flag: outOfBand ? 'REQUIRES_REVIEW' : 'NORMAL',
          note: outOfBand ? 'Recorded twice, five minutes apart, with the same result.' : null,
          reviewedAt: outOfBand ? at(-3, 12) : null,
          reviewedBy: outOfBand ? 'Sister Leena Fernandes' : null,
        },
      });
      await prisma.vital.create({
        data: {
          seniorId: senior1.id,
          visitId: visit.id,
          type: 'BLOOD_GLUCOSE',
          valueNumber: 112 + Math.abs(offset % 5) * 9,
          unit: 'mg/dL',
          context: 'FASTING',
          measuredAt: at(offset, 8, 30),
          recordedByUserId: caregivers[0].userId,
          flag: 'NORMAL',
        },
      });
    }

    if (missed) {
      await prisma.careNote.create({
        data: {
          seniorId: senior1.id,
          visitId: visit.id,
          authorUserId: ops.id,
          authorRole: 'OPS_MANAGER',
          type: 'FAMILY_COMMUNICATION',
          body:
            'Visit could not be covered because of a local train disruption. Called the daughter at 08:40 to tell her; the spouse managed the morning routine and reminders were given over the phone. A make-up visit was added the following day.',
          visibleToFamily: true,
          createdAt: at(offset, 8, 45),
        },
      });
    }

    const reminderSlots: { medicationId: string; hour: number; status: string }[] = [
      { medicationId: medications1[0].id, hour: 8, status: isPast ? (offset === -5 ? 'MISSED' : 'CONFIRMED') : isToday ? 'CONFIRMED' : 'PENDING' },
      { medicationId: medications1[1].id, hour: 8, status: isPast || isToday ? 'CONFIRMED' : 'PENDING' },
      { medicationId: medications1[2].id, hour: 14, status: isPast ? (offset % 3 === 0 ? 'SKIPPED' : 'CONFIRMED') : 'PENDING' },
      { medicationId: medications1[0].id, hour: 21, status: isPast ? 'CONFIRMED' : 'PENDING' },
    ];
    for (const slot of reminderSlots) {
      await prisma.medicationReminder.create({
        data: {
          medicationId: slot.medicationId,
          seniorId: senior1.id,
          dueAt: at(offset, slot.hour, 0),
          status: slot.status,
          actedAt: slot.status === 'CONFIRMED' ? at(offset, slot.hour, 6) : null,
          actedByUserId: slot.status === 'CONFIRMED' ? caregivers[0].userId : null,
          note: slot.status === 'SKIPPED' ? 'No pain reported, so paracetamol was not needed.' : null,
        },
      });
    }
  }

  const nurseVisit1 = await prisma.visit.create({
    data: {
      seniorId: senior1.id,
      kind: 'NURSE_REVIEW',
      nurseId: nurses[0].id,
      carePlanId: plan1.id,
      scheduledStart: at(-6, 15, 0),
      scheduledEnd: at(-6, 16, 0),
      checkInAt: at(-6, 15, 5),
      checkOutAt: at(-6, 16, 10),
      status: 'COMPLETED',
      summary:
        'Day-3 review. Wound site clean and dry. Mobility improving. Care plan updated to version 2.',
    },
  });
  await prisma.careNote.create({
    data: {
      seniorId: senior1.id,
      visitId: nurseVisit1.id,
      authorUserId: nurses[0].userId,
      authorRole: 'NURSE',
      type: 'NURSE_REVIEW',
      body:
        'Day-3 review completed. Surgical site clean and dry with no signs of inflammation. Pain reported as 3/10 on movement, down from 6/10 at discharge. Walker use is correct. Extended the caregiver shift to 14:00 so the afternoon medication slot is supervised, and added a walking goal. Discussed the refused bathing episode with the caregiver — the approach was adjusted to offer it after the morning walk instead.',
      visibleToFamily: true,
      createdAt: at(-6, 16, 15),
    },
  });
  await prisma.visit.create({
    data: {
      seniorId: senior1.id,
      kind: 'NURSE_REVIEW',
      nurseId: nurses[0].id,
      carePlanId: plan1.id,
      scheduledStart: at(1, 15, 0),
      scheduledEnd: at(1, 16, 0),
      status: 'SCHEDULED',
      instructions: 'Day-10 review. Check the wound, reassess the mobility goal, decide on ongoing support.',
    },
  });

  const incident1 = await prisma.incident.create({
    data: {
      reference: 'INC-4K2M9P',
      seniorId: senior1.id,
      type: 'HEALTH_CONCERN',
      severity: 'MEDIUM',
      title: 'Blood pressure reading outside the expected range',
      description:
        'Morning blood pressure recorded at 162/98 mmHg, above the configured review band. Reading repeated after five minutes with the same result. Senior reported no dizziness, chest discomfort or breathlessness. Caregiver escalated to the nurse supervisor as set out in the care plan.',
      reportedByUserId: caregivers[0].userId,
      reportedAt: at(-3, 10, 15),
      status: 'RESOLVED',
      severityConfirmedBy: 'Sister Leena Fernandes',
      familyNotifiedAt: at(-3, 10, 40),
      actionsTaken:
        'Nurse supervisor reviewed within the hour and spoke to the senior and the daughter. Advised the family to raise it at the scheduled follow-up with the treating doctor. Added an extra evening reading for three days.',
      resolution:
        'Readings returned to the expected band over the following two days. The treating doctor was informed by the family at the follow-up appointment. We made no change to any medication.',
      resolvedAt: at(-1, 11),
    },
  });
  await prisma.escalation.create({
    data: {
      seniorId: senior1.id,
      incidentId: incident1.id,
      trigger: 'VITAL_REVIEW',
      level: 'NURSE',
      reason: 'Blood pressure reading above the configured review band, repeated.',
      raisedByUserId: caregivers[0].userId,
      raisedAt: at(-3, 10, 18),
      acknowledgedAt: at(-3, 10, 34),
      acknowledgedBy: 'Sister Leena Fernandes',
      closedAt: at(-1, 11),
      closureNote: 'Reviewed, family informed, no clinical conclusion drawn by the platform.',
    },
  });

  await prisma.appointment.createMany({
    data: [
      {
        seniorId: senior1.id,
        title: 'Orthopaedic follow-up',
        doctorName: 'Treating orthopaedic surgeon',
        facility: 'Discharging hospital, outpatient department',
        specialty: 'Orthopaedics',
        scheduledAt: at(2, 11, 30),
        durationMinutes: 45,
        purpose: 'Post-operative review at two weeks. Take the discharge summary and the readings log.',
        transportRequired: true,
        companionRequired: true,
        companionCaregiverId: caregivers[0].id,
        reminderAt: at(1, 18),
        status: 'SCHEDULED',
        createdByUserId: nurses[0].userId,
      },
      {
        seniorId: senior1.id,
        title: 'Diabetology review',
        doctorName: 'Consulting diabetologist',
        facility: 'Local clinic, Andheri West',
        specialty: 'Endocrinology',
        scheduledAt: at(-5, 10, 0),
        durationMinutes: 30,
        purpose: 'Review of glucose readings since discharge.',
        companionRequired: true,
        status: 'COMPLETED',
        outcomeNotes:
          'Family attended. Advised to continue the current routine and repeat readings in a month.',
        createdByUserId: familyUser1.id,
      },
    ],
  });

  await prisma.document.createMany({
    data: [
      { seniorId: senior1.id, category: 'DISCHARGE_SUMMARY', label: 'Discharge summary (demo placeholder)', storageKey: 'demo/discharge-anil', mimeType: 'application/pdf', sizeBytes: 384000, uploadedByUserId: familyUser1.id, uploadedAt: at(-10, 19) },
      { seniorId: senior1.id, category: 'PRESCRIPTION', label: 'Discharge medication list (demo placeholder)', storageKey: 'demo/prescription-anil', mimeType: 'application/pdf', sizeBytes: 122000, uploadedByUserId: familyUser1.id, uploadedAt: at(-10, 19, 5) },
      { seniorId: senior1.id, category: 'CARE_PLAN', label: 'Care plan v2 (demo placeholder)', storageKey: 'demo/careplan-anil-v2', mimeType: 'application/pdf', sizeBytes: 96000, uploadedByUserId: nurses[0].userId, uploadedAt: at(-6, 17) },
    ],
  });

  await prisma.feedback.create({
    data: {
      seniorId: senior1.id,
      authorUserId: familyUser1.id,
      type: 'RATING',
      rating: 5,
      subject: 'Caregiver has been excellent',
      comment:
        'Sunita is punctual and my father actually looks forward to the mornings now. The daily updates mean I am not calling constantly to check.',
      status: 'CLOSED',
      createdAt: at(-4, 21),
    },
  });

  // =====================================================================
  // Patient 2 — Kamala Joshi, 81, lives alone in Thane. Caregiver on leave.
  // =====================================================================
  const familyUser2 = await prisma.user.create({
    data: {
      name: 'Sameer Joshi',
      email: 'family2@medcare.demo',
      phone: '9000000102',
      passwordHash,
      role: 'FAMILY',
      emailVerifiedAt: at(-70),
      familyProfile: {
        create: {
          relationship: 'SON',
          city: 'Mumbai',
          country: 'India',
          isNri: false,
          preferredChannel: 'PHONE',
          bestTimeToCall: 'Lunch hour, 1–2pm',
          notes: 'Works full time; hard to reach during the day.',
        },
      },
    },
    include: { familyProfile: true },
  });
  const family2 = familyUser2.familyProfile!;

  const senior2 = await prisma.senior.create({
    data: {
      firstName: 'Kamala',
      lastName: 'Joshi',
      ageYears: 81,
      gender: 'FEMALE',
      addressLine: 'Row House 4, Green Meadows, Thane West',
      area: 'Thane West',
      pincode: '400601',
      serviceAreaId: areas['Thane West'],
      livingArrangement: 'ALONE',
      mobility: 'WALKING_AID',
      conditions: list(['Osteoarthritis', 'Hypothyroidism', 'Reduced vision']),
      languages: list(['Marathi', 'Hindi']),
      status: 'ACTIVE',
      emergencyContactName: 'Sameer Joshi',
      emergencyContactPhone: '9000000102',
      consentCapturedAt: at(-70),
      consentCapturedBy: 'Kamala Joshi (self)',
      supervisingNurseId: nurses[1].id,
      notes: 'Lives alone. Son visits at weekends. Reduced vision — keep the floor clear.',
      familyLinks: {
        create: {
          familyProfileId: family2.id,
          relationship: 'SON',
          isPrimaryContact: true,
          isPrimaryPayer: true,
          canViewClinical: true,
        },
      },
    },
  });

  const plan2 = await prisma.carePlan.create({
    data: {
      seniorId: senior2.id,
      packageId: packages['monthly-chronic-care-support'],
      title: 'Monthly chronic care plan — arthritis and thyroid',
      version: 3,
      status: 'ACTIVE',
      primaryGoals: list([
        'Reduce fall risk in the home',
        'Thyroid medication taken at the same time every morning',
        'At least one social interaction a day',
      ]),
      careRequirements: list([
        'Alternate-day caregiver visits, four hours',
        'Medication reminder at 07:30 daily',
        'Weekly blood pressure and weight',
        'Clear walking routes, especially at night',
      ]),
      scheduleSummary: 'Caregiver alternate days 09:00–13:00. Nurse review monthly.',
      mobilityNotes: 'Stick indoors, walker outdoors. Reduced vision — announce yourself on entry.',
      dietaryNotes: 'Low salt. Prefers home-cooked Maharashtrian food.',
      familyPreferences: 'Son prefers a phone call at lunchtime rather than messages during the day.',
      escalationPreferences: 'Call the son. If unreachable, call the neighbour listed in the plan.',
      startDate: at(-68),
      reviewDate: at(8),
      authoredByNurseId: nurses[1].id,
      approvedAt: at(-68, 15),
      approvedBy: 'Sister Priya Nair',
      services: {
        create: [
          { serviceId: services['attendant-support'], frequency: 'ALTERNATE_DAYS', quantity: 4, durationMinutes: 240 },
          { serviceId: services['nurse-review-visit'], frequency: 'MONTHLY', quantity: 1 },
          { serviceId: services['medication-reminder-support'], frequency: 'DAILY', quantity: 1 },
          { serviceId: services['companion-visits'], frequency: 'WEEKLY', quantity: 2 },
        ],
      },
      versions: {
        create: [
          { version: 1, snapshot: JSON.stringify({ schedule: 'Caregiver twice weekly' }), changeNote: 'Initial plan.', createdBy: 'Sister Priya Nair', createdAt: at(-68, 15) },
          { version: 2, snapshot: JSON.stringify({ schedule: 'Caregiver alternate days' }), changeNote: 'Increased to alternate days after a near-fall in the bathroom.', createdBy: 'Sister Priya Nair', createdAt: at(-40, 12) },
          { version: 3, snapshot: JSON.stringify({ schedule: 'Caregiver alternate days 09:00–13:00', additions: ['Companion visits'] }), changeNote: 'Added companion visits — the son raised that she was low after her sister moved away.', createdBy: 'Sister Priya Nair', createdAt: at(-14, 11) },
        ],
      },
    },
  });

  const assignment2 = await prisma.caregiverAssignment.create({
    data: {
      seniorId: senior2.id,
      caregiverId: caregivers[4].id,
      role: 'PRIMARY',
      shiftPattern: 'DAY',
      shiftStart: '09:00',
      shiftEnd: '13:00',
      daysOfWeek: list(['1', '3', '5']),
      status: 'NEEDS_REPLACEMENT',
      startDate: at(-68),
      matchScore: 84,
      matchExplanation: 'Works in Thane West · Speaks Marathi · Has the required skills',
    },
  });

  for (const offset of [-12, -10, -8, -6, -4, -2]) {
    const concern = offset === -4;
    const visit = await prisma.visit.create({
      data: {
        seniorId: senior2.id,
        kind: 'CAREGIVER_SHIFT',
        caregiverId: caregivers[4].id,
        assignmentId: assignment2.id,
        carePlanId: plan2.id,
        scheduledStart: at(offset, 9, 0),
        scheduledEnd: at(offset, 13, 0),
        checkInAt: at(offset, 9, 3),
        checkOutAt: at(offset, 13, 2),
        checkInLat: 19.2183,
        checkInLng: 72.9781,
        checkInAccuracyM: 31,
        locationVerified: true,
        status: 'COMPLETED',
        summary: 'Routine visit completed. Walked in the garden for fifteen minutes.',
        tasks: {
          create: [
            { templateId: taskTemplates['medication-reminder'], label: 'Medication reminder', status: 'DONE', completedAt: at(offset, 9, 10), sortOrder: 0 },
            { templateId: taskTemplates['mobility-assist'], label: 'Help with walking and moving around', status: 'DONE', completedAt: at(offset, 10, 0), sortOrder: 1 },
            { templateId: taskTemplates['light-activity'], label: 'Light activity or short walk', status: concern ? 'NOT_APPLICABLE' : 'DONE', completedAt: concern ? null : at(offset, 10, 40), note: concern ? 'Knee pain, so exercises were done sitting down instead.' : null, sortOrder: 2 },
            { templateId: taskTemplates['lunch-support'], label: 'Lunch support', status: 'DONE', completedAt: at(offset, 12, 30), sortOrder: 3 },
            { templateId: taskTemplates['tidy-care-space'], label: "Tidy the senior's room and care items", status: 'DONE', completedAt: at(offset, 12, 50), sortOrder: 4 },
          ],
        },
      },
    });
    await prisma.careNote.create({
      data: {
        seniorId: senior2.id,
        visitId: visit.id,
        authorUserId: caregivers[4].userId,
        authorRole: 'CAREGIVER',
        type: concern ? 'CONCERN' : 'DAILY',
        body: concern
          ? 'Complained of knee pain today, more than usual, and did not want to walk far. Rested instead and did the exercises sitting down. Told the nurse.'
          : 'Comfortable day. Ate well and walked in the garden. Talked about her grandchildren for most of the visit.',
        visibleToFamily: true,
        requiresReview: concern,
        reviewedAt: concern ? at(-3, 10) : null,
        reviewedBy: concern ? 'Sister Priya Nair' : null,
        createdAt: at(offset, 13, 10),
      },
    });
    if (offset % 4 === 0) {
      await prisma.vital.createMany({
        data: [
          { seniorId: senior2.id, visitId: visit.id, type: 'BLOOD_PRESSURE', valueNumber: 134, valueSecondary: 82, unit: 'mmHg', context: 'RESTING', measuredAt: at(offset, 9, 40), recordedByUserId: caregivers[4].userId, flag: 'NORMAL' },
          { seniorId: senior2.id, visitId: visit.id, type: 'WEIGHT', valueNumber: 58.4 + offset * 0.05, unit: 'kg', measuredAt: at(offset, 9, 45), recordedByUserId: caregivers[4].userId, flag: 'NORMAL' },
        ],
      });
    }
  }

  // Upcoming visits with no caregiver attached — what the replacement flow fixes.
  for (const offset of [1, 3, 5]) {
    await prisma.visit.create({
      data: {
        seniorId: senior2.id,
        kind: 'CAREGIVER_SHIFT',
        assignmentId: assignment2.id,
        carePlanId: plan2.id,
        scheduledStart: at(offset, 9, 0),
        scheduledEnd: at(offset, 13, 0),
        status: 'SCHEDULED',
        atRisk: true,
        instructions: 'Cover needed — the assigned caregiver is on approved leave.',
      },
    });
  }

  const incident2 = await prisma.incident.create({
    data: {
      reference: 'INC-8Q3R7T',
      seniorId: senior2.id,
      type: 'CAREGIVER_UNAVAILABLE',
      severity: 'MEDIUM',
      title: 'Assigned caregiver on emergency leave — cover required',
      description:
        'The primary caregiver has been granted emergency leave for seven days. Three scheduled visits are affected. A replacement match has been run and cover is being arranged.',
      reportedByUserId: ops.id,
      reportedAt: at(-1, 9, 30),
      status: 'UNDER_REVIEW',
      familyNotifiedAt: at(-1, 10),
      actionsTaken: 'Replacement match run. Family informed by phone the same morning.',
    },
  });
  await prisma.escalation.create({
    data: {
      seniorId: senior2.id,
      incidentId: incident2.id,
      trigger: 'CAREGIVER_UNAVAILABLE',
      level: 'OPS',
      reason: 'Primary caregiver on approved emergency leave; three visits affected.',
      raisedByUserId: ops.id,
      raisedAt: at(-1, 9, 35),
      acknowledgedAt: at(-1, 9, 50),
      acknowledgedBy: 'Rohit Kulkarni',
    },
  });

  await prisma.medication.create({
    data: {
      seniorId: senior2.id,
      name: 'Levothyroxine',
      dose: '50 mcg',
      form: 'TABLET',
      timings: list(['07:30']),
      instructions: 'Empty stomach, 30 minutes before food. Entered from the current prescription.',
      prescribedBy: 'Consulting physician (recorded for reference only)',
      startDate: at(-68),
      enteredByUserId: nurses[1].userId,
      reminders: {
        create: [-3, -2, -1, 0, 1].map((offset) => ({
          seniorId: senior2.id,
          dueAt: at(offset, 7, 30),
          status: offset < 0 ? (offset === -2 ? 'MISSED' : 'CONFIRMED') : 'PENDING',
          actedAt: offset < 0 && offset !== -2 ? at(offset, 7, 36) : null,
        })),
      },
    },
  });

  await prisma.appointment.create({
    data: {
      seniorId: senior2.id,
      title: 'Thyroid function test',
      facility: 'Local diagnostic centre, Thane West',
      scheduledAt: at(4, 8, 30),
      durationMinutes: 30,
      purpose: 'Six-monthly test. Fasting sample.',
      transportRequired: true,
      companionRequired: true,
      reminderAt: at(3, 18),
      status: 'SCHEDULED',
      createdByUserId: nurses[1].userId,
    },
  });

  await prisma.feedback.create({
    data: {
      seniorId: senior2.id,
      authorUserId: familyUser2.id,
      type: 'COMPLAINT',
      subject: 'Not told about the caregiver change quickly enough',
      comment:
        'I understand the caregiver had an emergency, but I found out at 10am when the visit was already due at 9. I would rather hear about it the night before.',
      status: 'IN_PROGRESS',
      createdAt: at(-1, 12),
    },
  });

  // =====================================================================
  // Patients 3 & 4 — the Raghavans in Powai, daughter in Toronto.
  // =====================================================================
  const familyUser3 = await prisma.user.create({
    data: {
      name: 'Neha Raghavan',
      email: 'nri@medcare.demo',
      phone: '+14165550142',
      passwordHash,
      role: 'FAMILY',
      timezone: 'America/Toronto',
      emailVerifiedAt: at(-46),
      familyProfile: {
        create: {
          relationship: 'DAUGHTER',
          city: 'Toronto',
          country: 'Canada',
          isNri: true,
          preferredChannel: 'EMAIL',
          bestTimeToCall: 'Weekday mornings Toronto time (evening IST)',
          notes: 'Both parents in Mumbai. Visits India twice a year.',
        },
      },
    },
    include: { familyProfile: true },
  });
  const family3 = familyUser3.familyProfile!;

  const senior3 = await prisma.senior.create({
    data: {
      firstName: 'Lakshmi',
      lastName: 'Raghavan',
      ageYears: 78,
      gender: 'FEMALE',
      addressLine: 'Flat 1204, Palm Court, Powai',
      area: 'Powai',
      pincode: '400076',
      serviceAreaId: areas['Powai'],
      livingArrangement: 'WITH_SPOUSE',
      mobility: 'INDEPENDENT',
      conditions: list(['Hypertension', 'Early cataract']),
      languages: list(['Tamil', 'English', 'Hindi']),
      status: 'ACTIVE',
      emergencyContactName: 'Building manager, Palm Court',
      emergencyContactPhone: '9000000303',
      consentCapturedAt: at(-45),
      consentCapturedBy: 'Lakshmi Raghavan (self)',
      supervisingNurseId: nurses[0].id,
      notes:
        'Daughter in Toronto is the decision-maker. Prefers written updates she can read the next morning.',
      familyLinks: {
        create: {
          familyProfileId: family3.id,
          relationship: 'DAUGHTER',
          isPrimaryContact: true,
          isPrimaryPayer: true,
          canViewClinical: true,
        },
      },
    },
  });

  const senior4 = await prisma.senior.create({
    data: {
      firstName: 'Venkat',
      lastName: 'Raghavan',
      ageYears: 82,
      gender: 'MALE',
      addressLine: 'Flat 1204, Palm Court, Powai',
      area: 'Powai',
      pincode: '400076',
      serviceAreaId: areas['Powai'],
      livingArrangement: 'WITH_SPOUSE',
      mobility: 'WALKING_AID',
      conditions: list(["Parkinson's disease", 'Hypertension']),
      languages: list(['Tamil', 'English']),
      status: 'ACTIVE',
      emergencyContactName: 'Building manager, Palm Court',
      emergencyContactPhone: '9000000303',
      consentCapturedAt: at(-45),
      consentCapturedBy: 'Neha Raghavan (daughter, consent recorded on call)',
      supervisingNurseId: nurses[0].id,
      notes: 'Tremor makes buttons and small print difficult. Speak slowly and clearly.',
      familyLinks: {
        create: {
          familyProfileId: family3.id,
          relationship: 'DAUGHTER',
          isPrimaryContact: true,
          isPrimaryPayer: true,
          canViewClinical: true,
        },
      },
    },
  });

  const plan3 = await prisma.carePlan.create({
    data: {
      seniorId: senior3.id,
      packageId: packages['nri-parent-care-coordination'],
      title: 'NRI coordination plan — Powai household',
      version: 1,
      status: 'ACTIVE',
      primaryGoals: list([
        'Both parents seen in person at least twice a week',
        'Every appointment booked, attended and reported',
        'Daughter never has to chase for an update',
      ]),
      careRequirements: list([
        'Twice-weekly coordinator visits',
        'Monthly nurse review for both parents',
        'Appointment booking and escort',
        'Weekly written summary and monthly care report',
      ]),
      scheduleSummary: 'Coordinator visits Tuesday and Saturday. Nurse review monthly.',
      familyPreferences:
        'Written updates by 9pm IST so they are readable at breakfast in Toronto. Call only for anything urgent.',
      escalationPreferences:
        'Call the daughter in Toronto regardless of the hour for anything high severity. The building manager is the local contact.',
      startDate: at(-44),
      reviewDate: at(16),
      authoredByNurseId: nurses[0].id,
      approvedAt: at(-44, 12),
      approvedBy: 'Sister Leena Fernandes',
      services: {
        create: [
          { serviceId: services['care-coordination'], frequency: 'MONTHLY', quantity: 1 },
          { serviceId: services['attendant-support'], frequency: 'WEEKLY', quantity: 4, durationMinutes: 240 },
          { serviceId: services['nurse-review-visit'], frequency: 'MONTHLY', quantity: 1 },
          { serviceId: services['appointment-escort'], frequency: 'MONTHLY', quantity: 2 },
          { serviceId: services['family-reporting'], frequency: 'WEEKLY', quantity: 1 },
        ],
      },
      versions: {
        create: {
          version: 1,
          snapshot: JSON.stringify({ schedule: 'Coordinator visits Tuesday and Saturday' }),
          changeNote: 'Initial coordination plan covering both parents.',
          createdBy: 'Sister Leena Fernandes',
          createdAt: at(-44, 12),
        },
      },
    },
  });

  const assignment3 = await prisma.caregiverAssignment.create({
    data: {
      seniorId: senior3.id,
      caregiverId: caregivers[2].id,
      role: 'PRIMARY',
      shiftPattern: 'VISITS',
      shiftStart: '10:00',
      shiftEnd: '14:00',
      daysOfWeek: list(['2', '6']),
      status: 'ACTIVE',
      startDate: at(-44),
      matchScore: 86,
      matchExplanation:
        'Already works in Powai · Speaks English and Hindi · Companion and medication-reminder skills · 9 years of experience',
    },
  });

  for (const offset of [-13, -9, -6, -2]) {
    const visit = await prisma.visit.create({
      data: {
        seniorId: senior3.id,
        kind: 'CAREGIVER_SHIFT',
        caregiverId: caregivers[2].id,
        assignmentId: assignment3.id,
        carePlanId: plan3.id,
        scheduledStart: at(offset, 10, 0),
        scheduledEnd: at(offset, 14, 0),
        checkInAt: at(offset, 10, 4),
        checkOutAt: at(offset, 14, 1),
        checkInLat: 19.1176,
        checkInLng: 72.906,
        checkInAccuracyM: 18,
        locationVerified: true,
        status: 'COMPLETED',
        summary: 'Both parents seen. Medication boxes refilled for the week. Groceries checked.',
        tasks: {
          create: [
            { templateId: taskTemplates['medication-reminder'], label: 'Medication reminder', status: 'DONE', completedAt: at(offset, 10, 20), sortOrder: 0 },
            { templateId: taskTemplates['record-vitals'], label: 'Record agreed vitals', status: 'DONE', completedAt: at(offset, 10, 40), sortOrder: 1 },
            { templateId: taskTemplates['companion-time'], label: 'Conversation and companionship', status: 'DONE', completedAt: at(offset, 12, 0), sortOrder: 2 },
            { templateId: taskTemplates['observe-mood'], label: 'Note mood and alertness', status: 'DONE', completedAt: at(offset, 13, 30), sortOrder: 3 },
          ],
        },
      },
    });
    await prisma.careNote.create({
      data: {
        seniorId: senior3.id,
        visitId: visit.id,
        authorUserId: caregivers[2].userId,
        authorRole: 'CAREGIVER',
        type: 'DAILY',
        body:
          "Visited both parents. Mrs Raghavan is well and walking daily in the complex. Mr Raghavan's tremor was more noticeable today and he found the medicine strip difficult to open. Suggested a pill organiser to the nurse.",
        visibleToFamily: true,
        createdAt: at(offset, 14, 10),
      },
    });
    await prisma.vital.create({
      data: {
        seniorId: senior3.id,
        visitId: visit.id,
        type: 'BLOOD_PRESSURE',
        valueNumber: 138,
        valueSecondary: 84,
        unit: 'mmHg',
        context: 'RESTING',
        measuredAt: at(offset, 10, 40),
        recordedByUserId: caregivers[2].userId,
        flag: 'NORMAL',
      },
    });
    const flagged = offset === -2;
    await prisma.vital.create({
      data: {
        seniorId: senior4.id,
        type: 'BLOOD_PRESSURE',
        valueNumber: flagged ? 158 : 142,
        valueSecondary: flagged ? 92 : 86,
        unit: 'mmHg',
        context: flagged ? 'POST_ACTIVITY' : 'RESTING',
        measuredAt: at(offset, 11, 0),
        recordedByUserId: caregivers[2].userId,
        flag: flagged ? 'REQUIRES_REVIEW' : 'NORMAL',
        note: flagged ? 'Recorded after he had walked up from the lobby.' : null,
      },
    });
  }

  await prisma.visit.createMany({
    data: [
      {
        seniorId: senior3.id,
        kind: 'CAREGIVER_SHIFT',
        caregiverId: caregivers[2].id,
        assignmentId: assignment3.id,
        carePlanId: plan3.id,
        scheduledStart: at(2, 10, 0),
        scheduledEnd: at(2, 14, 0),
        status: 'SCHEDULED',
        instructions: 'Bring the pill organiser discussed with the nurse.',
      },
      {
        seniorId: senior3.id,
        kind: 'NURSE_REVIEW',
        nurseId: nurses[0].id,
        carePlanId: plan3.id,
        scheduledStart: at(0, 16, 0),
        scheduledEnd: at(0, 17, 0),
        status: 'SCHEDULED',
        instructions: 'Monthly review for both parents. Review the flagged reading for Mr Raghavan.',
      },
    ],
  });

  await prisma.careNote.create({
    data: {
      seniorId: senior4.id,
      authorUserId: nurses[0].userId,
      authorRole: 'NURSE',
      type: 'CONCERN',
      body:
        "A blood pressure reading for Mr Raghavan came in above the configured band after exertion. Queued for review at today's monthly visit; I will repeat the reading at rest before drawing any conclusion, and will not change anything without the treating doctor.",
      visibleToFamily: true,
      requiresReview: true,
      createdAt: at(-2, 12),
    },
  });

  await prisma.appointment.create({
    data: {
      seniorId: senior4.id,
      title: 'Neurology review',
      doctorName: 'Consulting neurologist',
      facility: 'Multispeciality clinic, Powai',
      specialty: 'Neurology',
      scheduledAt: at(6, 15, 0),
      durationMinutes: 45,
      purpose: "Six-monthly Parkinson's review. Coordinator to escort and report back.",
      transportRequired: true,
      companionRequired: true,
      companionCaregiverId: caregivers[2].id,
      reminderAt: at(5, 18),
      status: 'SCHEDULED',
      createdByUserId: nurses[0].userId,
    },
  });

  await prisma.document.create({
    data: {
      seniorId: senior4.id,
      category: 'PRESCRIPTION',
      label: 'Current prescription (demo placeholder)',
      storageKey: 'demo/prescription-venkat',
      mimeType: 'application/pdf',
      sizeBytes: 141000,
      uploadedByUserId: familyUser3.id,
      uploadedAt: at(-44, 20),
    },
  });

  // Per-senior override, so the configurable-threshold behaviour is visible.
  await prisma.vitalThreshold.create({
    data: {
      seniorId: senior4.id,
      type: 'BLOOD_PRESSURE',
      lowValue: 95,
      highValue: 155,
      lowSecondary: 60,
      highSecondary: 95,
      note: "Band widened slightly on the treating doctor's advice, recorded by the nurse at the last review.",
    },
  });

  // =====================================================================
  // Patient 5 — prospect awaiting assessment, so "nothing yet" states are real.
  // =====================================================================
  const senior5 = await prisma.senior.create({
    data: {
      firstName: 'Zarina',
      lastName: 'Merchant',
      ageYears: 76,
      gender: 'FEMALE',
      area: 'Bandra West',
      serviceAreaId: areas['Bandra West'],
      livingArrangement: 'ALONE',
      mobility: 'INDEPENDENT',
      conditions: list(['Recent knee replacement']),
      languages: list(['English', 'Gujarati', 'Hindi']),
      status: 'ASSESSMENT',
      notes: 'Website enquiry. Assessment booked but not yet completed.',
    },
  });

  // Threads that give the communication centre real content.
  const thread1 = await prisma.messageThread.create({
    data: {
      subject: 'Question about the afternoon medication slot',
      seniorId: senior1.id,
      category: 'CARE',
      lastMessageAt: at(-2, 20, 15),
      createdAt: at(-2, 19, 40),
      participants: {
        create: [
          { userId: familyUser1.id, lastReadAt: at(-2, 20, 20) },
          { userId: nurses[0].userId },
        ],
      },
    },
  });
  await prisma.message.createMany({
    data: [
      {
        threadId: thread1.id,
        senderUserId: familyUser1.id,
        body: 'Sister, my father says he does not need the afternoon painkiller any more. Should the caregiver still offer it?',
        createdAt: at(-2, 19, 40),
      },
      {
        threadId: thread1.id,
        senderUserId: nurses[0].userId,
        body: 'Thank you for telling me. The caregiver will keep offering it and record whether it was needed, so there is a record for the doctor at the follow-up. We will not stop anything on the list without the treating doctor confirming it. I have added a note to the plan.',
        createdAt: at(-2, 20, 15),
      },
    ],
  });

  const thread2 = await prisma.messageThread.create({
    data: {
      subject: 'Caregiver change this week',
      seniorId: senior2.id,
      category: 'CARE',
      lastMessageAt: at(-1, 10, 30),
      createdAt: at(-1, 10, 5),
      participants: { create: [{ userId: familyUser2.id }, { userId: ops.id }] },
    },
  });
  await prisma.message.createMany({
    data: [
      {
        threadId: thread2.id,
        senderUserId: ops.id,
        body: 'Kavita has been granted emergency leave for seven days. We are arranging cover for the three affected visits and will confirm the name before the next visit. I am sorry we told you this morning rather than last night.',
        createdAt: at(-1, 10, 5),
      },
      {
        threadId: thread2.id,
        senderUserId: familyUser2.id,
        body: 'Please make sure whoever comes speaks Marathi, and let my mother know the day before. She does not like surprises at the door.',
        createdAt: at(-1, 10, 30),
      },
    ],
  });

  return {
    admin,
    ops,
    nurses,
    caregivers,
    partners,
    familyUser1,
    family1,
    familyUser2,
    family2,
    familyUser3,
    family3,
    seniorUser1,
    senior1,
    senior2,
    senior3,
    senior4,
    senior5,
    plan1,
    plan2,
    plan3,
    assignment2,
  };
}
