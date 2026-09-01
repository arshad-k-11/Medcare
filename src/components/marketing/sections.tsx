import Link from 'next/link';
import {
  Activity,
  BadgeCheck,
  CalendarCheck,
  ClipboardList,
  Clock,
  FileText,
  HeartHandshake,
  MessageSquare,
  Pill,
  RefreshCcw,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { Badge, ButtonLink, Card, SectionHeading, StatusPill } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { readList } from '@/lib/json-list';

/** Reusable marketing building blocks, so pages compose rather than repeat markup. */

export function SectionShell({
  id,
  children,
  tone = 'default',
  className,
}: {
  id?: string;
  children: React.ReactNode;
  tone?: 'default' | 'surface' | 'sand' | 'deep';
  className?: string;
}) {
  const tones = {
    default: '',
    surface: 'bg-white',
    sand: 'bg-sand-100/70',
    deep: 'bg-brand-950 text-brand-50',
  };
  return (
    <section id={id} className={`section ${tones[tone]} ${className ?? ''}`}>
      <div className="container-page">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Package card
// ---------------------------------------------------------------------------

export type PackageCardData = {
  slug: string;
  name: string;
  tagline: string;
  durationLabel: string;
  billingCycle: string;
  priceFromPaise: number;
  isComingSoon: boolean;
  isFeatured: boolean;
  outcomes: string;
};

export function PackageCard({ pkg, compact }: { pkg: PackageCardData; compact?: boolean }) {
  const outcomes = readList(pkg.outcomes).slice(0, compact ? 3 : 4);
  return (
    <Card
      as="article"
      className={`flex flex-col ${pkg.isFeatured ? 'ring-1 ring-brand-200' : ''}`}
    >
      <div className="flex-1 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {pkg.isComingSoon ? (
            <Badge tone="warning">Coming soon</Badge>
          ) : pkg.isFeatured ? (
            <Badge tone="brand">Most requested</Badge>
          ) : null}
          <Badge tone="neutral">{pkg.durationLabel}</Badge>
        </div>

        <h3 className="mt-3 text-lg font-semibold text-ink-900">{pkg.name}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{pkg.tagline}</p>

        <ul className="mt-4 space-y-2 text-sm text-ink-700">
          {outcomes.map((outcome) => (
            <li key={outcome} className="flex gap-2">
              <span className="mt-0.5 text-brand-700" aria-hidden="true">
                ✓
              </span>
              <span>{outcome}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-[color:var(--border)] px-5 py-4">
        <PriceFrom
          priceFromPaise={pkg.priceFromPaise}
          billingCycle={pkg.billingCycle}
          isComingSoon={pkg.isComingSoon}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href={`/care-packages/${pkg.slug}`} variant="outline" size="sm">
            See what is included
          </ButtonLink>
          {!pkg.isComingSoon ? (
            <ButtonLink href={`/get-assessment?package=${pkg.slug}`} size="sm">
              Start with an assessment
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/**
 * Prices are only ever shown as "starting from". A zero price means the business has not
 * set one, and the honest answer is to talk — not to invent a figure.
 */
export function PriceFrom({
  priceFromPaise,
  billingCycle,
  isComingSoon,
  size = 'md',
}: {
  priceFromPaise: number;
  billingCycle: string;
  isComingSoon?: boolean;
  size?: 'md' | 'lg';
}) {
  if (isComingSoon) {
    return (
      <p className="text-sm font-medium text-ink-600">
        Not open for enrolment yet — tell us if you need it and we will be honest about timing.
      </p>
    );
  }
  if (!priceFromPaise) {
    return (
      <p className="text-sm font-medium text-ink-700">
        Talk to us for a personalised care plan and price.
      </p>
    );
  }
  return (
    <p className={size === 'lg' ? 'text-2xl' : 'text-lg'}>
      <span className="text-sm font-normal text-ink-500">Starting from </span>
      <span className="font-semibold tabular-nums text-ink-900">{formatMoney(priceFromPaise)}</span>
      <span className="text-sm font-normal text-ink-500">
        {billingCycle === 'MONTHLY' ? ' / month' : ' one time'}
      </span>
    </p>
  );
}

// ---------------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------------

const STEPS = [
  {
    title: 'Tell us what is happening',
    body: 'Answer a few questions about your parent and the situation. It takes about three minutes, and you can stop at any point.',
    icon: ClipboardList,
  },
  {
    title: 'Free assessment at home',
    body: 'A nurse or care coordinator visits, reviews discharge papers and medication, and looks at the home itself — not just what was said on the phone.',
    icon: Stethoscope,
  },
  {
    title: 'A written care plan',
    body: 'You get a plan with goals, a schedule, and a clear list of what is and is not included. Nothing is committed until you agree to it.',
    icon: FileText,
  },
  {
    title: 'A named caregiver starts',
    body: 'We assign a caregiver who already works in your area, and tell you who they are before they arrive.',
    icon: UserCheck,
  },
  {
    title: 'You see what happened',
    body: 'Every visit, task, reminder and reading appears in your dashboard the same day. A nurse reviews the notes and updates the plan.',
    icon: Activity,
  },
];

export function HowItWorks({ heading = true }: { heading?: boolean }) {
  return (
    <>
      {heading ? (
        <SectionHeading
          eyebrow="How it works"
          title="Five steps, and you are not committed until step three"
          description="Most families come to us in the middle of something stressful. The process is built so that the first useful thing happens before you have to decide anything."
        />
      ) : null}
      <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, index) => (
          <Card as="li" key={step.title} className="p-5">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-50 text-brand-700"
                aria-hidden="true"
              >
                <step.icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Step {index + 1}
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-ink-900">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
          </Card>
        ))}
      </ol>
    </>
  );
}

// ---------------------------------------------------------------------------
// Why families need support
// ---------------------------------------------------------------------------

const PRESSURES = [
  {
    title: 'The fortnight after discharge',
    body: 'Discharge papers, six new medicines, a follow-up appointment nobody booked, and a parent who cannot get to the bathroom alone. This is where things go wrong quietly.',
  },
  {
    title: 'Working children, ageing parents',
    body: 'You can take a day off. You cannot take three months off. Support that runs on a schedule is different from support that runs on your guilt.',
  },
  {
    title: 'Distance',
    body: 'From another city or another country, the hardest part is not paying for care — it is knowing whether it actually happened today.',
  },
  {
    title: 'Attendants who disappear',
    body: 'An attendant who stops coming on a Tuesday is not a small problem. Cover has to be somebody else’s job, not yours.',
  },
];

export function WhyFamiliesNeedSupport() {
  return (
    <>
      <SectionHeading
        eyebrow="Why families come to us"
        title="Support when your family cannot be there every day"
        description="Not because anyone is failing. Because the situations below need a system, and families are trying to hold them together with phone calls."
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {PRESSURES.map((item) => (
          <Card key={item.title} className="p-5">
            <h3 className="font-semibold text-ink-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
          </Card>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Who we help
// ---------------------------------------------------------------------------

const AUDIENCES = [
  { title: 'Seniors living alone', body: 'Regular visits, a caregiver they recognise, and someone who notices when something changes.' },
  { title: 'Seniors with one to three ongoing conditions', body: 'Medication routines, readings recorded for a nurse to review, appointments that actually get attended.' },
  { title: 'Families where the children work full time', body: 'A schedule that runs without you having to manage it, and a written record of what happened.' },
  { title: 'NRI and out-of-city children', body: 'One named coordinator, fixed visit days, and updates readable in your timezone.' },
  { title: 'Patients just home from hospital', body: 'The first fortnight handled properly: plan, caregiver, reminders, nurse reviews, family reporting.' },
];

export function WhoWeHelp() {
  return (
    <>
      <SectionHeading
        eyebrow="Who we help"
        title="Built for a few specific situations, done properly"
        description="We would rather do five things well in ten areas of Mumbai than everything badly across the city."
      />
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AUDIENCES.map((item) => (
          <Card key={item.title} className="p-5">
            <HeartHandshake className="h-5 w-5 text-brand-700" aria-hidden="true" />
            <h3 className="mt-3 font-semibold text-ink-900">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{item.body}</p>
          </Card>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Trust
// ---------------------------------------------------------------------------

const TRUST_POINTS = [
  {
    title: 'Staff verification, stated honestly',
    body: 'We check identity, address and police verification before a caregiver is deployed. Where a check is still in progress, our own system says so — we never describe a caregiver as verified until they are.',
    icon: BadgeCheck,
  },
  {
    title: 'A nurse supervises the care',
    body: 'Caregiver notes and recorded readings are reviewed by a qualified nurse who can change the plan or escalate. Care is not left to the person who happens to be in the room.',
    icon: Stethoscope,
  },
  {
    title: 'Structured, written care plans',
    body: 'Goals, schedule, tasks, preferences and escalation route, in writing, versioned. When the plan changes you can see what changed and why.',
    icon: ClipboardList,
  },
  {
    title: 'Replacement is our job, not yours',
    body: 'If a caregiver becomes unavailable, our system ranks who can cover on proximity, availability, skills, language and shift, and we tell you who is coming and why.',
    icon: RefreshCcw,
  },
  {
    title: 'You see what happened, the same day',
    body: 'Arrival, tasks, reminders, readings, notes and any incident, in one timeline. Not a weekly phone call where you have to ask the right question.',
    icon: MessageSquare,
  },
  {
    title: 'Transparent pricing and scope',
    body: 'Every plan lists what is included and what is not. You get an estimate before the assessment and a fixed plan after it.',
    icon: FileText,
  },
  {
    title: 'Incidents are escalated, recorded and closed',
    body: 'Caregiver to nurse to family, with a defined response time, an audit trail, and factual wording — never a diagnosis.',
    icon: Clock,
  },
  {
    title: 'Documentation you can take to a doctor',
    body: 'Readings, notes and visit history export into something a treating doctor can actually read at a follow-up appointment.',
    icon: Pill,
  },
];

export function TrustGrid({ limit }: { limit?: number }) {
  const points = limit ? TRUST_POINTS.slice(0, limit) : TRUST_POINTS;
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      {points.map((point) => (
        <Card key={point.title} className="p-5">
          <div className="flex gap-4">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-brand-700"
              aria-hidden="true"
            >
              <point.icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-ink-900">{point.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{point.body}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Family dashboard preview — a static, honest representation of the real UI
// ---------------------------------------------------------------------------

export function DashboardPreview() {
  return (
    <div className="mt-10 grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <h3 className="text-xl font-semibold text-ink-900">
          The answer to “what happened today?”, without making a phone call
        </h3>
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-600">
          Every family gets a dashboard showing who is providing care, what was done today, what is
          scheduled next, and who to contact. For families abroad this is the product — the
          caregiving happens in Mumbai, but the reassurance has to travel.
        </p>
        <ul className="mt-6 space-y-3 text-sm text-ink-700">
          {[
            'Today’s status: arrival, tasks completed, reminders confirmed',
            'A care timeline you can scroll back through',
            'Readings with the review range shown, and anything flagged for a nurse',
            'Appointments, documents, invoices and messages in one place',
            'Quick actions: call the coordinator, request support, book a visit',
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-0.5 text-brand-700" aria-hidden="true">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-7">
          <ButtonLink href="/get-assessment" size="lg">
            See it with your own care plan
          </ButtonLink>
        </div>
      </div>

      {/* A representative mock-up. Names are demo data, labelled as such. */}
      <Card className="overflow-hidden">
        <div className="border-b border-[color:var(--border)] bg-sand-50 px-5 py-3">
          <p className="text-xs font-medium text-ink-500">
            Example dashboard · illustrative demo data
          </p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-ink-900">Anil D., 73 · Andheri West</p>
              <p className="text-sm text-ink-500">
                Post-discharge recovery plan · Day 10 of 14
              </p>
            </div>
            <StatusPill tone="success" label="Care active" />
          </div>

          <div className="mt-5 rounded-card border border-[color:var(--border)] bg-sand-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Care today</p>
            <ul className="mt-3 space-y-2 text-sm">
              <TimelineRow time="08:12" label="Caregiver Sunita arrived" done />
              <TimelineRow time="08:22" label="Morning medication reminder confirmed" done />
              <TimelineRow time="09:30" label="Breakfast support completed" done />
              <TimelineRow time="10:00" label="Blood pressure 128/78 mmHg recorded" done />
              <TimelineRow time="15:00" label="Nurse review scheduled" />
            </ul>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-card border border-[color:var(--border)] p-3">
              <p className="text-xs text-ink-500">Caregiver</p>
              <p className="mt-1 font-semibold text-ink-900">Sunita W.</p>
              <p className="text-xs text-ink-500">Marathi, Hindi, English</p>
            </div>
            <div className="rounded-card border border-[color:var(--border)] p-3">
              <p className="text-xs text-ink-500">Care coordinator</p>
              <p className="mt-1 font-semibold text-ink-900">Sister Leena F.</p>
              <p className="text-xs text-ink-500">Nurse supervisor</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800">
              Call coordinator
            </span>
            <span className="rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700">
              Request support
            </span>
            <span className="rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700">
              Upload document
            </span>
            <span className="rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700">
              View care report
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TimelineRow({ time, label, done }: { time: string; label: string; done?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold ${
          done ? 'bg-success text-white' : 'border border-ink-300 text-transparent'
        }`}
        aria-hidden="true"
      >
        ✓
      </span>
      <span className="tabular-nums text-ink-500">{time}</span>
      <span className={done ? 'text-ink-800' : 'text-ink-500'}>{label}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Supervision
// ---------------------------------------------------------------------------

export function SupervisionExplainer() {
  const chain = [
    {
      title: 'Caregiver',
      body: 'Checks in on site, works through the tasks in the care plan, records notes, reminders and any agreed readings. Raises anything unusual immediately.',
    },
    {
      title: 'Nurse supervisor',
      body: 'Reviews notes and readings, decides whether a visit or a change of plan is needed, and is the person a caregiver escalates to. Signs off every care plan version.',
    },
    {
      title: 'Operations',
      body: 'Owns scheduling, attendance, replacements and anything the family raises. A missed visit is an operations problem within 30 minutes.',
    },
    {
      title: 'Family',
      body: 'Informed according to the escalation preferences recorded in the care plan — including who to call first and in what order.',
    },
  ];
  return (
    <>
      <SectionHeading
        eyebrow="Supervision"
        title="A caregiver on their own is not a care service"
        description="What separates coordinated care from an attendant placement is who reviews the work, who covers when someone is unavailable, and who the family can hold responsible."
      />
      <ol className="mt-10 space-y-3">
        {chain.map((link, index) => (
          <Card as="li" key={link.title} className="flex gap-4 p-5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold text-ink-900">{link.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{link.body}</p>
            </div>
          </Card>
        ))}
      </ol>
      <div className="mt-6 rounded-card border border-[#f0d5aa] bg-[#fdf8ef] p-5 text-sm leading-relaxed text-[#6b3d05]">
        <strong className="font-semibold">Where the chain stops.</strong> If a situation is
        medically urgent, the caregiver is instructed to call emergency services first and record it
        afterwards. Our escalation chain never delays that, and our system never decides on its own
        that something is a medical emergency.
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export function FaqAccordion({
  items,
  className,
}: {
  items: { question: string; answer: string }[];
  className?: string;
}) {
  return (
    <div className={`mt-10 divide-y divide-[color:var(--border)] ${className ?? ''}`}>
      {items.map((item) => (
        <details key={item.question} className="group py-4">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left">
            <span className="font-semibold text-ink-900">{item.question}</span>
            <span
              className="mt-0.5 shrink-0 text-xl leading-none text-brand-700 transition-transform group-open:rotate-45"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <p className="mt-3 max-w-3xl text-[0.9375rem] leading-relaxed text-ink-600">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service areas
// ---------------------------------------------------------------------------

export function ServiceAreaList({
  areas,
}: {
  areas: { id: string; name: string; zone: string; isActive: boolean; notes: string | null }[];
}) {
  const active = areas.filter((area) => area.isActive);
  const inactive = areas.filter((area) => !area.isActive);
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="font-semibold text-ink-900">Areas we currently serve</h3>
        <p className="mt-1 text-sm text-ink-600">
          Caregivers are assigned from the area they already work in, which is why coverage is
          deliberately narrow.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {active.map((area) => (
            <li key={area.id}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800">
                <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {area.name}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-ink-900">Not yet served</h3>
        <p className="mt-1 text-sm text-ink-600">
          We would rather tell you now than take the work and let you down. Ask us anyway — we keep a
          waitlist and we will call when an area opens.
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {inactive.length ? (
            inactive.map((area) => (
              <li key={area.id} className="flex flex-col gap-1">
                <span className="font-medium text-ink-800">{area.name}</span>
                {area.notes ? <span className="text-ink-500">{area.notes}</span> : null}
              </li>
            ))
          ) : (
            <li className="text-ink-500">Every configured area is currently active.</li>
          )}
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/contact" className="font-semibold text-brand-700 hover:underline">
            Ask about your area →
          </Link>
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Journey selector
// ---------------------------------------------------------------------------

export function JourneySelector() {
  const journeys = [
    {
      href: '/for-families',
      title: 'I live in Mumbai',
      body: 'Reliable care for elderly parents, with you close by but unable to be there all day.',
    },
    {
      href: '/for-nri-families',
      title: 'I live outside Mumbai',
      body: 'Stay connected to your parents’ care, even when you are in another city or country.',
    },
    {
      href: '/for-partners',
      title: 'I am a doctor or hospital',
      body: 'Reliable post-discharge support for your elderly patients, with referral tracking.',
    },
  ];
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-3">
      {journeys.map((journey) => (
        <Link
          key={journey.href}
          href={journey.href}
          className="group rounded-card border border-[color:var(--border)] bg-white p-5 shadow-soft transition-colors hover:border-brand-400"
        >
          <h3 className="font-semibold text-ink-900 group-hover:text-brand-800">{journey.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">{journey.body}</p>
          <p className="mt-4 text-sm font-semibold text-brand-700">Read more →</p>
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// What families say — placeholder until real, consented feedback exists
// ---------------------------------------------------------------------------

/**
 * Deliberately NOT fabricated testimonials.
 *
 * The brief asked for a testimonials section; inventing quotes from customers who do not
 * exist would be the single most damaging thing this page could do to the business's
 * credibility, and it is exactly what a family checks. So the section explains the
 * measurement the business will publish instead, and the slot is ready for real,
 * consented feedback captured through the in-product feedback flow.
 */
export function TestimonialPlaceholder({
  stats,
}: {
  stats?: { averageRating: number | null; responses: number; completionRate: number | null };
}) {
  return (
    <>
      <SectionHeading
        eyebrow="What families say"
        title="We will publish real feedback, and only real feedback"
        description="This section is intentionally empty of quotes. Every rating we show will come from a family using the platform, captured in-product, with their permission — not written by us."
      />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Average family rating
          </p>
          <p className="mt-2 text-3xl font-semibold text-ink-900">
            {stats?.averageRating ? stats.averageRating.toFixed(1) : '—'}
            {stats?.averageRating ? <span className="text-lg text-ink-400"> / 5</span> : null}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {stats?.responses
              ? `From ${stats.responses} response${stats.responses === 1 ? '' : 's'} collected in the platform`
              : 'No responses collected yet'}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Visits completed as scheduled
          </p>
          <p className="mt-2 text-3xl font-semibold text-ink-900">
            {stats?.completionRate != null ? `${stats.completionRate}%` : '—'}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            Measured from actual check-in records, not self-reported
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            What we will never do
          </p>
          <ul className="mt-3 space-y-2 text-sm text-ink-600">
            <li>Write a review on a customer’s behalf</li>
            <li>Display a certification we do not hold</li>
            <li>Show a hospital’s logo without an agreement</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
