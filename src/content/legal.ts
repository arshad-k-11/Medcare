/**
 * Legal and policy content.
 *
 * IMPORTANT: this is a serious draft, not a signed-off legal position. Every document
 * carries a visible review banner, and the platform records that status in AppSetting
 * (`legal.reviewStatus`) so the business cannot quietly ship it as final. A real launch
 * needs Indian counsel to review these against the DPDP Act 2023, the Consumer Protection
 * Act, and any applicable state rules on home nursing services — plus clinical review of
 * the medical disclaimer by a qualified professional.
 *
 * Placeholders in ALL CAPS are deliberate: they are the facts only the business can supply.
 */

export type LegalDocument = {
  slug: string;
  title: string;
  metaDescription: string;
  updatedAt: string;
  summary: string;
  sections: { heading: string; paragraphs: string[]; list?: string[] }[];
};

const REVIEW_NOTE =
  'This document is a draft pending professional legal review before launch. It describes how the platform is built and how the business intends to operate; it is not yet a reviewed contractual or regulatory position.';

export const LEGAL_REVIEW_NOTE = REVIEW_NOTE;

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'terms',
    title: 'Terms of service',
    metaDescription:
      'The terms on which Medcare provides elder-care coordination, caregiver support and nursing visits at home in Mumbai.',
    updatedAt: '2026-04-01',
    summary:
      'What we agree to provide, what you agree to, how plans are billed and cancelled, and the limits of our responsibility.',
    sections: [
      {
        heading: '1. Who we are and what these terms cover',
        paragraphs: [
          'These terms govern your use of the Medcare platform and the care services arranged through it. "We", "us" and "Medcare" mean LEGAL_ENTITY_NAME, registered in India at REGISTERED_ADDRESS, CIN/registration REGISTRATION_NUMBER.',
          'By creating an account, submitting an enquiry, or accepting a care plan, you agree to these terms. Where a senior receives care and a family member arranges and pays for it, both are bound by the terms relevant to their role.',
        ],
      },
      {
        heading: '2. What we provide',
        paragraphs: [
          'We provide three categories of service, and the distinction is material both practically and legally:',
        ],
        list: [
          'Non-medical caregiver and attendant support — assistance with mobility, meals, personal hygiene, companionship, care-related household tasks, and reminders about medication that has been recorded by an authorised person.',
          'Nursing services — visits by qualified nursing staff to assess, review a care plan, review recorded observations, and carry out nursing tasks within their scope of practice.',
          'Care coordination — assessment, care planning, scheduling, caregiver assignment and replacement, appointment coordination, documentation and family reporting.',
        ],
      },
      {
        heading: '3. What we do not provide',
        paragraphs: [
          'We are not a hospital, a clinic, a diagnostic service or an emergency service. Specifically, we do not and will not:',
        ],
        list: [
          'Diagnose any medical condition, or present an automated alert as a diagnosis.',
          'Prescribe medication, or alter any dose, timing or medication prescribed by a doctor.',
          'Provide emergency medical response. In an emergency you must contact emergency services or attend a hospital.',
          'Provide medical treatment or procedures outside the recorded scope of practice of our nursing staff.',
          'Assume clinical responsibility for a patient in place of their treating doctor.',
        ],
      },
      {
        heading: '4. The assessment and the care plan',
        paragraphs: [
          'Care begins with an assessment. Prices shown on our website are indicative starting points; the binding scope and price are those set out in the written care plan you accept.',
          'A care plan may be revised. Where it is, we record the revision, the reason, and who authorised it, and we make the revision available to you. Material changes to scope or price require your agreement.',
          'We may decline to provide services where we cannot do so safely or competently — including where the area is outside our current coverage, or the need exceeds what our staff are qualified to deliver. We will tell you promptly and with a reason.',
        ],
      },
      {
        heading: '5. Your responsibilities',
        paragraphs: ['To deliver care safely we rely on you to:'],
        list: [
          'Provide accurate information about the senior\'s condition, medication and history, and tell us promptly when it changes.',
          'Confirm that the senior consents to the care, or that you are lawfully entitled to consent on their behalf.',
          'Provide a safe working environment for our staff, free from harassment, and raise any concern with us rather than with the caregiver alone.',
          'Not ask our caregivers to perform tasks outside the agreed plan, and in particular not to administer, withhold or alter medication.',
          'Pay invoices by their due date.',
        ],
      },
      {
        heading: '6. Our staff',
        paragraphs: [
          'Our caregivers and nurses are engaged by us and are not your employees. Please do not offer direct employment, direct payment or gratuities outside the agreed arrangement — it undermines the supervision the service depends on.',
          'We complete identity, address and police verification before deploying a caregiver, and we record the status of every check. Where a check is incomplete, our systems record the caregiver as unverified and we will tell you if asked.',
          'We may change the assigned caregiver where necessary, including for leave, illness, performance or safety. We will tell you who the replacement is and why the change was made.',
        ],
      },
      {
        heading: '7. Fees, billing and cancellation',
        paragraphs: [
          'One-time plans are invoiced in advance. Monthly plans are invoiced on a recurring cycle stated in your plan. All amounts are in Indian rupees. Tax treatment will be stated on the invoice.',
          'You may cancel a monthly plan with NOTICE_PERIOD notice, effective at the end of the current billing period. We may suspend services for non-payment after written notice.',
          'We do not charge you for a visit that did not take place, and we do not charge a fee for arranging a replacement caregiver where the change was ours to manage. Refunds for services not delivered are processed to the original payment method within REFUND_WINDOW.',
        ],
      },
      {
        heading: '8. Complaints',
        paragraphs: [
          'Raise a complaint through the platform, by email or by phone. We acknowledge complaints within COMPLAINT_ACK_TIME and record the resolution. Complaints about the conduct or safety of a staff member are escalated immediately and may result in that person being withdrawn pending review.',
        ],
      },
      {
        heading: '9. Liability',
        paragraphs: [
          'We are responsible for providing the agreed services with reasonable care and skill, and for the acts and omissions of our staff in the course of providing them.',
          'We are not responsible for the clinical outcome of a condition, for decisions made by a treating doctor or hospital, or for the consequences of information you gave us that was materially inaccurate or incomplete.',
          'Nothing in these terms limits liability where it cannot lawfully be limited, including for death or personal injury caused by our negligence. Any other limit of liability is as stated in LIABILITY_CLAUSE — subject to legal review.',
        ],
      },
      {
        heading: '10. Changes, governing law and disputes',
        paragraphs: [
          'We may update these terms and will notify you of material changes before they take effect for your plan.',
          'These terms are governed by the laws of India, and the courts at Mumbai have jurisdiction, subject to any dispute-resolution process stated in DISPUTE_RESOLUTION_CLAUSE.',
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy notice',
    metaDescription:
      'What personal and health information Medcare collects, why, who can see it, how long it is kept, and your rights over it.',
    updatedAt: '2026-04-01',
    summary:
      'We handle health information. This notice sets out what we collect, who can see it, how it is protected, and what you can ask us to do with it.',
    sections: [
      {
        heading: '1. Scope',
        paragraphs: [
          'This notice covers personal data we process about families, seniors receiving care, our staff and referral partners. LEGAL_ENTITY_NAME is the data fiduciary. Our grievance officer is GRIEVANCE_OFFICER_NAME, contactable at GRIEVANCE_OFFICER_EMAIL.',
          'It is written with the Digital Personal Data Protection Act 2023 in mind and is pending legal review against it.',
        ],
      },
      {
        heading: '2. What we collect',
        paragraphs: ['We collect only what the care requires. In practice that is:'],
        list: [
          'Contact and identity details of the family member arranging care.',
          'About the senior: name, age, gender, address and area, living arrangement, mobility, conditions and allergies as told to us, languages, and emergency contacts.',
          'Care records: assessments, care plans, visit records including check-in time and optionally location, caregiver notes, recorded observations such as blood pressure or glucose, medication lists entered by an authorised person, appointments, incidents and documents you upload.',
          'Communication with us, including messages, notes of calls, and feedback or complaints.',
          'Billing information. Card and bank details are handled by our payment gateway — we do not store them.',
          'Technical data: session information and, for security records, a one-way hash of the IP address rather than the address itself.',
        ],
      },
      {
        heading: '3. Why we process it',
        paragraphs: [
          'To assess care needs and write a care plan; to deliver, supervise and document care; to arrange replacement caregivers; to communicate with you; to bill you; to investigate incidents and complaints; to meet legal and record-keeping obligations; and to keep the platform secure.',
          'We do not sell personal data. We do not use health information for advertising. We do not use identifiable care records to train machine-learning models.',
        ],
      },
      {
        heading: '4. Consent',
        paragraphs: [
          'We record who consented to care and when, including where a family member consented on a senior\'s behalf. Where a referral partner sends us a patient\'s details, they must confirm the patient or family agreed to the referral.',
          'You can withdraw consent, and we will tell you plainly what that means for the care we can continue to provide.',
        ],
      },
      {
        heading: '5. Who can see it',
        paragraphs: ['Access is restricted twice over — by role, and by which specific patients a person is involved with.'],
        list: [
          'Caregivers see the care instructions for the patients they are assigned to, and nothing else.',
          'Nurses see the clinical record of patients they supervise or attend.',
          'Operations staff see the records needed to schedule, bill and resolve issues.',
          'Family members see the record of seniors they are linked to. Whether a particular family member sees clinical detail is a setting you control.',
          'Referral partners see the status of referrals they submitted — never a patient\'s care record.',
          'Service providers who process data on our behalf, under contract: our hosting provider, database provider, payment gateway, and messaging providers. Each is listed in SUB_PROCESSOR_LIST.',
        ],
      },
      {
        heading: '6. How it is protected',
        paragraphs: [
          'Passwords are stored hashed with bcrypt and are never logged. Sessions are held in server-side records so access can be revoked immediately. Data is transmitted over TLS.',
          'Documents are stored outside any public directory and served only through an authorised, logged request; there is no public link to a private document. Sensitive actions are recorded in an audit trail that captures who and when without storing the sensitive value.',
          'Our application logs redact names, contact details, addresses, conditions, notes and observations before anything is written out, so operational logging cannot become a second copy of the medical record.',
          'We have not yet completed an external security audit, and field-level encryption of the most sensitive columns is planned rather than implemented. We would rather state that than imply otherwise.',
        ],
      },
      {
        heading: '7. How long we keep it',
        paragraphs: [
          'Care records are retained for CARE_RECORD_RETENTION_PERIOD, which is set to meet medical record-keeping expectations and any limitation period for claims. Billing records are retained for the period required by tax law. Enquiries that do not become customers are retained for ENQUIRY_RETENTION_PERIOD and then deleted.',
          'Audit records are retained for AUDIT_RETENTION_PERIOD because their purpose is to be able to reconstruct what happened after the fact.',
        ],
      },
      {
        heading: '8. Your rights',
        paragraphs: [
          'You can ask us for a copy of the personal data we hold about you or a senior you are lawfully entitled to act for; ask us to correct it; ask us to erase it, subject to the retention obligations above; withdraw consent; and nominate someone to exercise these rights on your behalf.',
          'Write to GRIEVANCE_OFFICER_EMAIL. We will respond within DSR_RESPONSE_TIME. If you are not satisfied, you may complain to the Data Protection Board of India.',
        ],
      },
      {
        heading: '9. Breach notification',
        paragraphs: [
          'If a personal data breach affects you, we will notify you and the Data Protection Board as required, describing what happened, what data was involved, and what we are doing about it. Our internal target for beginning notification is BREACH_NOTIFICATION_TARGET from becoming aware.',
        ],
      },
    ],
  },
  {
    slug: 'medical-disclaimer',
    title: 'Medical disclaimer',
    metaDescription:
      'The limits of Medcare’s services: we do not diagnose, prescribe or provide emergency medical care, and automated alerts are not medical conclusions.',
    updatedAt: '2026-04-01',
    summary:
      'Read this before relying on anything in the platform. It sets out precisely what our service and our software do and do not decide.',
    sections: [
      {
        heading: 'In an emergency',
        paragraphs: [
          'If you believe a medical emergency is happening, contact emergency services or go to the nearest hospital immediately. Do not use this platform, a message, or a call to us as your first action. Our caregivers are instructed to call emergency services first and record the event afterwards.',
        ],
      },
      {
        heading: 'We are not a medical provider',
        paragraphs: [
          'Medcare provides non-medical caregiver support, nursing visits within the recorded scope of practice of our nursing staff, and care coordination. We are not a hospital, clinic, diagnostic centre, pharmacy or emergency service, and we do not replace the treating doctor.',
          'Nothing on our website, in our guides, or in the platform is medical advice. Decisions about diagnosis, investigation, treatment and medication belong to a qualified doctor who has examined the patient.',
        ],
      },
      {
        heading: 'Recorded observations are records, not conclusions',
        paragraphs: [
          'Where our staff record observations such as blood pressure, pulse, temperature, blood glucose, oxygen saturation or weight, they record the reading as measured. They do not interpret it.',
          'The platform compares a reading against a range configured by a nurse, and where a reading falls outside that range it is flagged as "requires review" and routed to a qualified nurse. That flag means a person should look at it. It is not a diagnosis, it is not an assertion that anything is wrong, and it must not be treated as either.',
          'No automated alert in this platform constitutes a medical emergency determination. The platform does not have the information or the authority to make one.',
        ],
      },
      {
        heading: 'Medication',
        paragraphs: [
          'The platform stores a medication list entered by an authorised person — a family member or one of our nurses — from a prescription, and sends reminders at recorded times. It records whether each reminder was confirmed, missed or not needed.',
          'We do not prescribe. We do not change a dose, a timing or a medication. Our caregivers remind and record only, and are instructed never to give anything that is not on the recorded list. If a doctor changes a prescription, the list must be updated on that instruction — not from a phone conversation or a recollection.',
          'The medication record is designed to be useful to a treating doctor. It is not a substitute for the prescription itself.',
        ],
      },
      {
        heading: 'Scope of caregiver duties',
        paragraphs: [
          'Our caregivers provide non-medical support. They do not perform clinical procedures, make clinical judgements, or interpret symptoms. Where something concerns them, their instruction is to escalate to a nurse immediately rather than to act.',
          'Please do not ask a caregiver to do something clinical, however small it seems. It is outside their training and outside what we are permitted to provide.',
        ],
      },
      {
        heading: 'Professional review status',
        paragraphs: [
          'This disclaimer and the clinical-workflow wording it describes are drafted and pending review by a qualified medical professional and by legal counsel before launch. Where clinical workflows are involved, the platform is designed so a qualified professional reviews the information — but that design has not yet been externally validated.',
        ],
      },
    ],
  },
  {
    slug: 'consent',
    title: 'Consent and data use',
    metaDescription:
      'What you are consenting to when care begins: information sharing within the care team, family visibility, referrals, and how to withdraw consent.',
    updatedAt: '2026-04-01',
    summary:
      'What consent covers, who is entitled to give it, what the care team can see, and how to change or withdraw it.',
    sections: [
      {
        heading: 'What you are consenting to',
        paragraphs: ['When care begins, consent covers three things and no more:'],
        list: [
          'That we may collect and hold the information described in our privacy notice in order to plan, deliver and document care.',
          'That the members of the care team involved in this senior\'s care — the assigned caregiver, the supervising nurse, and operations staff who schedule and bill — may see the information relevant to their role.',
          'That we may contact the senior and the nominated family members about the care, including visit updates, reminders, incidents and billing.',
        ],
      },
      {
        heading: 'Who can give consent',
        paragraphs: [
          'Wherever the senior has capacity to consent, the senior consents, and we record that. Where a family member consents on a senior\'s behalf, we record who they are, their relationship, and the date — and we will ask about their legal entitlement to do so.',
          'Capacity is not assumed to be absent because someone is old, or because a family member says so. Where capacity is genuinely in question, that assessment belongs to a qualified professional, and the arrangement should reflect it. This wording is pending legal review, including on guardianship and powers of attorney under Indian law.',
        ],
      },
      {
        heading: 'Family visibility is a setting, not an assumption',
        paragraphs: [
          'More than one family member can be linked to a senior. For each link we record whether that person is the primary contact, whether they are the payer, and whether they may see clinical detail.',
          'A senior may reasonably want a relative to handle payments without seeing their medical record. The platform supports that, and we will ask rather than assume.',
        ],
      },
      {
        heading: 'Referrals',
        paragraphs: [
          'Where a hospital, doctor or other partner refers a patient to us, we require the partner to confirm that the patient or their family agreed to the referral before any details are sent. A referral partner can see the status of the referrals they made — submitted, contacted, assessment, converted or declined — and never the patient\'s care record.',
        ],
      },
      {
        heading: 'What we will never do with it',
        paragraphs: [],
        list: [
          'Sell personal or health information.',
          'Use health information for advertising or marketing profiling.',
          'Use identifiable care records to train machine-learning models.',
          'Share a care record with a referral partner, a landlord, an employer, or an insurer without explicit, specific consent.',
          'Publish a review, quote or rating without the author\'s permission.',
        ],
      },
      {
        heading: 'Changing or withdrawing consent',
        paragraphs: [
          'You can change visibility settings at any time in the platform, and you can withdraw consent by writing to GRIEVANCE_OFFICER_EMAIL.',
          'We will tell you honestly what withdrawal means. Some care cannot be delivered safely without recording it — a caregiver who cannot record what happened cannot be supervised — so in some cases withdrawing consent means ending the service rather than continuing it undocumented.',
          'Records we are required to keep for legal, tax or medical record-keeping reasons are retained for the periods in our privacy notice even after service ends.',
        ],
      },
    ],
  },
];

export function findLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);
}
