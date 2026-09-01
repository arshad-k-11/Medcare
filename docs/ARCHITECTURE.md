# Medcare — Platform Architecture

> Elder-care coordination and home-support platform for Mumbai families.
> This document is the design record that the code in this repository implements.

**Positioning.** Medcare is not a caregiver-hours marketplace and not a hospital. It is an
elder-care **coordination** platform: structured care plans, supervised caregivers, and
visibility for families who cannot be present every day.

**What the platform deliberately does not do.** It does not diagnose, does not prescribe, and
does not replace emergency medical services. Every clinical-adjacent surface is built so a
qualified professional reviews the information; automated threshold breaches are labelled
*"Requires review"*, never *"medical emergency"*.

---

## 1. Product architecture

### 1.1 Layers

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Presentation                                                             │
│  Public marketing site (SSR/ISR, SEO)   Role dashboards (SSR + client)   │
│  • home, packages, pricing, areas       • family / senior / caregiver     │
│  • 3 journey landing pages              • nurse / admin / partner         │
│  • 7-step assessment funnel                                              │
├──────────────────────────────────────────────────────────────────────────┤
│ Application (Next.js route handlers + server actions)                    │
│  auth · intake · care-plan · scheduling · visits · clinical-notes ·      │
│  vitals · medication · appointments · documents · messaging ·            │
│  notifications · leads/CRM · referrals · billing · analytics · config    │
├──────────────────────────────────────────────────────────────────────────┤
│ Domain services (src/lib/services, pure-ish, testable)                   │
│  recommendation · replacement-matching · pricing-calculator ·            │
│  escalation · vitals-threshold · lead-scoring · timeline-builder         │
├──────────────────────────────────────────────────────────────────────────┤
│ Cross-cutting                                                            │
│  session (JWT cookie) · RBAC guard · audit log · rate limit ·            │
│  zod validation · error envelope · PHI-safe logging                      │
├──────────────────────────────────────────────────────────────────────────┤
│ Integration adapters (interface first, provider swappable)               │
│  NotificationChannel(email|sms|whatsapp|in-app) · PaymentGateway(Razorpay)│
│  · DocumentStorage(local|s3)                                             │
├──────────────────────────────────────────────────────────────────────────┤
│ Data — PostgreSQL via Prisma                                             │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key architectural decisions

| Decision | Rationale |
| --- | --- |
| Single Next.js app, responsive, no separate native apps | Caregivers use low-end Android phones; a responsive PWA-ready app avoids app-store friction and keeps one codebase. |
| Status values as string constants + Prisma `String` columns, not native DB enums | Ops needs to add lead statuses / incident types without a migration; also keeps the schema portable to SQLite for demos. |
| Business logic in DB config tables (`ServiceArea`, `CarePackage`, `Service`, `TaskTemplate`, `NotificationTemplate`, `EscalationRule`, `VitalThreshold`, `AssessmentQuestion`, `LeadSource`) | Section 39 requirement: admin configures, engineers don't redeploy. |
| Patient and payer modelled separately (`Senior` ↔ `FamilyMember` join with `isPrimaryPayer`, `isPrimaryContact`) | The person receiving care is usually not the person deciding or paying. |
| Adapters for every outbound integration | No provider contracts exist yet; the app must run and be demoed with providers disabled. |
| Audit-first for clinical + PII reads/writes | Health data; regulatory review pending. |

### 1.3 Deployment topology (target)

```
Cloudflare / ALB (TLS)  →  Next.js (Vercel or ECS Fargate, ≥2 tasks)
                                │
              ┌─────────────────┼──────────────────┐
              ▼                 ▼                  ▼
   PostgreSQL (managed,   S3 private bucket   Provider APIs
   PITR backups, TLS,     (SSE-KMS, no        (SES/MSG91/
   private subnet)        public ACL)          WhatsApp/Razorpay)
```

---

## 2. User-role matrix

