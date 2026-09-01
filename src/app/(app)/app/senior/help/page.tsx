import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Phone } from 'lucide-react';
import { Card } from '@/components/ui';
import { SeniorHelpRequest } from '@/components/senior/help-request';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'I need help',
  robots: { index: false, follow: false },
};

/**
 * The senior's help route.
 *
 * The emergency instruction comes first and is the largest thing on the page, because the
 * failure mode this page must avoid is a senior tapping a "request help" button and then
 * waiting while something medical is happening. Everything below it is for the
 * non-emergency case.
 */
export default async function SeniorHelpPage() {
  const user = await requirePageUser(['SENIOR']);

  const senior = await prisma.senior.findUnique({
    where: { id: user.seniorId ?? '' },
    select: {
      id: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      supervisingNurse: { select: { user: { select: { name: true, phone: true } } } },
      familyLinks: {
        where: { isPrimaryContact: true },
        select: { familyProfile: { select: { user: { select: { name: true, phone: true } } } } },
      },
    },
  });

  const familyContact = senior?.familyLinks[0]?.familyProfile.user;
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/app/senior"
        className="tap-target inline-flex items-center gap-2 text-lg font-semibold text-brand-800 hover:underline"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Back
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-ink-900">I need help</h1>

      {/* First, largest, and unambiguous. */}
      <Card className="mt-6 border-[#f3c2bd] bg-[#fdf3f2]">
        <div className="px-6 py-7">
          <p className="text-2xl font-semibold text-[#95190f]">If you feel unwell now</p>
          <p className="mt-3 text-xl leading-relaxed text-[#95190f]">
            Call for medical help, or ask somebody near you to call. Do not wait for us.
          </p>
          <a
            href="tel:112"
            className="mt-5 flex min-h-[4rem] items-center justify-center gap-3 rounded-card bg-danger px-6 text-2xl font-semibold text-white hover:brightness-110"
          >
            <Phone className="h-7 w-7" aria-hidden="true" />
            Call for medical help
          </a>
        </div>
      </Card>

      <h2 className="mt-8 text-2xl font-semibold text-ink-900">People you can call</h2>
      <div className="mt-4 space-y-4">
        {senior?.supervisingNurse?.user.phone ? (
          <a
            href={`tel:${senior.supervisingNurse.user.phone}`}
            className="flex min-h-[5rem] items-center justify-between gap-4 rounded-card border-2 border-ink-300 bg-white px-6 py-5 hover:border-brand-400"
          >
            <span>
              <span className="block text-xl font-semibold text-ink-900">
                {senior.supervisingNurse.user.name}
              </span>
              <span className="block text-lg text-ink-600">Your nurse</span>
            </span>
            <Phone className="h-7 w-7 shrink-0 text-brand-700" aria-hidden="true" />
          </a>
        ) : null}

        {familyContact?.phone ? (
          <a
            href={`tel:${familyContact.phone}`}
            className="flex min-h-[5rem] items-center justify-between gap-4 rounded-card border-2 border-ink-300 bg-white px-6 py-5 hover:border-brand-400"
          >
            <span>
              <span className="block text-xl font-semibold text-ink-900">
                {familyContact.name}
              </span>
              <span className="block text-lg text-ink-600">Your family</span>
            </span>
            <Phone className="h-7 w-7 shrink-0 text-brand-700" aria-hidden="true" />
          </a>
        ) : null}

        {supportPhone ? (
          <a
            href={`tel:${supportPhone.replace(/\s/g, '')}`}
            className="flex min-h-[5rem] items-center justify-between gap-4 rounded-card border-2 border-ink-300 bg-white px-6 py-5 hover:border-brand-400"
          >
            <span>
              <span className="block text-xl font-semibold text-ink-900">Our office</span>
              <span className="block text-lg text-ink-600">9am to 8pm, every day</span>
            </span>
            <Phone className="h-7 w-7 shrink-0 text-brand-700" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      <h2 className="mt-8 text-2xl font-semibold text-ink-900">Or ask us to call you</h2>
      <p className="mt-2 text-lg text-ink-600">
        Tell us what you need and somebody will telephone you.
      </p>
      <SeniorHelpRequest seniorId={senior?.id ?? ''} />
    </div>
  );
}
