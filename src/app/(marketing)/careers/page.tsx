import type { Metadata } from 'next';
import { Card, SectionHeading } from '@/components/ui';
import { SectionShell } from '@/components/marketing/sections';
import { ContactForm } from '@/components/marketing/contact-form';

export const metadata: Metadata = {
  title: 'Work with us — caregiver and nurse roles in Mumbai',
  description:
    'Caregiver, nurse supervisor and care coordinator roles at Medcare in Mumbai. What we ask, what we offer, and how the verification process works.',
  alternates: { canonical: '/careers' },
};

export default function CareersPage() {
  return (
    <>
      <SectionShell>
        <SectionHeading
          eyebrow="Work with us"
          title="We are hiring caregivers, nurses and coordinators in Mumbai"
          description="Elder care is skilled work that is usually treated as unskilled. We are trying to run it the other way round."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Caregiver / attendant',
              body: 'Non-medical support in a senior’s home: mobility, meals, hygiene, companionship and medication reminders. You work with a written care plan and a nurse who supervises you — you are not left to work it out alone.',
              asks: [
                'Photo ID, address proof and police verification',
                'Comfortable working in one of the areas we serve',
                'Marathi, Hindi or Gujarati alongside basic English',
                'Patience with older adults, and the judgement to escalate rather than improvise',
              ],
            },
            {
              title: 'Nurse supervisor',
              body: 'Own the care plans for a caseload of patients: assess, write and review plans, read caregiver notes, review recorded observations, and decide what needs escalating.',
              asks: [
                'GNM or B.Sc Nursing with valid registration',
                'Experience with older adults, ideally post-discharge care',
                'Willingness to travel across an area for home visits',
                'Confidence to overrule a plan that is not working',
              ],
            },
            {
              title: 'Care coordinator',
              body: 'Own the operational side for a set of families: scheduling, attendance, replacement cover, appointments, and being the person a family actually reaches.',
              asks: [
                'Strong organisation and follow-through',
                'Good spoken English plus Marathi or Hindi',
                'Comfortable telling a family bad news early',
                'Prior healthcare or service-operations experience helps',
              ],
            },
          ].map((role) => (
            <Card key={role.title} className="p-5">
              <h2 className="font-semibold text-ink-900">{role.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{role.body}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-500">
                What we ask for
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
                {role.asks.map((ask) => (
                  <li key={ask} className="flex gap-2">
                    <span className="text-brand-700" aria-hidden="true">
                      ✓
                    </span>
                    {ask}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell tone="surface">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink-900">What we offer</h2>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-ink-700">
              {[
                'Work in the area you live in, so you are not travelling ninety minutes each way',
                'A written care plan for every patient, so you know what is expected',
                'A nurse you can escalate to, at any point in a shift',
                'Paid internal training, with your completion recorded',
                'Leave that is actually approved and covered, rather than something you feel guilty about',
                'Pay on a fixed date, and no expectation of accepting cash from families',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-brand-700" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink-900">What we will not ask you to do</h2>
            <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-ink-700">
              {[
                'Decide or change a medication dose',
                'Give anything not on the recorded medication list',
                'Perform a clinical task you are not qualified for',
                'Lift a patient alone',
                'Interpret a symptom or a reading on your own',
                'Cover general housekeeping that is unrelated to care',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-ink-400" aria-hidden="true">
                    —
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-relaxed text-ink-600">
              If a family asks you to do any of these, the correct answer is to say no and tell your
              supervisor. You will be supported for doing that, not questioned.
            </p>
          </Card>
        </div>
      </SectionShell>

      <SectionShell>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading
              eyebrow="Applying"
              title="How the process works"
              description="Five steps, and we will tell you where you stand at each one."
            />
            <ol className="mt-8 space-y-3 text-[0.9375rem] text-ink-700">
              {[
                'Send us a message with the role you are interested in and your area.',
                'A short call to understand your experience and what you are looking for.',
                'An in-person conversation, including a practical discussion of real situations.',
                'Verification: ID, address, police verification and reference checks. We will tell you the status at each stage.',
                'Internal training, then supervised early placements before you work independently.',
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="font-semibold text-brand-700">{index + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm leading-relaxed text-ink-600">
              We do not charge candidates a fee at any point, for anything. If someone claiming to
              represent us asks you for money, that is not us — please tell us.
            </p>
          </div>
          <ContactForm />
        </div>
      </SectionShell>
    </>
  );
}