Roles: `ADMIN`, `OPS_MANAGER`, `NURSE`, `CAREGIVER`, `FAMILY`, `SENIOR`, `REFERRAL_PARTNER`.

Legend: **F** full · **W** write within scope · **R** read within scope · **O** own record only · **–** no access

| Capability | ADMIN | OPS_MANAGER | NURSE | CAREGIVER | FAMILY | SENIOR | PARTNER |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Public site & intake funnel | F | F | F | F | F | F | F |
| Own profile / preferences | O | O | O | O | O | O | O |
| Leads & CRM pipeline | F | F | – | – | – | – | – |
| Referrals (all) | F | F | R | – | – | – | O |
| Submit referral | F | F | – | – | – | – | W |
| Senior/patient records | F | F | R+W clinical | R (assigned, limited) | R (linked) | O | – |
| Create senior | F | F | – | – | W (own family) | – | – |
| Assessments | F | F | W | – | R (linked) | R (own) | R (status of own referral) |
| Care plans | F | F | W + version | R (assigned) | R (linked) | R simplified | – |
| Care-plan approval | F | F | W | – | – | – | – |
| Visits — schedule | F | F | W | – | Request only | – | – |
| Visits — check-in/out | F | F | W | W (own visits) | – | – | – |
| Care notes | F | F | F | W (own visits) | R (family-visible only) | – | – |
| Vitals | F | F | F | W (assigned) | R (linked) | R (own) | – |
| Medication reminders | F | F | F | Confirm/miss | R + request change | R (own) | – |
| Appointments | F | F | W | R (assigned) | W (linked) | R (own) | – |
| Documents | F | F | R+W (assigned) | – | W/R (linked, non-restricted) | R (own, non-restricted) | – |
| Incidents | F | F | F | W (report) | R (family-visible) | – | – |
| Escalations | F | F | W | W (raise) | R | Raise help request | – |
| Caregivers directory | F | F | R | – | R (assigned only) | R (assigned only) | – |
| Caregiver assignment / replacement | F | F | Recommend | – | Request | – | – |
| Staff availability & leave | F | F | R | O | – | – | – |
| Packages / services / pricing config | F | R | – | – | R (public) | – | R (eligible) |
| Service areas config | F | W | – | – | R | – | R |
| Invoices & payments | F | F | – | – | O (own family) | – | – |
| Refunds | F | Request | – | – | – | – | – |
| Messages / communication centre | F | F | W (own patients) | W (supervisor) | W (care team) | W (support) | W (business) |
| Notification templates | F | R | – | – | – | – | – |
| Analytics & reports | F | F | Clinical subset | – | Own care reports | – | Own referral stats |
| Audit log | F | R | – | – | – | – | – |
| Feedback / complaints | F | F | R | – | W | W | – |

Enforcement lives in `src/lib/rbac.ts` (capability map) + `src/lib/scope.ts` (row-level scoping:
"which senior ids may this user touch"). Every API route calls both.

---

## 3. Sitemap

