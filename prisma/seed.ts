/**
 * Demo data entry point.
 *
 * Run with `npm run demo:sqlite` (zero-config local database) or `npm run db:seed`
 * against an already-pushed PostgreSQL database.
 *
 * Everything seeded here is fabricated. There are no real people, hospitals, doctors,
 * customer testimonials, partner logos, certifications or regulatory approvals anywhere in
 * the seed — the business has not earned those yet, so the demo does not display them.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedCatalogue } from './seed-catalogue';
import { seedPeople } from './seed-people';
import { seedPipeline } from './seed-pipeline';
import { DEMO_PASSWORD } from './seed-utils';

const prisma = new PrismaClient();

/** Children before parents, so foreign keys never block the reset. */
async function reset() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.message.deleteMany(),
    prisma.messageParticipant.deleteMany(),
    prisma.messageThread.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.feedback.deleteMany(),
    prisma.document.deleteMany(),
    prisma.escalation.deleteMany(),
    prisma.incident.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.medicationReminder.deleteMany(),
    prisma.medication.deleteMany(),
    prisma.vitalThreshold.deleteMany(),
    prisma.vital.deleteMany(),
    prisma.careNote.deleteMany(),
    prisma.visitTask.deleteMany(),
    prisma.visit.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.staffAvailability.deleteMany(),
    prisma.caregiverAssignment.deleteMany(),
    prisma.carePlanService.deleteMany(),
    prisma.carePlanVersion.deleteMany(),
    prisma.carePlan.deleteMany(),
    prisma.assessmentAnswer.deleteMany(),
    prisma.assessment.deleteMany(),
    prisma.crmTask.deleteMany(),
    prisma.intakeSubmission.deleteMany(),
    prisma.referral.deleteMany(),
    prisma.leadActivity.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.leadSource.deleteMany(),
    prisma.seniorFamilyLink.deleteMany(),
    prisma.senior.deleteMany(),
    prisma.trainingRecord.deleteMany(),
    prisma.staffDocument.deleteMany(),
    prisma.caregiverProfile.deleteMany(),
    prisma.nurseProfile.deleteMany(),
    prisma.partnerProfile.deleteMany(),
    prisma.familyProfile.deleteMany(),
    prisma.packageService.deleteMany(),
    prisma.carePackage.deleteMany(),
    prisma.service.deleteMany(),
    prisma.taskTemplate.deleteMany(),
    prisma.assessmentQuestion.deleteMany(),
    prisma.escalationRule.deleteMany(),
    prisma.notificationTemplate.deleteMany(),
    prisma.serviceArea.deleteMany(),
    prisma.appSetting.deleteMany(),
    prisma.session.deleteMany(),
    prisma.otpChallenge.deleteMany(),
    prisma.passwordReset.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  console.log('▸ Clearing existing data…');
  await reset();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  console.log('▸ Seeding the configurable catalogue…');
  const catalogue = await seedCatalogue(prisma);

  console.log('▸ Seeding staff, families, patients and care delivery…');
  const people = await seedPeople(prisma, passwordHash, catalogue);

  console.log('▸ Seeding leads, referrals, billing and audit…');
  await seedPipeline(prisma, catalogue, people);

  const counts = {
    users: await prisma.user.count(),
    patients: await prisma.senior.count(),
    visits: await prisma.visit.count(),
    leads: await prisma.lead.count(),
    referrals: await prisma.referral.count(),
  };

  console.log(`
Seed complete.
  ${counts.users} users · ${counts.patients} patients · ${counts.visits} visits · ${counts.leads} leads · ${counts.referrals} referrals

Demo sign-in — the password for every account below is:  ${DEMO_PASSWORD}

  Administrator          admin@medcare.demo
  Operations manager     ops@medcare.demo
  Nurse supervisor       nurse@medcare.demo
  Nurse (second)         nurse2@medcare.demo
  Caregiver (working)    caregiver@medcare.demo
  Caregiver (on leave)   caregiver5@medcare.demo
  Family — local         family@medcare.demo
  Family — Thane         family2@medcare.demo
  Family — NRI           nri@medcare.demo
  Senior                 senior@medcare.demo
  Referral partner       partner@medcare.demo
  Hospital partner       partner2@medcare.demo

These credentials exist only in seed data. Change or remove them before any real deployment.
`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
