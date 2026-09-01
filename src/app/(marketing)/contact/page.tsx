import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Card, SectionHeading } from '@/components/ui';
import { EmergencyNotice } from '@/components/marketing/site-chrome';
import { SectionShell } from '@/components/marketing/sections';
import { ContactForm } from '@/components/marketing/contact-form';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Talk to a care coordinator about elder care in Mumbai. Call, email or send a message and we will reply during operating hours.',
  alternates: { canonical: '/contact' },
};

export const revalidate = 300;

export default async function ContactPage() {
  const areas = await prisma.serviceArea.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  });

  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <SectionShell>
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeading
            eyebrow="Contact"
            title="Talk to a care coordinator"
            description="If you are in the middle of a discharge or something has changed suddenly, call rather than write — we will get to you faster."
          />

          <div className="mt-8 space-y-4">
            {phone ? (
              <Card className="p-5">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  Call us
                </p>
                <a
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  className="mt-2 block text-xl font-semibold text-brand-800 hover:underline"
                >
                  {phone}
                </a>
                <p className="mt-1 text-sm text-ink-600">
                  Operating hours 9am–8pm IST, seven days a week.
                </p>
              </Card>
            ) : null}

            {email ? (
              <Card className="p-5">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  Email us
                </p>
                <a
                  href={`mailto:${email}`}
                  className="mt-2 block text-lg font-semibold text-brand-800 hover:underline"
                >
                  {email}
                </a>
                <p className="mt-1 text-sm text-ink-600">
                  We reply within one working day. For anything urgent, please call.
                </p>
              </Card>
            ) : null}

            <Card className="p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                Where we work
              </p>
              <p className="mt-2 text-sm text-ink-700">
                {areas.map((area) => area.name).join(' · ')}
              </p>
              <p className="mt-2 text-sm text-ink-600">
                Outside these areas we will tell you honestly and add you to the waitlist for your
                locality.
              </p>
            </Card>
          </div>

          <EmergencyNotice className="mt-6" />
        </div>

        <ContactForm />
      </div>
    </SectionShell>
  );
}