```
PUBLIC
/                                   Home (14 sections)
/for-families                       Journey A — local family
/for-nri-families                   Journey B — NRI / out-of-city
/for-partners                       Journey C — hospitals / doctors / referrers
/care-packages                       Package index
/care-packages/[slug]                Package detail (5 packages)
/pricing                             Pricing + estimate calculator
/how-it-works
/caregiver-supervision
/trust-and-safety
/service-areas
/about
/faq
/contact
/careers
/resources                            SEO content hub
/resources/[slug]                     10 SEO landing articles
/legal/terms · /legal/privacy · /legal/medical-disclaimer · /legal/consent
/sitemap.xml · /robots.txt · /opengraph-image

FUNNEL
/get-assessment                       7-step guided intake
/get-assessment/complete/[ref]        Confirmation + status tracking
/track/[ref]                          Public status lookup by reference

AUTH
/login  /login/otp  /register  /forgot-password  /reset-password  /logout

APP (role-routed from /app)
/app                                  Role redirect
/app/family                           Family dashboard
/app/family/seniors/[id]              Senior detail (plan, timeline, vitals, meds…)
/app/family/seniors/new
/app/family/updates  /appointments  /documents  /messages  /billing  /support
/app/senior                           Accessibility-first senior home
/app/senior/today · /caregiver · /appointments · /help
/app/caregiver                        Today's schedule (mobile-first)
/app/caregiver/visits/[id]            Visit runner: check-in, tasks, notes, vitals
/app/caregiver/patients/[id]  /schedule  /leave  /escalate  /profile
/app/nurse                            Supervisor overview
/app/nurse/patients  /patients/[id]  /reviews  /escalations  /visits  /care-plans/[id]
/app/admin                            KPI dashboard
/app/admin/leads  /leads/[id]         CRM pipeline
/app/admin/patients  /patients/[id]
/app/admin/caregivers  /caregivers/[id]
/app/admin/assignments  /assignments/replace/[assignmentId]
/app/admin/visits  /incidents  /assessments  /care-plans
/app/admin/referrals  /partners
/app/admin/billing  /billing/invoices/[id]
/app/admin/analytics
/app/admin/feedback
/app/admin/settings/{packages,services,areas,tasks,templates,escalation,thresholds,sources,staff}
/app/admin/audit
/app/partner                          Referral partner dashboard
/app/partner/refer  /referrals  /referrals/[id]  /reports
/app/notifications  /app/settings  /app/settings/accessibility
```

---

## 4. Database schema

PostgreSQL, normalised to 3NF with denormalised counters only where a dashboard needs them.
Full definition: `prisma/schema.prisma`. Entity summary and relationships:

### 4.1 Identity & people

| Entity | Purpose | Key relations |
| --- | --- | --- |
| `User` | One login per human. `role`, `passwordHash`, `phone`, `emailVerifiedAt`, `mfa` fields, `status`. | 1–1 to `FamilyProfile` / `CaregiverProfile` / `NurseProfile` / `PartnerProfile`; 1–1 optional to `Senior` (senior login) |
| `OtpChallenge` | Hashed OTP codes, purpose, attempts, expiry. | → `User` (nullable, for signup) |
| `Session` | Server-side session record enabling revocation; JWT carries `sid`. | → `User` |
| `FamilyProfile` | The payer/decision-maker. Relationship, city/country (NRI flag), timezone, comms preference. | → `User`; ↔ `Senior` via `SeniorFamilyLink` |
| `Senior` | The patient. Demographics, area, living arrangement, mobility, conditions, `status`. | → `CarePlan[]`, `Visit[]`, `Vital[]` … |
| `SeniorFamilyLink` | Patient ≠ payer. `relationship`, `isPrimaryContact`, `isPrimaryPayer`, `canViewClinical`. | `Senior` ↔ `FamilyProfile` |
| `CaregiverProfile` | Verification status, qualifications, languages, skills, preferred areas, performance score, `status`. | → `CaregiverAssignment[]`, `StaffAvailability[]`, `Visit[]` |
| `NurseProfile` | Registration number (nullable until verified), specialisations, caseload cap. | → `Senior[]` supervision, `CareNote[]`, `Assessment[]` |
| `PartnerProfile` | Hospital/clinic/society. `partnerType`, org name, attribution code. | → `Referral[]` |
| `StaffDocument` | Staff-side documents (ID, certificate, police verification) with verification state. | → `CaregiverProfile`/`NurseProfile` |
| `TrainingRecord` | Course, completion date, score. | → `CaregiverProfile` |

### 4.2 Acquisition

`Lead` (source, status pipeline `NEW→CONTACTED→QUALIFIED→ASSESSMENT_BOOKED→ASSESSMENT_COMPLETED→PROPOSAL_SENT→WON|LOST`, urgency, area, budget band, recommended package, owner, follow-up date, UTM/journey attribution) ·
`LeadActivity` (call/whatsapp/email/note/status-change timeline) ·
`LeadSource` (configurable) ·
`Referral` (partner → patient, status `SUBMITTED→CONTACTED→ASSESSMENT→CONVERTED|DECLINED|LOST`, links to `Lead`) ·
`CrmTask` (follow-ups: "call family tomorrow 11:00", assignee, due, done) ·
`IntakeSubmission` (raw 7-step answers, retained for funnel analytics).

