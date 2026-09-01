import type { Metadata } from 'next';
import { Card, CardHeader, PageHeader } from '@/components/ui';
import { AddSeniorForm } from '@/components/family/add-senior-form';
import { requirePageUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Add a senior',
  robots: { index: false, follow: false },
};

export default async function AddSeniorPage() {
  await requirePageUser(['FAMILY']);

  const areas = await prisma.serviceArea.findMany({
    orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
    select: { id: true, name: true, isActive: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add the person you are arranging care for"
        description="Enough for us to prepare. The assessment fills in the rest."
        breadcrumb={[{ href: '/app/family', label: 'Dashboard' }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <AddSeniorForm areas={areas} />

        <div className="space-y-4">
          <Card>
            <CardHeader title="Why we ask for this" />
            <div className="px-5 py-4 text-sm leading-relaxed text-ink-600">
              <p>
                Mobility and living arrangement decide what kind of support is realistic, and the
                area decides whether we can serve you at all. We would rather find that out now
                than after you have made plans.
              </p>
              <p className="mt-3">
                You do not need to enter medical history here. A nurse records that properly at the
                assessment, from the actual papers.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="About consent" />
            <div className="px-5 py-4 text-sm leading-relaxed text-ink-600">
              <p>
                We record that you added this person and when. Where the senior can consent for
                themselves, we ask them directly at the assessment and record that too.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
