/**
 * Production bootstrap.
 *
 * A freshly migrated database is empty, so the public site has no care packages and no
 * service areas, and there is nobody who can sign in to create them. The demo seed is not
 * the answer — it also creates sixteen fictional people who share one published password.
 *
 * This script seeds only the *business configuration* (packages, services, areas, task and
 * assessment templates, vital thresholds, escalation rules, notification templates,
 * settings) and creates a single real administrator from environment variables.
 *
 *   ADMIN_EMAIL="you@yourdomain.com" \
 *   ADMIN_NAME="Your Name" \
 *   ADMIN_PASSWORD='a long passphrase' \
 *   npm run db:bootstrap
 *
 * It never deletes anything, and it refuses to overwrite an existing catalogue or an
 * existing account, so running it twice by accident cannot damage live data.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedCatalogue } from './seed-catalogue';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 12;

/** Anything that looks like the demo password must never reach a production database. */
const FORBIDDEN_PASSWORDS = ['demo@12345', 'password', 'admin123', 'changeme'];

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  const secret = process.env.ADMIN_PASSWORD;

  if (!email || !name || !secret) {
    fail(
      'Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD before running this.\n' +
        "  Example: ADMIN_EMAIL=\"you@yourdomain.com\" ADMIN_NAME=\"Your Name\" ADMIN_PASSWORD='a long passphrase' npm run db:bootstrap",
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(`"${email}" is not a valid email address.`);
  if (secret.length < MIN_PASSWORD_LENGTH) {
    fail(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (FORBIDDEN_PASSWORDS.includes(secret.toLowerCase())) {
    fail('That is a well-known demo password. Choose something else.');
  }

  // --- Catalogue -----------------------------------------------------------
  const existingPackages = await prisma.carePackage.count();
  if (existingPackages > 0) {
    console.log(
      `▸ Skipping the catalogue — ${existingPackages} care package(s) already exist. Edit them in the admin console rather than reseeding.`,
    );
  } else {
    console.log('▸ Seeding business configuration (packages, services, areas, templates)…');
    await seedCatalogue(prisma);
  }

  // --- Administrator -------------------------------------------------------
  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true, role: true },
  });

  if (existingUser) {
    console.log(`▸ ${email} already exists (role ${existingUser.role}) — left untouched.`);
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        role: 'ADMIN',
        status: 'ACTIVE',
        passwordHash: await bcrypt.hash(secret, BCRYPT_COST),
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`▸ Created administrator ${email}.`);
  }

  const demoAccounts = await prisma.user.count({ where: { email: { endsWith: '@medcare.demo' } } });

  console.log(`
Bootstrap complete.

  Sign in at /login as ${email} with the password you supplied.
  It was never written to a file or logged.

Next:
  • Review the seeded packages, prices and service areas in Configuration — they are
    starting points from this repository, not your commercial decisions.
  • Have the legal, consent and privacy drafts reviewed before taking real enquiries.
  • Have the vital thresholds signed off by your supervising clinician.
`);

  if (demoAccounts > 0) {
    console.log(
      `⚠ This database also holds ${demoAccounts} demo account(s) ending in @medcare.demo, which all share a published password. Delete them before going live.\n`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