### 4.3 Care delivery

`Assessment` (type home/tele, scheduled/completed, nurse, structured findings JSON, risk flags, recommendation) ·
`AssessmentQuestion` + `AssessmentAnswer` (configurable questionnaire) ·
`CarePlan` (goals, requirements, schedule, dietary/mobility/family/escalation preferences, `version`, `status`, `reviewDate`) ·
`CarePlanVersion` (immutable snapshot JSON per revision) ·
`CarePlanService` (join `CarePlan` ↔ `Service` with frequency/duration) ·
`Service` & `CarePackage` & `PackageService` (configurable catalogue; package has `priceFrom`, `billingCycle`, `isPublished`, `isComingSoon`) ·
`Booking` (package purchase intent → `Subscription`/`Invoice`) ·
`Subscription` (monthly plans, `nextBillingDate`, status) ·
`CaregiverAssignment` (senior ↔ caregiver, shift pattern, `status`, `startDate`/`endDate`, `replacedAssignmentId`, `replacementReason`) ·
`StaffAvailability` (weekly pattern + date exceptions) + `LeaveRequest` ·
`Visit` (scheduled window, actual check-in/out, GPS lat/lng + accuracy, `status` `SCHEDULED|IN_PROGRESS|COMPLETED|MISSED|CANCELLED`, kind `CAREGIVER_SHIFT|NURSE_REVIEW|ASSESSMENT`) ·
`VisitTask` ← `TaskTemplate` (configurable task catalogue; per-visit completion + refusal reason) ·
`CareNote` (author role, type daily/concern/refusal/missed-task/family-communication, `visibleToFamily`, structured fields for nurse notes) ·
`Vital` (type, value(s), unit, measuredAt, recordedBy, `flag` normal/requires-review) + `VitalThreshold` (configurable per senior or global) ·
`Medication` (name, dose, form, timing slots, prescribing doctor *recorded*, start/end, `enteredByUserId`) + `MedicationReminder` (per occurrence: due, status `PENDING|CONFIRMED|MISSED|SKIPPED`, note) ·
`Appointment` (doctor, facility, datetime, purpose, transport/companion required, reminder, completion, notes) ·
`Incident` (type, severity `LOW|MEDIUM|HIGH`, description, reportedBy, `familyNotifiedAt`, status `OPEN|UNDER_REVIEW|ACTION_TAKEN|RESOLVED`, resolution) ·
`Escalation` (from → to level `NURSE|OPS|FAMILY|EMERGENCY_SERVICES`, reason, acknowledgedAt, closedAt, `EscalationRule` config) ·
`Document` (owner senior, category, storage key, mime, size, uploadedBy, `isRestricted`, archivedAt) ·
`Feedback` (rating 1–5, comment, type rating/complaint/callback-request, resolution + resolvedAt).

### 4.4 Communication, money, platform

`Message` + `MessageThread` (participants, subject, senior context) ·
`Notification` (user, type, title, body, `channel`, `readAt`, `sentAt`, deep link) ·
`NotificationTemplate` (key, channel, subject/body with `{{tokens}}`) ·
`NotificationPreference` (per user × type × channel) ·
`Invoice` (number, family, senior, items JSON, subtotal/tax/total in **paise**, status `DRAFT|SENT|PAID|PARTIAL|OVERDUE|VOID`, dueDate) ·
`Payment` (invoice, gateway, gatewayOrderId/paymentId, amount, status, method, `refundStatus`) ·
`ServiceArea` (name, pincodes, `isActive`, zone) ·
`AuditLog` (actorUserId, actorRole, action, entity, entityId, `ipHash`, userAgent, metadata JSON — no PHI values) ·
`AppSetting` (key/value JSON for tunables).

