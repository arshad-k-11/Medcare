-- Baseline migration for the whole schema, generated from prisma/schema.prisma with
-- `prisma migrate diff --from-empty`. Apply it to a fresh PostgreSQL database with
-- `prisma migrate deploy` (use the direct, non-pooled connection string: schema changes
-- through a transaction pooler fail).
--
-- The SQLite demo database does not use this file — `npm run demo:sqlite` pushes the
-- derived schema directly, because a demo database is disposable and a migration history
-- for it would be noise.

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "textScale" TEXT NOT NULL DEFAULT 'normal',
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "reduceMotion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "destination" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'SMS',
    "purpose" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "isNri" BOOLEAN NOT NULL DEFAULT false,
    "preferredChannel" TEXT NOT NULL DEFAULT 'PHONE',
    "bestTimeToCall" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Senior" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "userId" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "ageYears" INTEGER,
    "gender" TEXT,
    "addressLine" TEXT,
    "area" TEXT NOT NULL,
    "pincode" TEXT,
    "serviceAreaId" TEXT,
    "livingArrangement" TEXT,
    "mobility" TEXT,
    "conditions" TEXT NOT NULL DEFAULT '[]',
    "allergies" TEXT,
    "languages" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROSPECT',
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "hospitalPreference" TEXT,
    "consentCapturedAt" TIMESTAMP(3),
    "consentCapturedBy" TEXT,
    "supervisingNurseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Senior_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeniorFamilyLink" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "familyProfileId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
    "isPrimaryPayer" BOOLEAN NOT NULL DEFAULT false,
    "canViewClinical" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeniorFamilyLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "gender" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "qualifications" TEXT NOT NULL DEFAULT '[]',
    "skills" TEXT NOT NULL DEFAULT '[]',
    "languages" TEXT NOT NULL DEFAULT '[]',
    "preferredAreas" TEXT NOT NULL DEFAULT '[]',
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "performanceScore" INTEGER NOT NULL DEFAULT 70,
    "attendanceRate" INTEGER NOT NULL DEFAULT 100,
    "maxConcurrentPatients" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NurseProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "registrationVerifiedAt" TIMESTAMP(3),
    "specialisations" TEXT NOT NULL DEFAULT '[]',
    "languages" TEXT NOT NULL DEFAULT '[]',
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "caseloadCap" INTEGER NOT NULL DEFAULT 25,
    "isCareCoordinator" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NurseProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationName" TEXT NOT NULL,
    "partnerType" TEXT NOT NULL,
    "contactPerson" TEXT,
    "designation" TEXT,
    "addressLine" TEXT,
    "area" TEXT,
    "attributionCode" TEXT NOT NULL,
    "agreementStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffDocument" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT,
    "nurseId" TEXT,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRecord" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "score" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "urgency" TEXT NOT NULL DEFAULT 'EXPLORING',
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "relationship" TEXT,
    "contactCity" TEXT,
    "contactCountry" TEXT,
    "preferredChannel" TEXT NOT NULL DEFAULT 'PHONE',
    "careNeedSummary" TEXT,
    "situations" TEXT NOT NULL DEFAULT '[]',
    "area" TEXT,
    "budgetBand" TEXT,
    "journey" TEXT NOT NULL DEFAULT 'FAMILY_LOCAL',
    "utmSource" TEXT,
    "utmCampaign" TEXT,
    "sourceId" TEXT,
    "familyProfileId" TEXT,
    "seniorId" TEXT,
    "partnerId" TEXT,
    "recommendedPackageId" TEXT,
    "ownerUserId" TEXT,
    "followUpAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "wonAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "outcome" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeSubmission" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "journey" TEXT NOT NULL DEFAULT 'FAMILY_LOCAL',
    "answers" TEXT NOT NULL,
    "recommendedPackageSlug" TEXT,
    "completedSteps" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientAgeYears" INTEGER,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "patientArea" TEXT NOT NULL,
    "dischargeStatus" TEXT,
    "dischargeDate" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "requestedServiceId" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'FEW_DAYS',
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "contactedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "statusNote" TEXT,
    "leadId" TEXT,
    "seniorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "leadId" TEXT,
    "assigneeUserId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'MUMBAI',
    "pincodes" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "serviceClass" TEXT NOT NULL DEFAULT 'NON_MEDICAL',
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'VISIT',
    "basePricePaise" INTEGER NOT NULL DEFAULT 0,
    "requiredSkills" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePackage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "durationLabel" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'ONE_TIME',
    "priceFromPaise" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isComingSoon" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "outcomes" TEXT NOT NULL DEFAULT '[]',
    "notIncluded" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageService" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "frequency" TEXT NOT NULL DEFAULT 'AS_NEEDED',
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PackageService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "inputType" TEXT NOT NULL DEFAULT 'TEXT',
    "options" TEXT NOT NULL DEFAULT '[]',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "notifyLevel" TEXT NOT NULL,
    "notifyFamily" BOOLEAN NOT NULL DEFAULT false,
    "withinMinutes" INTEGER NOT NULL DEFAULT 60,
    "instructions" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EscalationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "leadId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'HOME_VISIT',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedFor" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "nurseId" TEXT,
    "summary" TEXT,
    "riskFlags" TEXT NOT NULL DEFAULT '[]',
    "recommendedPackageSlug" TEXT,
    "followUpNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAnswer" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "AssessmentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlan" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "packageId" TEXT,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "primaryGoals" TEXT NOT NULL DEFAULT '[]',
    "careRequirements" TEXT NOT NULL DEFAULT '[]',
    "scheduleSummary" TEXT,
    "mobilityNotes" TEXT,
    "dietaryNotes" TEXT,
    "familyPreferences" TEXT,
    "escalationPreferences" TEXT,
    "startDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "authoredByNurseId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlanVersion" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "changeNote" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarePlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarePlanService" (
    "id" TEXT NOT NULL,
    "carePlanId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'WEEKLY',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "durationMinutes" INTEGER,
    "notes" TEXT,

    CONSTRAINT "CarePlanService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverAssignment" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PRIMARY',
    "shiftPattern" TEXT NOT NULL DEFAULT 'DAY',
    "shiftStart" TEXT,
    "shiftEnd" TEXT,
    "daysOfWeek" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "replacedAssignmentId" TEXT,
    "replacementReason" TEXT,
    "matchScore" INTEGER,
    "matchExplanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAvailability" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StaffAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT,
    "nurseId" TEXT,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PLANNED',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CAREGIVER_SHIFT',
    "caregiverId" TEXT,
    "nurseId" TEXT,
    "assignmentId" TEXT,
    "carePlanId" TEXT,
    "assessmentId" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "checkInLat" DOUBLE PRECISION,
    "checkInLng" DOUBLE PRECISION,
    "checkInAccuracyM" INTEGER,
    "locationVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "atRisk" BOOLEAN NOT NULL DEFAULT false,
    "instructions" TEXT,
    "summary" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitTask" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "templateId" TEXT,
    "label" TEXT NOT NULL,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VisitTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareNote" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "visitId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibleToFamily" BOOLEAN NOT NULL DEFAULT true,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vital" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "visitId" TEXT,
    "type" TEXT NOT NULL,
    "valueNumber" DOUBLE PRECISION NOT NULL,
    "valueSecondary" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "context" TEXT,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "recordedByUserId" TEXT NOT NULL,
    "flag" TEXT NOT NULL DEFAULT 'NORMAL',
    "note" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalThreshold" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT,
    "type" TEXT NOT NULL,
    "lowValue" DOUBLE PRECISION,
    "highValue" DOUBLE PRECISION,
    "lowSecondary" DOUBLE PRECISION,
    "highSecondary" DOUBLE PRECISION,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VitalThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "form" TEXT,
    "timings" TEXT NOT NULL DEFAULT '[]',
    "instructions" TEXT,
    "prescribedBy" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enteredByUserId" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationReminder" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "actedAt" TIMESTAMP(3),
    "actedByUserId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "doctorName" TEXT,
    "facility" TEXT,
    "specialty" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "purpose" TEXT,
    "transportRequired" BOOLEAN NOT NULL DEFAULT false,
    "companionRequired" BOOLEAN NOT NULL DEFAULT false,
    "companionCaregiverId" TEXT,
    "reminderAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "outcomeNotes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "visitId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reportedByUserId" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "severityConfirmedBy" TEXT,
    "familyNotifiedAt" TIMESTAMP(3),
    "actionsTaken" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "incidentId" TEXT,
    "trigger" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "raisedByUserId" TEXT NOT NULL,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "closureNote" TEXT,

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "seniorId" TEXT,
    "authorUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RATING',
    "rating" INTEGER,
    "subject" TEXT,
    "comment" TEXT,
    "relatedVisitId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "seniorId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "MessageParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mirroredChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "href" TEXT,
    "seniorId" TEXT,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'QUEUED',
    "deliveryNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "familyProfileId" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "leadId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3),
    "notes" TEXT,
    "quotedAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "familyProfileId" TEXT NOT NULL,
    "seniorId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "bookingId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "amountPaise" INTEGER NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextBillingDate" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "familyProfileId" TEXT NOT NULL,
    "seniorId" TEXT,
    "bookingId" TEXT,
    "subscriptionId" TEXT,
    "items" TEXT NOT NULL DEFAULT '[]',
    "subtotalPaise" INTEGER NOT NULL,
    "taxPaise" INTEGER NOT NULL DEFAULT 0,
    "discountPaise" INTEGER NOT NULL DEFAULT 0,
    "totalPaise" INTEGER NOT NULL,
    "amountPaidPaise" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'RAZORPAY',
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "gatewaySignature" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "method" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "refundStatus" TEXT,
    "refundAmountPaise" INTEGER NOT NULL DEFAULT 0,
    "refundReason" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "seniorId" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_destination_purpose_expiresAt_idx" ON "OtpChallenge"("destination", "purpose", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_tokenHash_key" ON "PasswordReset"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyProfile_userId_key" ON "FamilyProfile"("userId");

