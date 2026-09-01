import type { Metadata } from 'next';
import { Alert, Card, SectionHeading } from '@/components/ui';
import { CtaBand } from '@/components/marketing/site-chrome';
import { SectionShell } from '@/components/marketing/sections';

export const metadata: Metadata = {
  title: 'About us',
  description:
    'Why Medcare exists, what we believe about elder care, and what we are honest about not being yet.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <SectionShell>
        <SectionHeading
          eyebrow="About us"
          title="An elder-care coordination platform, not a caregiver agency"
          description="The difference matters. An agency sends you a person. We take responsibility for the plan, the supervision, the cover when someone is unavailable, and the record of what actually happened."
        />

        <div className="prose-care mt-10">
          <p>
            Most families in Mumbai arrange elder care the same way: a phone number passed on by a
            neighbour, an attendant who arrives, and a hope that things hold together. It works until
            it does not — the attendant stops coming, nobody wrote down which medicines changed at
            discharge, the follow-up appointment never happened, and a family that was managing is
            suddenly in a hospital corridor again.
          </p>
          <p>
            We started with the boring part rather than the emotional part: what a care plan should
            contain, who reviews the caregiver's notes, how quickly a missed visit becomes somebody's
            problem, and how a daughter in Toronto finds out what happened on a Tuesday morning in
            Powai. Those are operational questions, and answering them properly is what separates
            coordinated care from an introduction service.
          </p>
        </div>
      </SectionShell>

      <SectionShell tone="surface">
        <SectionHeading eyebrow="What we believe" title="Five things that shape how we work" />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            {
              title: 'Sell outcomes, not hours',
              body: 'Charging by the hour rewards presence, not results. Our plans state what should be true at the end — no readmission, medication taken correctly, walking to the lobby unaided — and we are accountable to that.',
            },
            {
              title: 'The payer and the patient are different people',
              body: 'An adult child decides and pays; a senior receives the care. The product is built around that from the database up, rather than pretending there is one user.',
            },
            {
              title: 'Reliability is a system, not an intention',
              body: 'Everyone intends to turn up. What matters is who covers when they cannot, how quickly, and whether the family had to chase it.',
            },
            {
              title: 'Stay inside our competence',
              body: 'We do non-medical support, nursing visits and coordination. We do not diagnose, prescribe or provide emergency response, and we route anything clinical back to the treating doctor.',
            },
            {
              title: 'Narrow and good beats wide and thin',
              body: 'Ten areas served properly, with caregivers who live there, rather than a citywide promise we cannot staff.',
            },
            {
              title: 'Say the uncomfortable thing early',
              body: 'That we do not cover your area. That you need less than you asked for. That a verification is still in progress. Families forgive limitations; they do not forgive discovering one at the wrong moment.',
            },
          ].map((item) => (
            <Card key={item.title} className="p-5">
              <h3 className="font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
            </Card>
          ))}
        </div>
      </SectionShell>

      <SectionShell>
        <SectionHeading
          eyebrow="Where we are"
          title="What we are honest about not being yet"
          description="A page like this usually lists achievements. Ours lists the gaps, because a family or a hospital deciding whether to trust us should know them."
        />
        <div className="mt-8 max-w-3xl space-y-4">
          <Alert tone="info" title="We are early">
            <p>
              We serve a specific set of areas in Mumbai and Thane with a small team. Our dementia and
              companion plan is not open for enrolment yet, because we will not run it until the
              caregiver training is complete and we can staff it consistently in a given area.
            </p>
          </Alert>
          <Alert tone="info" title="We hold no external certifications">
            <p>
              We do not display accreditation badges, hospital logos or partnership marks, because we
              have not earned them. Where we work with a hospital or clinic, that will be stated only
              once there is an agreement in place and the partner has agreed to be named.
            </p>
          </Alert>
          <Alert tone="info" title="Our published feedback will be real or absent">
            <p>
              We will publish family ratings collected in the product, with permission, and nothing
              else. Until there are enough of them to be meaningful, the number stays empty rather
              than being filled with something we wrote.
            </p>
          </Alert>
          <Alert tone="info" title="Legal and clinical wording is under review">
            <p>
              Our consent, privacy and medical-disclaimer wording is drafted and pending professional
              legal and clinical review before launch. Treat it as a serious draft, not a
              signed-off compliance position.
            </p>
          </Alert>
        </div>
      </SectionShell>

      <CtaBand
        title="Judge us on the specifics"
        description="Book the free assessment and ask the hard questions. If the answers are vague, you should not hire us."
      />
    </>
  );
}