### 4.5 Relationship diagram (core spine)

```
User ─1:1─ FamilyProfile ─┐
                          ├── SeniorFamilyLink ──┬── Senior ──┬── CarePlan ── CarePlanVersion
User ─1:1─ Senior (login) ┘                      │            ├── CaregiverAssignment ── CaregiverProfile ─ User
                                                 │            ├── Visit ──┬── VisitTask ── TaskTemplate
User ─1:1─ CaregiverProfile ─ StaffAvailability   │            │           ├── CareNote
User ─1:1─ NurseProfile ─ Assessment ─────────────┤            │           └── Vital
User ─1:1─ PartnerProfile ─ Referral ─ Lead ──────┤            ├── Medication ── MedicationReminder
                                                  │            ├── Appointment
                                                  │            ├── Incident ── Escalation
                                                  │            ├── Document
                                                  │            └── Feedback
FamilyProfile ── Invoice ── Payment               │
FamilyProfile ── Subscription ── CarePackage ── PackageService ── Service
```

Indexes: every FK; plus `Lead(status, createdAt)`, `Visit(seniorId, scheduledStart)`,
`Visit(caregiverId, scheduledStart)`, `Vital(seniorId, type, measuredAt)`,
`MedicationReminder(seniorId, dueAt, status)`, `Notification(userId, readAt)`,
`AuditLog(entity, entityId, createdAt)`.

---

## 5. Main user journeys

### Workflow A — New customer (website → active patient)
```
Home CTA → 7-step assessment → POST /api/intake
  ├─ IntakeSubmission (raw answers, funnel analytics)
  ├─ User(FAMILY) created or matched by phone/email  ─ magic reference code returned
  ├─ Senior created, SeniorFamilyLink(isPrimaryContact, isPrimaryPayer)
  ├─ Lead(status=NEW, source, journey, recommendedPackage) + LeadActivity
  ├─ Assessment(status=REQUESTED)  ← recommendation service
  ├─ Notification → all ADMIN/OPS users ("New lead, urgency=TODAY")
  ├─ Notification → family (confirmation, channel per preference)
  └─ AuditLog(action=intake.submitted)
Family sees /get-assessment/complete/[ref] → live status at /track/[ref]
Ops: lead CONTACTED → QUALIFIED → ASSESSMENT_BOOKED (Assessment.scheduledAt, nurse assigned)
Nurse completes assessment → findings + risk flags → recommended package
Ops sends proposal → PROPOSAL_SENT → family accepts → Booking
Payment (Razorpay order → webhook) → Invoice PAID → Senior.status=ACTIVE
CarePlan v1 authored by nurse → CaregiverAssignment created → Visits generated
```

### Workflow B — Post-discharge (referral-led)
```
Partner submits referral → Referral(SUBMITTED) + Lead(source=HOSPITAL) + attribution
Ops contacts within SLA → Referral.CONTACTED
Home assessment within 24h → CarePlan (14-day post-discharge template)
Caregiver assigned by match score → first visit → daily check-in/out + tasks + notes
Nurse review visit on day 3 & 10 → structured note + vitals review
Family update digest (daily timeline, weekly report)
Day 12 care-plan review → renew as Monthly Chronic Care or discharge from service
```

### Workflow C — Caregiver replacement
```
Trigger: LeaveRequest approved | CaregiverProfile.status→ON_LEAVE/UNAVAILABLE | family request | performance
  → affected CaregiverAssignment flagged NEEDS_REPLACEMENT, upcoming Visits flagged AT_RISK
  → GET /api/caregivers/available?seniorId=…&from=…  runs matchReplacements():
       proximity(area/zone) 30 · availability(shift free) 25 · skills 15 ·
       language overlap 10 · shift compatibility 10 · experience 5 · performance 5
  → Admin reviews ranked list with the reason each candidate scored
  → POST /api/caregiver-assignments  {replacedAssignmentId, reason}
       old assignment ENDED, new ACTIVE, future visits reassigned
  → Notifications: family (named new caregiver + why), new caregiver, outgoing caregiver
  → AuditLog(action=assignment.replaced, metadata={reason, score})
```

