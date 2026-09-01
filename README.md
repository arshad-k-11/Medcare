# Medcare — elder care coordination platform

A production-shaped web application for a Mumbai home-care business that sells **structured
care packages and outcomes**, not caregiver hours. It covers the whole operating loop:
acquisition, assessment, care planning, caregiver deployment, nurse supervision, family
visibility, referral partners, billing and audit.

The product is built around one fact that most healthcare software gets wrong: **the patient
and the payer are different people.** A senior receives the care; an adult child — often in
another city or another country — chooses it, pays for it and worries about it. Almost every
screen here is shaped by that split.

Full pre-implementation design work (architecture, role matrix, sitemap, schema, journeys,
API design, component structure, design system, security model, roadmap) is in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Read that first if you want to understand
*why* rather than *how to run it*.

---

## Quick start

Requirements: **Node 20+** and npm. No database server needed for the demo.

```bash
npm install
cp .env.example .env

# Generate a session secret and put it in .env as AUTH_SECRET
openssl rand -base64 48

npm run demo:sqlite     # creates prisma/dev.db, applies the schema, seeds demo data
# copy the DATABASE_URL it prints into .env

npm run dev             # http://localhost:3000
```

`npm run demo:sqlite` exists because production targets PostgreSQL but a reviewer's laptop
usually has no Postgres running. `prisma/schema.prisma` stays on `postgresql`;
`scripts/schema-for-env.mjs` derives a SQLite copy at run time by swapping **only** the
provider line, so the two cannot drift.

### Running against PostgreSQL

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/medcare?schema=public"

