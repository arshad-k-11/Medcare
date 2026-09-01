import type { Metadata } from 'next';
import { Card, SectionHeading } from '@/components/ui';
import { CtaBand } from '@/components/marketing/site-chrome';
import { SectionShell, ServiceAreaList } from '@/components/marketing/sections';
import { prisma } from '@/lib/db';
import { readList } from '@/lib/json-list';
import { titleise } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Areas we serve in Mumbai and Thane',
  description:
    'Medcare elder care currently covers specific areas of Mumbai and Thane, including Andheri, Bandra, Goregaon, Malad, Kandivali, Borivali, Powai and Thane West.',
  alternates: { canonical: '/service-areas' },
};

export const revalidate = 300;

export default async function ServiceAreasPage() {
  const areas = await prisma.serviceArea.findMany({
    orderBy: [{ isActive: 'desc' }, { zone: 'asc' }, { sortOrder: 'asc' }],
  });

  const zones = [...new Set(areas.map((area) => area.zone))];

  return (
    <>
      <SectionShell>
        <SectionHeading
          eyebrow="Coverage"
          title="Deliberately narrow, honestly stated"
          description="We assign caregivers from the area they already live and work in, because travel time is the single biggest cause of late and missed visits. That is why we do not claim to cover all of Mumbai."
        />
        <ServiceAreaList areas={areas} />
      </SectionShell>

      <SectionShell tone="surface">
        <SectionHeading
          title="Areas by zone"
          description="Pincodes are listed so you can check your own before calling."
        />
        <div className="mt-10 space-y-6">
          {zones.map((zone) => {
            const zoneAreas = areas.filter((area) => area.zone === zone);
            return (
              <Card key={zone} className="p-6">
                <h2 className="text-lg font-semibold text-ink-900">{titleise(zone)}</h2>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {zoneAreas.map((area) => {
                    const pincodes = readList(area.pincodes);
                    return (
                      <li
                        key={area.id}
                        className="rounded-card border border-[color:var(--border)] p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-ink-900">{area.name}</p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              area.isActive
                                ? 'bg-[#e8f5ee] text-[#0d6340]'
                                : 'bg-ink-100 text-ink-600'
                            }`}
                          >
                            {area.isActive ? 'Serving' : 'Not yet'}
                          </span>
                        </div>
                        {pincodes.length ? (
                          <p className="mt-2 text-xs tabular-nums text-ink-500">
                            {pincodes.join(' · ')}
                          </p>
                        ) : null}
                        {area.notes ? (
                          <p className="mt-2 text-sm text-ink-600">{area.notes}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell tone="sand">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink-900">Why we will not stretch</h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-600">
              Taking a patient in an area we do not staff means one of two things: a caregiver
              travelling ninety minutes each way, who will eventually be late and then stop coming, or
              a caregiver we have not worked with, whose verification we cannot vouch for. Both end
              with a family let down at the worst possible moment.
            </p>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-600">
              So we say no, add you to a waitlist, and call when an area opens properly.
            </p>
          </Card>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink-900">How a new area opens</h2>
            <ol className="mt-3 space-y-2.5 text-[0.9375rem] text-ink-700">
              {[
                'Enough waitlisted demand in one locality to keep caregivers busy without long travel',
                'Caregivers recruited and verified who actually live there',
                'A nurse with capacity to supervise the caseload',
                'Then, and only then, we start taking patients',
              ].map((item, index) => (
                <li key={item} className="flex gap-2">
                  <span className="font-semibold text-brand-700">{index + 1}.</span>
                  {item}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </SectionShell>

      <CtaBand
        title="Not sure whether we cover your area?"
        description="Start the assessment and we will tell you on the call. If we cannot serve you yet, we will say so and add you to the waitlist for your locality."
      />
    </>
  );
}