### Workflow D — Incident
```
Caregiver taps "Escalate issue" during a visit
  → Incident(OPEN, type, severity draft) + Escalation(level=NURSE)
  → Notification → supervising nurse + ops (in-app + SMS if HIGH)
  → Nurse classifies severity; EscalationRule decides whether family is notified and when
  → Family notified (Incident.familyNotifiedAt stamped) with factual, non-diagnostic wording
  → Actions recorded as CareNote(type=CONCERN) + Escalation acknowledgements
  → Resolution logged, status RESOLVED, AuditLog for every transition
  → HIGH severity additionally surfaces on admin dashboard until resolved
```

### Workflow E — NRI family
```
NRI family registers (country ≠ India → FamilyProfile.isNri, timezone captured)
  → adds parent, selects "NRI Parent Care Coordination"
  → assessment scheduled at a time rendered in the family's timezone
  → dedicated coordinator (NurseProfile) assigned; visit cadence set in care plan
  → every visit produces a family-visible timeline entry
  → weekly + monthly care report generated from visits/vitals/notes
  → Subscription auto-invoices monthly; family pays from abroad
```

---

## 6. API architecture

Conventions:
- REST under `/api`, JSON only. `POST/PATCH` bodies validated with zod; failures return `422`
  with `{ error: { code:'VALIDATION_ERROR', message, fields: {...} } }`.
- Auth via `HttpOnly` `Secure` `SameSite=Lax` session cookie; `401` unauthenticated,
  `403` authorised-but-out-of-scope, `404` when revealing existence would itself leak.
- All list endpoints accept `?page&pageSize&q&sort&order` + resource filters and return
  `{ data, page, pageSize, total, totalPages }`.
- Mutating routes on sensitive entities write an `AuditLog` row in the same transaction.
- Rate limits: `10/min` auth + OTP, `5/min` intake, `60/min` authenticated default.

```
AUTH        POST /api/auth/register            POST /api/auth/login
            POST /api/auth/otp/request         POST /api/auth/otp/verify
            POST /api/auth/logout              POST /api/auth/forgot-password
            POST /api/auth/reset-password      GET  /api/auth/me
INTAKE      POST /api/intake                   GET  /api/intake/track/:ref
PATIENTS    GET/POST /api/patients             GET/PATCH /api/patients/:id
            GET  /api/patients/:id/timeline
ASSESSMENT  GET/POST /api/assessments          PATCH /api/assessments/:id
CARE PLAN   GET  /api/care-plans/:patientId    POST /api/care-plans
            PATCH /api/care-plans/:id          GET  /api/care-plans/:id/versions
VISITS      GET/POST /api/visits               GET /api/visits/:id
            POST /api/visits/:id/check-in      POST /api/visits/:id/check-out
            PATCH /api/visits/:id/tasks/:taskId
NOTES       GET/POST /api/care-notes
VITALS      GET/POST /api/vitals
MEDS        GET/POST /api/medications          POST /api/medication-reminders/:id/confirm
APPTS       GET/POST /api/appointments         PATCH /api/appointments/:id
INCIDENTS   GET/POST /api/incidents            PATCH /api/incidents/:id
            POST /api/escalations
DOCS        GET/POST /api/documents            GET /api/documents/:id/download
            DELETE /api/documents/:id
STAFF       GET  /api/caregivers               GET /api/caregivers/available
            GET/POST /api/caregiver-assignments
            POST /api/leave-requests
CRM         GET/POST /api/leads                GET/PATCH /api/leads/:id
            POST /api/leads/:id/activities     GET/POST /api/crm-tasks
REFERRALS   GET/POST /api/referrals            PATCH /api/referrals/:id
COMMS       GET/POST /api/messages             GET /api/notifications
            POST /api/notifications/:id/read   PATCH /api/notification-preferences
MONEY       GET  /api/invoices                 GET /api/invoices/:id
            POST /api/payments/create          POST /api/payments/webhook
            POST /api/pricing/estimate
CONFIG      GET/POST/PATCH /api/admin/packages · /services · /service-areas ·
            /task-templates · /notification-templates · /escalation-rules ·
            /vital-thresholds · /lead-sources · /staff
ANALYTICS   GET  /api/analytics/overview       GET /api/analytics/funnel
            GET  /api/analytics/operations     GET /api/analytics/referrals
FEEDBACK    GET/POST /api/feedback
PUBLIC      GET  /api/public/packages          GET /api/public/service-areas
            POST /api/public/contact
```