npm run db:generate
npm run db:migrate      # or: npm run db:push for a throwaway database
npm run db:seed         # optional — see the warning about demo data below
npm run build && npm start
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Generates the Prisma client, then builds for production |
| `npm start` | Serves the production build |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm run lint` | ESLint 9 flat config, `next/core-web-vitals` + `next/typescript`. Clean |
| `npm run db:migrate` | Prisma migration (development) |
| `npm run db:push` | Push the schema without a migration |
| `npm run db:seed` | Seed demo data into whatever `DATABASE_URL` points at |
| `npm run db:studio` | Prisma Studio |
| `npm run demo:sqlite` | One command: derive SQLite schema, push, generate, seed |

---

## Environment variables

Copy `.env.example` to `.env`. Nothing here ships with a value that would work against a
real provider — there are **no placeholder API keys in the repository**, and every
integration is written to degrade honestly when it is unconfigured rather than to pretend
it worked.

### Required

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | PostgreSQL in production; `file:…` for the SQLite demo |
| `AUTH_SECRET` | Session signing key, at least 32 characters. `openssl rand -base64 48`. Anything touching a session throws without it, so sign-in fails loudly rather than silently accepting an unsigned token |
| `NEXT_PUBLIC_APP_URL` | Absolute origin, used for links in notifications and canonical URLs |

### Optional, with sane defaults

| Variable | Default | Notes |
| --- | --- | --- |
| `SESSION_MAX_AGE` | `28800` | Session lifetime in seconds |
| `NEXT_PUBLIC_SITE_NAME` | `Medcare` | Brand name shown throughout |
| `NEXT_PUBLIC_SUPPORT_PHONE` / `_EMAIL` | placeholder | Shown on public pages — **replace before launch** |
| `SMS_ENABLED` / `EMAIL_ENABLED` / `WHATSAPP_ENABLED` | `false` | When false, OTPs and notifications are written to the server log and recorded as `SKIPPED` with a reason, never as "sent" |
| `STORAGE_DRIVER` | `local` | `local` writes to `./private-uploads`, which is never web-served. `s3` needs a **private** bucket |

### Not configured out of the box

Email (`EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`), SMS (`SMS_PROVIDER`, `SMS_API_KEY`,
`SMS_SENDER_ID`), WhatsApp (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`), payments
(`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
`NEXT_PUBLIC_PAYMENTS_ENABLED`) and S3 (`S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`).

With payments unconfigured, checkout returns a clearly-labelled placeholder order and tells
the user online payment is not switched on yet. A silent failure at the last step of a
payment would be worse.

---

## Demo credentials

Created only by `npm run db:seed`. Every account uses the password **`Demo@12345`**.

| Role | Sign in with |
| --- | --- |
| Administrator | `admin@medcare.demo` |
| Operations manager | `ops@medcare.demo` |
| Nurse supervisor | `nurse@medcare.demo` |
| Nurse (second) | `nurse2@medcare.demo` |
| Caregiver (working) | `caregiver@medcare.demo` |
| Caregiver (on emergency leave) | `caregiver5@medcare.demo` |
| Family — local | `family@medcare.demo` |
| Family — Thane | `family2@medcare.demo` |
| Family — NRI | `nri@medcare.demo` |
| Senior | `senior@medcare.demo` |
| Referral partner (clinic) | `partner@medcare.demo` |
| Referral partner (hospital) | `partner2@medcare.demo` |

**Delete or change these before any real deployment.** They are seed data, they are
identical across every checkout of this repository, and the seed script says so when it runs.

All demo people, phone numbers, addresses and clinical details are invented. No real patient,
caregiver, hospital or partner appears anywhere in this repository.

### What the seed deliberately contains

The demo data is not uniformly happy, because a demo where nothing is wrong cannot show what
the product is for:

- a caregiver on **approved emergency leave**, so the replacement matcher has real work to do
- a caregiver **under internal review** who scores well but is returned as *ineligible*
- an **unverified** caregiver, so the verification banner is visible in the admin console
- two **inactive service areas**, so "we do not serve there" is a real answer
- a **lost lead** with the reason "We do not currently serve Vashi."
- vitals both inside and outside the configured review bands

---

## Things this system deliberately does not do

These are product decisions, enforced structurally rather than by convention. If you change
them, change them knowingly.

- **It does not diagnose.** `flagVital()` can only return `NORMAL` or `REQUIRES_REVIEW`, and
  the accompanying text states the measurement and the configured threshold. There is no code
  path that produces a clinical interpretation.
- **It does not treat an alert as an emergency.** No escalation rule reaches emergency
  services automatically. Screens that raise a concern tell the person to call a supervisor
  or emergency services themselves.
- **Caregivers cannot prescribe or change medication.** Medication endpoints record whether a
  scheduled dose was given, refused or missed. They cannot alter a prescription.
- **Incident severity from a caregiver is a report, not a finding.** `severityConfirmedBy`
  stays null until a nurse confirms it.
- **Nobody is called "verified" by default.** `CaregiverProfile.verificationStatus` defaults
  to `UNVERIFIED`, is a first-class column in the caregivers list, and the detail page tells
  ops not to describe an unverified caregiver as verified.
- **There are no testimonials, partner logos, certifications or approvals.** The homepage's
  social-proof section publishes real aggregates from the database or renders nothing.
  Inventing a customer quote would be the most damaging thing that page could do.
- **Partners see volume and response times, never revenue.** Showing a clinician the money
  their referrals generated turns a clinical judgement into a commercial one.
- **Legal, consent and privacy documents are drafts.** `src/content/legal.ts` carries a
  visible review banner and ALL-CAPS placeholders (`LEGAL_ENTITY_NAME`,
  `CARE_RECORD_RETENTION_PERIOD`, …) rather than invented facts. They need a lawyer before
  launch, not a find-and-replace.

---

## Security model

Detail is in `docs/ARCHITECTURE.md`; the short version:

- **Sessions** — `jose` HS256 JWT in an HttpOnly, Secure, SameSite=Lax cookie, backed by a
  `Session` row so a session can be revoked server-side. Passwords are bcrypt cost 12, with a
  dummy-hash comparison on unknown accounts so login timing does not disclose whether an
  email exists.
- **Two-layer authorisation** — a deny-by-default capability map (`src/lib/rbac.ts`) answers
  "may this role do this at all", and a row-level patient scope (`src/lib/scope.ts`) answers
  "may this user do it to *this* patient". Both are applied on every protected route; the
  scope is pushed into the Prisma `where` clause rather than checked after fetching.
- **Validation** — every API boundary parses input with a `.strict()` zod schema. Unknown
  keys are rejected, not ignored.
- **Documents** — private files are never web-served. The single read path authorises against
  patient scope, responds 404 rather than 403 (so it cannot be used to probe for records),
  streams with `Cache-Control: private, no-store`, and writes an audit row.
- **Logging and audit** — a key denylist keeps health values and credentials out of logs. The
  audit trail records *what was accessed and by whom*, not the clinical value.
- **Rate limiting** — fixed-window, pluggable store. In-memory in development; **swap in
  Redis before running more than one instance** (see Known limitations).

---

## Deployment

The app is a standard Next.js 15 App Router application and runs anywhere Node 20 does —
Vercel, a container, or a VM behind nginx.

1. Provision **PostgreSQL** and set `DATABASE_URL`.
2. Set `AUTH_SECRET` to a freshly generated value, unique per environment.
3. Set `NEXT_PUBLIC_APP_URL` to the real origin.
4. Run `npx prisma migrate deploy`.
5. `npm run build && npm start`.
6. Create the first administrator directly in the database or through a one-off script. **Do
   not run the demo seed in production.**
7. Serve over HTTPS only. Session cookies are marked Secure, so authentication will not work
   over plain HTTP outside localhost.
8. Configure `STORAGE_DRIVER=s3` with a **private** bucket. Document downloads are proxied
   through the application so that authorisation and audit still apply; the bucket must not be
   publicly readable.
9. Before going live, have the legal documents reviewed, replace the support phone and email,
   and decide the real data-retention period.

---

## Known limitations

Stated plainly, because the gap between "demo-complete" and "production-ready" is where these
projects usually go wrong.

1. **Rate limiting is in-memory.** It is correct for a single instance and useless behind a
   load balancer. The store is an interface — point it at Redis before scaling out.
2. **No automated test suite.** The build, strict typecheck and zod schemas catch a lot; they
   are not tests. Intake, matching, vitals flagging and the RBAC/scope layer are the four
   places that need real tests first.
3. **Notifications are logged, not delivered,** until a provider is configured. Delivery is
   recorded as `SKIPPED` with a reason, so nothing claims to have been sent when it was not.
4. **Payments are not live.** The Razorpay adapter creates orders and verifies webhook
   signatures, but has never run against a real key. Webhook idempotency needs a load test
   before it handles money.
5. **Legal, consent and privacy content is a draft** awaiting professional review. So are the
   consent-capture flows: the model records *who* consented, *when* and *to what version*, but
   the wording itself is not yet approved.
6. **Vital thresholds are seeded with commonly-used ranges,** configurable per senior. They
   are operational review triggers chosen by the business, not clinical guidance, and they
   should be signed off by the supervising clinician before launch.
7. **Caregiver location on check-in is optional and advisory.** It never blocks a check-in —
   a caregiver standing outside a building with poor GPS must still be able to start work —
   so `locationVerified` is a signal for ops, not proof of attendance.
8. **English only.** The interface is written for Mumbai but not yet translated to Hindi or
   Marathi, which real caregivers and many seniors would need. Strings are not yet extracted.
9. **No offline mode for caregivers.** The mobile caregiver surface assumes connectivity at
   check-in and check-out.
10. **Analytics are computed on read.** Fine at demo volume; the dashboard queries will need
    materialised summaries once there are years of visits.

---

## Recommended next steps

Roughly in the order they would pay off:

1. **Tests before features** — integration tests for the intake transaction, the replacement
   matcher's scoring and eligibility rules, vital flagging boundaries, and a table-driven
   RBAC/scope suite that asserts every role against every capability.
2. **Redis-backed rate limiting and sessions**, so the app can run more than one instance.
3. **Legal and clinical review** of the draft documents, consent wording and vital thresholds,
   then remove the review banners.
4. **Connect one notification channel end to end** (WhatsApp first — it is how Indian families
   actually communicate) including delivery receipts and quiet hours.
5. **Take payments live** in Razorpay test mode, then production, with webhook replay testing
   and reconciliation against invoices.
6. **Hindi and Marathi translations**, starting with the caregiver and senior surfaces.
7. **Offline-tolerant caregiver check-in** — queue visit events locally and sync.
8. **Structured outcome tracking** — the packages are sold on outcomes, so measure them:
   readmission within 30 days, falls, medication adherence, family-reported confidence.
9. **Observability** — error tracking, structured request logs with the PHI denylist applied,
   and alerting on missed visits and unresolved escalations.
10. **A background job runner** for scheduled work that currently happens on request: visit
    reminders, at-risk visit detection, invoice generation and document-expiry warnings.

---

## Project layout

```
docs/ARCHITECTURE.md      Pre-implementation design: schema, journeys, APIs, security, roadmap
prisma/                   Schema (PostgreSQL) and the five-part seed
scripts/                  SQLite schema derivation and the one-command demo
src/app/(marketing)/      Public site: homepage, packages, pricing, three journey landings
src/app/(app)/app/        Signed-in surfaces, one directory per role
src/app/api/              50 REST route handlers, all zod-validated and capability-guarded
src/components/           Design system in components/ui, then one directory per surface
src/content/              Editable copy: legal drafts, FAQs, resources
src/lib/                  auth, rbac, scope, audit, validation, services, integrations
```

Integrations (`src/lib/integrations/`) are adapters. Notifications, payments and storage each
have one interface and a driver chosen by environment variable, so a provider can be swapped
without touching a route handler.
