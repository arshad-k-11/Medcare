/**
 * FAQ content.
 *
 * Written to answer what families actually ask on a first call, including the awkward
 * questions (what happens when a caregiver does not turn up, are you medical, what if you
 * do not serve my area). Kept in one module so it can also feed the FAQPage structured
 * data without the two drifting apart.
 */

export type FaqItem = { question: string; answer: string };

export const HOME_FAQ: FaqItem[] = [
  {
    question: 'Are you a medical service? Can you send a doctor or a nurse?',
    answer:
      'We provide non-medical caregiver support, nursing visits and care coordination at home. Our nurses write and review care plans, check recorded readings and caregiver notes, and escalate concerns. We do not diagnose conditions, prescribe or change medication, or provide emergency medical response. If you need a doctor, we help coordinate the appointment rather than replace it.',
  },
  {
    question: 'What happens if the caregiver does not turn up?',
    answer:
      'A missed visit becomes our operations team’s problem within thirty minutes, not yours. We confirm whether the caregiver is delayed or unavailable, arrange cover, and tell you what is happening and when. If a caregiver becomes unavailable for a longer period, our system ranks who can cover on proximity, availability, skills, language and shift compatibility, and we tell you who is coming and why the change happened.',
  },
  {
    question: 'Are your caregivers verified?',
    answer:
      'We check identity, address and police verification before a caregiver is deployed, and we record training internally. Where a check is still in progress, our own system labels that caregiver as unverified — we never describe someone as verified until the check has actually been completed. You can ask us the verification status of the person assigned to your parent at any time.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'Each care plan shows an indicative starting price, and the pricing page has a calculator you can use to get a rough estimate. The actual plan and price are confirmed after the free home assessment, because what a family needs on the phone and what they need in the room are often different. Nothing is charged before you agree to a plan.',
  },
  {
    question: 'I live abroad. How do I know care is actually happening?',
    answer:
      'Every visit produces a timeline entry the same day: arrival time, tasks completed, medication reminders confirmed, any readings recorded, and the caregiver’s notes. You also get a weekly summary and a monthly care report. On the NRI plan you have one named coordinator who knows the situation, rather than a general helpline.',
  },
  {
    question: 'Do you serve my area?',
    answer:
      'We currently serve a specific set of areas in Mumbai and Thane, listed on the service areas page. We assign caregivers from the area they already work in, which is why coverage is narrow. If you are outside those areas we will tell you honestly rather than stretching cover, and we will add you to a waitlist and call when the area opens.',
  },
  {
    question: 'Can you manage my parent’s medication?',
    answer:
      'We record the medication list entered by the family or our nurse from the prescription, send reminders at the agreed times, and log whether each was confirmed, missed or not needed. We do not prescribe, we do not change doses, and a caregiver will never give anything that is not on the recorded list. The log is designed so you can take it to the treating doctor.',
  },
  {
    question: 'Who decides and who pays if I am not the patient?',
    answer:
      'The platform treats the patient and the payer as different people, because they usually are. An adult child can hold the account, receive the updates, manage payments and make decisions, while the senior receives the care and can have their own simplified login if they want one. You can also control whether a linked family member sees clinical detail.',
  },
  {
    question: 'What happens to my parent’s health information?',
    answer:
      'It is treated as sensitive throughout. Access is limited by role and to the specific patients a person is involved with; documents are stored privately and only served through an authorised, logged request; and sensitive actions are recorded in an audit trail. Our privacy notice and consent wording are drafted and pending professional review before launch — we would rather say that plainly than claim a compliance certification we do not hold.',
  },
  {
    question: 'Can I start small and increase later?',
    answer:
      'Yes, and most families should. A fall-prevention and home-safety assessment or a short post-discharge plan is often the right first step. Plans are reviewed on a fixed date, and the review is a genuine decision point — including the option to stop.',
  },
];

export const NRI_FAQ: FaqItem[] = [
  {
    question: 'What time will I get updates, given the time difference?',
    answer:
      'Visit updates appear in your dashboard as they happen, and we time the written daily and weekly summaries so they are waiting for you at the start of your day. Your timezone is recorded on your account and appointment times are shown in both your timezone and IST — you need to know when the caregiver arrives local to your parent, not only local to you.',
  },
  {
    question: 'Who do I call if something is wrong at 2am my time?',
    answer:
      'You have a named coordinator and an escalation route recorded in the care plan, including who we call first and in what order. For anything high severity we contact you regardless of the hour, because that is what the plan says to do. For non-urgent matters, you can message the care team in the platform and get a reply during Mumbai working hours.',
  },
  {
    question: 'Can I pay from abroad?',
    answer:
      'Yes. Invoices are raised against your account and paid online. Monthly plans are billed on a subscription so you are not arranging a transfer every month. Every invoice itemises what it covers.',
  },
  {
    question: 'My parent does not like strangers in the house. How do you handle that?',
    answer:
      'Consistency is the whole answer: the same caregiver, introduced properly, on fixed days. We record language preference and household preferences in the care plan, and when a change is unavoidable we tell the senior in advance rather than sending someone new to the door unannounced. If a senior refuses care, the caregiver records it rather than pushing, and the nurse adjusts the approach.',
  },
  {
    question: 'What if I want to add my sibling to the account?',
    answer:
      'Multiple family members can be linked to the same senior, each with their own login. You control who is the primary contact, who is the payer, and whether a particular family member can see clinical detail.',
  },
];

export const PARTNER_FAQ: FaqItem[] = [
  {
    question: 'How quickly do you contact a referred patient?',
    answer:
      'Our target is two hours for a same-day discharge and four hours for anything marked urgent, during operating hours. You can see the actual contacted timestamp on your referral, so the commitment is checkable rather than asserted.',
  },
  {
    question: 'What do you need from me to make a referral?',
    answer:
      'The patient’s name and area, a family contact number, the reason for referral, discharge status, and confirmation that the patient or family has agreed to being contacted. That consent confirmation is required — we will not accept health information about someone who has not agreed to the referral.',
  },
  {
    question: 'Will you tell me what happened to my referral?',
    answer:
      'You see the status move through submitted, contacted, assessment and converted or declined, along with the reason if we decline. You do not see the patient’s clinical record — that belongs to the patient and their family, not to the referral source.',
  },
  {
    question: 'Is there a commission?',
    answer:
      'We do not pay per-referral commissions to clinicians. Referral attribution exists so we can report volumes and outcomes back to you and so we know which relationships are working, not to create a financial incentive to refer.',
  },
  {
    question: 'What do you not do?',
    answer:
      'We do not provide medical treatment, procedures, prescriptions or emergency response, and we do not take over clinical responsibility for your patient. We provide attendant support, nursing review visits and coordination at home, and we route anything clinical back to the treating doctor.',
  },
];

export const ALL_FAQ: { section: string; items: FaqItem[] }[] = [
  { section: 'About the service', items: HOME_FAQ },
  { section: 'For families outside Mumbai', items: NRI_FAQ },
  { section: 'For hospitals, doctors and referral partners', items: PARTNER_FAQ },
];