---

## 7. Component structure

```
src/
  app/
    (marketing)/…          public pages, shared marketing layout
    (auth)/…               login / register / otp / password reset
    (app)/app/…            authenticated shell + per-role route groups
    api/…                  route handlers
    globals.css            design tokens, accessibility overrides
  components/
    ui/                    Button Card Input Select Textarea Checkbox RadioGroup
                           Badge StatusPill Table Tabs Modal Drawer Toast Tooltip
                           Alert EmptyState Skeleton Pagination Avatar Progress
                           Stat SectionHeading Breadcrumb FieldError Steps
    charts/                LineTrend BarSeries DonutSplit Sparkline (Recharts)
    marketing/             SiteHeader SiteFooter Hero SectionShell PackageCard
                           JourneySelector TrustGrid FaqAccordion Testimonial
                           ServiceAreaMap DashboardPreview CtaBand
                           EmergencyNotice DisclaimerBanner
    app-shell/             AppHeader RoleNav MobileTabBar NotificationBell
                           UserMenu AccessibilityMenu PageHeader
    intake/                IntakeWizard + Step1…Step7 + Recommendation
    family/  senior/  caregiver/  nurse/  admin/  partner/
                           role-specific composites (TimelineFeed TodayStatus
                           VisitRunner ReplacementMatcher LeadPipeline …)
  lib/
    db.ts session.ts auth.ts rbac.ts scope.ts audit.ts rate-limit.ts
    validation/*.ts  services/*.ts  integrations/*.ts
    constants.ts format.ts utils.ts
```

State: server components fetch through Prisma; interactive pieces are client components
using `useTransition` + route handlers. No global client store — the URL is the state.

---

## 8. Design system

**Voice.** Reassuring, respectful, plain. Never fear-based. "Professional support when your
family cannot be there every day" — not "you are neglecting your parents".

**Colour.** Deep teal `brand-600 #0f7d73` for action and identity (clinical calm without
stock-photo blue); warm sand `sand-50/100` for large restful surfaces; ink greys for text.
Status: success `#127c4c`, warning `#a35b06`, danger `#b42318`, info `#175cd3` — all ≥4.5:1
on white. Status is never colour-only: every pill carries an icon and a word.

**Type.** System sans for UI; a serif display face for marketing headlines to read premium
rather than templated. Base 16px, 1.6 line height; senior surfaces start at 20px.
Scale: 12 · 14 · 16 · 18 · 20 · 24 · 30 · 38 · 48.

**Space & shape.** 4px base, 8px rhythm. Radius 14px on cards, 10px on controls.
Two shadows only (`soft`, `lift`). Section padding 80–112px desktop / 48px mobile.

**Density.** Marketing is airy. Ops screens are dense tables, not card grids — admins scan
rows. Family screens sit between: one hero status block, then a timeline.

**Motion.** 160–240ms ease-out, opacity/translate only. Respects `prefers-reduced-motion`.