-- CreateIndex
CREATE INDEX "FamilyProfile_isNri_idx" ON "FamilyProfile"("isNri");

-- CreateIndex
CREATE UNIQUE INDEX "Senior_userId_key" ON "Senior"("userId");

-- CreateIndex
CREATE INDEX "Senior_status_area_idx" ON "Senior"("status", "area");

-- CreateIndex
CREATE INDEX "Senior_supervisingNurseId_idx" ON "Senior"("supervisingNurseId");

-- CreateIndex
CREATE INDEX "SeniorFamilyLink_familyProfileId_idx" ON "SeniorFamilyLink"("familyProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "SeniorFamilyLink_seniorId_familyProfileId_key" ON "SeniorFamilyLink"("seniorId", "familyProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverProfile_userId_key" ON "CaregiverProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverProfile_employeeCode_key" ON "CaregiverProfile"("employeeCode");

-- CreateIndex
CREATE INDEX "CaregiverProfile_status_verificationStatus_idx" ON "CaregiverProfile"("status", "verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "NurseProfile_userId_key" ON "NurseProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NurseProfile_employeeCode_key" ON "NurseProfile"("employeeCode");

-- CreateIndex
CREATE INDEX "NurseProfile_isCareCoordinator_idx" ON "NurseProfile"("isCareCoordinator");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProfile_userId_key" ON "PartnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerProfile_attributionCode_key" ON "PartnerProfile"("attributionCode");

-- CreateIndex
CREATE INDEX "PartnerProfile_partnerType_agreementStatus_idx" ON "PartnerProfile"("partnerType", "agreementStatus");

-- CreateIndex
CREATE INDEX "StaffDocument_caregiverId_idx" ON "StaffDocument"("caregiverId");

-- CreateIndex
CREATE INDEX "StaffDocument_nurseId_idx" ON "StaffDocument"("nurseId");

-- CreateIndex
CREATE INDEX "TrainingRecord_caregiverId_idx" ON "TrainingRecord"("caregiverId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_key_key" ON "LeadSource"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_reference_key" ON "Lead"("reference");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_ownerUserId_followUpAt_idx" ON "Lead"("ownerUserId", "followUpAt");

-- CreateIndex
CREATE INDEX "Lead_journey_idx" ON "Lead"("journey");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeSubmission_leadId_key" ON "IntakeSubmission"("leadId");

-- CreateIndex
CREATE INDEX "IntakeSubmission_journey_submittedAt_idx" ON "IntakeSubmission"("journey", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_reference_key" ON "Referral"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_leadId_key" ON "Referral"("leadId");

-- CreateIndex
CREATE INDEX "Referral_partnerId_status_idx" ON "Referral"("partnerId", "status");

-- CreateIndex
CREATE INDEX "Referral_status_createdAt_idx" ON "Referral"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CrmTask_assigneeUserId_status_dueAt_idx" ON "CrmTask"("assigneeUserId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceArea_name_key" ON "ServiceArea"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CarePackage_slug_key" ON "CarePackage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PackageService_packageId_serviceId_key" ON "PackageService"("packageId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskTemplate_key_key" ON "TaskTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_key_key" ON "AssessmentQuestion"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EscalationRule_key_key" ON "EscalationRule"("key");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_key_key" ON "NotificationTemplate"("key");

-- CreateIndex
CREATE INDEX "Assessment_status_scheduledAt_idx" ON "Assessment"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Assessment_seniorId_idx" ON "Assessment"("seniorId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAnswer_assessmentId_questionId_key" ON "AssessmentAnswer"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "CarePlan_seniorId_status_idx" ON "CarePlan"("seniorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CarePlanVersion_carePlanId_version_key" ON "CarePlanVersion"("carePlanId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CarePlanService_carePlanId_serviceId_key" ON "CarePlanService"("carePlanId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverAssignment_replacedAssignmentId_key" ON "CaregiverAssignment"("replacedAssignmentId");

-- CreateIndex
CREATE INDEX "CaregiverAssignment_seniorId_status_idx" ON "CaregiverAssignment"("seniorId", "status");

-- CreateIndex
CREATE INDEX "CaregiverAssignment_caregiverId_status_idx" ON "CaregiverAssignment"("caregiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAvailability_caregiverId_dayOfWeek_startTime_key" ON "StaffAvailability"("caregiverId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE INDEX "LeaveRequest_caregiverId_status_idx" ON "LeaveRequest"("caregiverId", "status");

-- CreateIndex
CREATE INDEX "Visit_seniorId_scheduledStart_idx" ON "Visit"("seniorId", "scheduledStart");

-- CreateIndex
CREATE INDEX "Visit_caregiverId_scheduledStart_idx" ON "Visit"("caregiverId", "scheduledStart");

-- CreateIndex
CREATE INDEX "Visit_status_scheduledStart_idx" ON "Visit"("status", "scheduledStart");

-- CreateIndex
CREATE INDEX "VisitTask_visitId_idx" ON "VisitTask"("visitId");

-- CreateIndex
CREATE INDEX "CareNote_seniorId_createdAt_idx" ON "CareNote"("seniorId", "createdAt");

-- CreateIndex
CREATE INDEX "CareNote_requiresReview_reviewedAt_idx" ON "CareNote"("requiresReview", "reviewedAt");

-- CreateIndex
CREATE INDEX "Vital_seniorId_type_measuredAt_idx" ON "Vital"("seniorId", "type", "measuredAt");

-- CreateIndex
CREATE INDEX "Vital_flag_reviewedAt_idx" ON "Vital"("flag", "reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VitalThreshold_seniorId_type_key" ON "VitalThreshold"("seniorId", "type");

-- CreateIndex
CREATE INDEX "Medication_seniorId_isActive_idx" ON "Medication"("seniorId", "isActive");

-- CreateIndex
CREATE INDEX "MedicationReminder_seniorId_dueAt_status_idx" ON "MedicationReminder"("seniorId", "dueAt", "status");

-- CreateIndex
CREATE INDEX "Appointment_seniorId_scheduledAt_idx" ON "Appointment"("seniorId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_status_scheduledAt_idx" ON "Appointment"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_reference_key" ON "Incident"("reference");

-- CreateIndex
CREATE INDEX "Incident_status_severity_idx" ON "Incident"("status", "severity");

-- CreateIndex
CREATE INDEX "Incident_seniorId_reportedAt_idx" ON "Incident"("seniorId", "reportedAt");

-- CreateIndex
CREATE INDEX "Escalation_seniorId_raisedAt_idx" ON "Escalation"("seniorId", "raisedAt");

-- CreateIndex
CREATE INDEX "Escalation_level_closedAt_idx" ON "Escalation"("level", "closedAt");

-- CreateIndex
CREATE INDEX "Document_seniorId_category_idx" ON "Document"("seniorId", "category");

-- CreateIndex
CREATE INDEX "Feedback_type_status_idx" ON "Feedback"("type", "status");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "MessageThread_lastMessageAt_idx" ON "MessageThread"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageParticipant_threadId_userId_key" ON "MessageParticipant"("threadId", "userId");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_type_channel_key" ON "NotificationPreference"("userId", "type", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE INDEX "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_bookingId_key" ON "Subscription"("bookingId");

-- CreateIndex
CREATE INDEX "Subscription_status_nextBillingDate_idx" ON "Subscription"("status", "nextBillingDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_familyProfileId_createdAt_idx" ON "Invoice"("familyProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayOrderId_key" ON "Payment"("gatewayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayPaymentId_key" ON "Payment"("gatewayPaymentId");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyProfile" ADD CONSTRAINT "FamilyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Senior" ADD CONSTRAINT "Senior_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Senior" ADD CONSTRAINT "Senior_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES "ServiceArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Senior" ADD CONSTRAINT "Senior_supervisingNurseId_fkey" FOREIGN KEY ("supervisingNurseId") REFERENCES "NurseProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeniorFamilyLink" ADD CONSTRAINT "SeniorFamilyLink_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeniorFamilyLink" ADD CONSTRAINT "SeniorFamilyLink_familyProfileId_fkey" FOREIGN KEY ("familyProfileId") REFERENCES "FamilyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverProfile" ADD CONSTRAINT "CaregiverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseProfile" ADD CONSTRAINT "NurseProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerProfile" ADD CONSTRAINT "PartnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDocument" ADD CONSTRAINT "StaffDocument_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDocument" ADD CONSTRAINT "StaffDocument_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "NurseProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_familyProfileId_fkey" FOREIGN KEY ("familyProfileId") REFERENCES "FamilyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_recommendedPackageId_fkey" FOREIGN KEY ("recommendedPackageId") REFERENCES "CarePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_requestedServiceId_fkey" FOREIGN KEY ("requestedServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTask" ADD CONSTRAINT "CrmTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageService" ADD CONSTRAINT "PackageService_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CarePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageService" ADD CONSTRAINT "PackageService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "NurseProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAnswer" ADD CONSTRAINT "AssessmentAnswer_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAnswer" ADD CONSTRAINT "AssessmentAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CarePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_authoredByNurseId_fkey" FOREIGN KEY ("authoredByNurseId") REFERENCES "NurseProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlanVersion" ADD CONSTRAINT "CarePlanVersion_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlanService" ADD CONSTRAINT "CarePlanService_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlanService" ADD CONSTRAINT "CarePlanService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverAssignment" ADD CONSTRAINT "CaregiverAssignment_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverAssignment" ADD CONSTRAINT "CaregiverAssignment_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverAssignment" ADD CONSTRAINT "CaregiverAssignment_replacedAssignmentId_fkey" FOREIGN KEY ("replacedAssignmentId") REFERENCES "CaregiverAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAvailability" ADD CONSTRAINT "StaffAvailability_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "NurseProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "CaregiverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "NurseProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "CaregiverAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "CarePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitTask" ADD CONSTRAINT "VisitTask_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitTask" ADD CONSTRAINT "VisitTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vital" ADD CONSTRAINT "Vital_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vital" ADD CONSTRAINT "Vital_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vital" ADD CONSTRAINT "Vital_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalThreshold" ADD CONSTRAINT "VitalThreshold_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_enteredByUserId_fkey" FOREIGN KEY ("enteredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationReminder" ADD CONSTRAINT "MedicationReminder_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationReminder" ADD CONSTRAINT "MedicationReminder_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedByUserId_fkey" FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageParticipant" ADD CONSTRAINT "MessageParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageParticipant" ADD CONSTRAINT "MessageParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_familyProfileId_fkey" FOREIGN KEY ("familyProfileId") REFERENCES "FamilyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CarePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_familyProfileId_fkey" FOREIGN KEY ("familyProfileId") REFERENCES "FamilyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CarePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_familyProfileId_fkey" FOREIGN KEY ("familyProfileId") REFERENCES "FamilyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_seniorId_fkey" FOREIGN KEY ("seniorId") REFERENCES "Senior"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