**Accessibility contract.** WCAG 2.1 AA target: visible 2px focus ring, 44px minimum touch
target (56px senior/caregiver), labels on every input, `aria-live` for async results,
keyboard-operable everything, no information conveyed by colour alone. Three user-controlled
modes persisted in a cookie and applied as `data-` attributes on `<html>`: text scale
(normal/large/x-large), high contrast, reduced motion.

---

## 9. Security architecture

| Control | Implementation |
| --- | --- |
| Password storage | bcrypt, cost 12; never logged; timing-safe compare path for unknown users |
| Sessions | Signed JWT (`jose`, HS256) in `HttpOnly`+`Secure`+`SameSite=Lax` cookie, 8h TTL; `sid` maps to a `Session` row so logout/compromise revokes server-side |
| OTP | 6 digits, hashed at rest, 5-minute TTL, 5 attempts, 60s resend cooldown, single-use |
| Authorisation | Deny-by-default. `requireUser(role[])` then `assertSeniorAccess()` row scoping. Route handlers never trust an id from the client without a scope check |
| Input validation | zod at every boundary (body, query, params); rejects unknown keys |
| Rate limiting | Fixed-window counter keyed by route + IP hash + identity; pluggable store (in-memory dev → Redis prod) |
| Audit | `AuditLog` on auth events, PHI reads of clinical detail, all clinical/financial mutations, role changes, document access. Stores *what*, not the sensitive value |
| PHI-safe logging | `src/lib/log.ts` redacts a denylist of keys (phone, email, address, conditions, notes, vitals, document names) before anything reaches stdout |
| Data in URLs | Internal ids are cuids and never carry names; document downloads stream through an authorised handler, never a public URL |
| Documents | Stored outside the web root (local driver) or in a private bucket with SSE (s3 driver). MIME + magic-byte + size validation, extension allowlist, per-file access check on download |
| Transport | HSTS + secure cookies; app assumes TLS termination upstream |
| Headers | `X-Frame-Options: DENY`, `nosniff`, restrictive `Referrer-Policy` and `Permissions-Policy`, `no-store` on `/app` and `/api` |
| Secrets | Environment variables only; `.env` git-ignored; no key material in the repo |
| Backups | Managed Postgres PITR + nightly logical dump to an encrypted bucket with 35-day retention (documented, provisioned at deploy time) |
| Consent | `Senior.consentCapturedAt/By` and a configurable consent text; data-processing consent recorded at intake |

**Known gaps before production** — see README "Known limitations". The big ones: no field-level
encryption for the most sensitive columns yet, in-memory rate-limit store, no automated DPDP
Act data-subject-request tooling, and no external security review.

---

## 10. Roadmap — MVP vs future

### Phase 1 — Acquisition core *(built)*
Public site · 3 journey landings · SEO pages · 7-step assessment funnel · lead creation ·
family registration + auth + RBAC · senior profiles · admin CRM pipeline · package catalogue ·
booking · caregiver assignment · invoice/payment architecture.

### Phase 2 — Care delivery *(built)*
Caregiver dashboard with check-in/out and tasks · nurse supervisor dashboard · care plans with
version history · visit tracking · daily care notes · family update timeline.

### Phase 3 — Clinical-adjacent *(built)*
Vitals with configurable thresholds and "requires review" flags · medication reminders ·
appointments + calendar · document management · incident and escalation management ·
referral-partner portal.

### Phase 4 — Scale *(partially built: analytics + config are in; integrations are adapters)*
Analytics dashboards *(built)* · admin configuration surfaces *(built)* ·
live WhatsApp/SMS/email delivery *(adapter only — needs provider contracts)* ·
Razorpay live mode + subscription auto-billing *(adapter + order/webhook flow, needs keys)* ·
automated visit-schedule generation from care plans · ML-assisted caregiver matching ·
caregiver mobile PWA with offline check-in · family mobile app · IVR fallback for seniors.

### Explicitly out of scope for now
Diagnosis or triage automation · e-prescription · teleconsultation video · insurance claims ·
device/IoT vitals ingestion · ABDM/ABHA integration (needs compliance review first).
