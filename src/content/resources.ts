/**
 * SEO content hub.
 *
 * These are the ten search intents the business needs to rank for. Each article is written
 * to be genuinely useful to a family in that situation, because a thin keyword page ranks
 * badly and — more importantly — a family reading it at 11pm deserves something real.
 *
 * Rules held throughout: no clinical advice, no diagnosis, no invented statistics, and no
 * fear-based framing. Where something needs a doctor, the article says so.
 */

export type ResourceArticle = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  intent: string;
  readingMinutes: number;
  updatedAt: string;
  intro: string[];
  sections: { heading: string; paragraphs: string[]; list?: string[] }[];
  relatedPackages: string[];
};

export const RESOURCE_ARTICLES: ResourceArticle[] = [
  {
    slug: 'elder-care-in-mumbai',
    title: 'Elder care in Mumbai: how to arrange it without getting it wrong',
    metaTitle: 'Elder care in Mumbai — a practical guide for families',
    metaDescription:
      'How elder care actually works in Mumbai: the options, what each costs roughly, what to check before hiring, and the questions that separate a real service from an introduction agency.',
    intent: 'elder care in Mumbai',
    readingMinutes: 8,
    updatedAt: '2026-01-15',
    intro: [
      'Most families in Mumbai arrange elder care in a hurry, usually in the two days around a hospital discharge, from a phone number somebody passed on. It works often enough that nobody questions the method — until the attendant stops coming, or nobody can say which medicines changed at discharge.',
      'This guide sets out the options honestly, including the ones that do not involve paying us.',
    ],
    sections: [
      {
        heading: 'The four things people mean by "elder care"',
        paragraphs: [
          'These get confused constantly, and the confusion is where families overpay or under-buy.',
        ],
        list: [
          'Attendant or caregiver support — non-medical help with mobility, meals, hygiene, companionship and medication reminders. This is what most families actually need most of the time.',
          'Nursing services — a qualified nurse for clinical tasks, wound care, and reviewing whether a care plan is working. Needed periodically, rarely full time.',
          'Care coordination — somebody who owns the schedule, the appointments, the caregiver cover and the reporting. Invisible until it is missing, and then it is the whole problem.',
          'Medical care — doctors, hospitals, emergency services. No home-care service replaces this, and any that implies it should be avoided.',
        ],
      },
      {
        heading: 'What it roughly costs in Mumbai',
        paragraphs: [
          'Rates vary by area, shift and skill. As a rough frame, hourly attendant support in the western suburbs sits in the low hundreds of rupees per hour, a twelve-hour shift runs into the low thousands, and a nurse visit costs more than an attendant shift because it is a different qualification.',
          'Be suspicious of a firm price quoted before anybody has seen the situation. The honest answer depends on how your parent actually moves, how complex the medication is, and how much the family can genuinely cover — none of which is knowable over the phone.',
        ],
      },
      {
        heading: 'What to check before you hire anyone',
        paragraphs: [
          'Ask these five questions of any provider, including us. The answers should be specific.',
        ],
        list: [
          'What verification have you completed on the person who will come to my home, and can you tell me its current status?',
          'Who reviews the caregiver\'s work, and what is their qualification?',
          'What happens, specifically, if the caregiver does not turn up on a Tuesday morning?',
          'What will I be able to see about what happened each day, and how?',
          'What is not included in this price?',
        ],
      },
      {
        heading: 'The mistake families make most often',
        paragraphs: [
          'Buying too much, too early. A full-time attendant for a parent who needs four hours of morning support and a safety review is a common and expensive misfire — and it can make a senior more dependent than they need to be.',
          'A good assessment should sometimes conclude that you need less than you asked for. If nobody ever tells you that, they are selling hours rather than outcomes.',
        ],
      },
    ],
    relatedPackages: ['monthly-chronic-care-support', 'fall-prevention-home-safety'],
  },
  {
    slug: 'home-care-for-elderly-parents',
    title: 'Home care for elderly parents: setting it up so it actually holds',
    metaTitle: 'Home care for elderly parents — a setup guide',
    metaDescription:
      'How to set up home care for elderly parents so it survives the first month: the plan, the routine, the medication record, and how to handle a parent who resists help.',
    intent: 'home care for elderly parents',
    readingMinutes: 7,
    updatedAt: '2026-01-20',
    intro: [
      'Arranging home care is not the hard part. Keeping it working past week three is the hard part — when the novelty has gone, your parent has decided they do not need it, and the caregiver has had their first day off.',
      'What follows is what makes the difference between care that holds and care that quietly dissolves.',
    ],
    sections: [
      {
        heading: 'Write down what "working" means',
        paragraphs: [
          'Three specific goals, in plain language, agreed with your parent where possible. "Walks to the building gate unaided", "takes the evening tablet without a reminder from me", "has one conversation a day with somebody who is not family".',
          'Vague goals cannot be reviewed, and a plan that cannot be reviewed will drift into whatever the caregiver happens to do.',
        ],
      },
      {
        heading: 'Fix the routine before you add hours',
        paragraphs: [
          'Older adults, and especially anyone with memory difficulty, respond far more to consistency than to quantity. The same caregiver at the same time doing things in the same order beats more hours from a rotating group, almost every time.',
          'If you can only get one thing right, get consistency right.',
        ],
      },
      {
        heading: 'Build one accurate medication record',
        paragraphs: [
          'Take the current prescription, write out every medicine, dose and time, and make that the single source everyone works from — family, caregiver and nurse. Update it only from a doctor\'s instruction, never from a phone conversation or a remembered change.',
          'A caregiver should remind and record. A caregiver should never change a dose or give something that is not on the list, and any service that permits this is a risk you should not accept.',
        ],
      },
      {
        heading: 'When your parent refuses help',
        paragraphs: [
          'This is normal and it is usually about dignity, not about the caregiver. Some things that help: introduce the caregiver as help for the household rather than for them; start with tasks that are not personal, like meals and company, before hygiene; give your parent authority over the schedule where you can.',
          'A refusal should be recorded and passed to whoever supervises the care, not pushed through. Pushing costs you the relationship, and the relationship is what makes the care work.',
        ],
      },
      {
        heading: 'Agree the escalation order in advance',
        paragraphs: [
          'Who does the caregiver call first, and if that person does not answer within fifteen minutes, who next? Which hospital would you prefer? Who has a spare key?',
          'Decide this on a calm afternoon. Nobody makes good decisions about it at 2am.',
        ],
      },
    ],
    relatedPackages: ['monthly-chronic-care-support', 'companion-dementia-support'],
  },
  {
    slug: 'post-hospital-elderly-care',
    title: 'Post-hospital care for elderly patients: the first fourteen days',
    metaTitle: 'Post-hospital elderly care — what the first two weeks need',
    metaDescription:
      'What elderly patients need in the fortnight after hospital discharge, why readmissions happen, and a practical checklist for the day you bring a parent home.',
    intent: 'post-hospital elderly care',
    readingMinutes: 9,
    updatedAt: '2026-02-02',
    intro: [
      'The fortnight after a discharge is the highest-risk period in an older adult\'s year, and it is almost always the least organised. The hospital hands over a summary, a family signs, and everybody goes home to work it out.',
      'This is a practical guide to that fortnight. It is not medical advice — the treating doctor decides the clinical plan — but the coordination around it is entirely in your control.',
    ],
    sections: [
      {
        heading: 'Why things go wrong in this window',
        paragraphs: [
          'Not usually because of the original condition. Usually because of the ordinary things: a medicine that changed and nobody noticed, a fall on the way to the bathroom at night, a follow-up appointment that never got booked, or eating and drinking too little because the person who normally cooks is exhausted.',
          'Every one of those is preventable with attention rather than expertise.',
        ],
      },
      {
        heading: 'Before you leave the hospital',
        paragraphs: ['Get these five things in writing, and do not leave without them.'],
        list: [
          'The discharge summary, and a readable list of every medicine with dose and timing — specifically what changed from before admission.',
          'What to watch for, and what would justify coming back.',
          'The follow-up appointment: date, department, and who books it.',
          'Any mobility restriction — weight bearing, stairs, how transfers should be done.',
          'Whether any wound or dressing needs attention, and by whom.',
        ],
      },
      {
        heading: 'The first 48 hours at home',
        paragraphs: [
          'Two priorities: prevent a fall, and get the medication routine right from day one rather than fixing it on day five.',
          'Walk the route your parent will use at night, in the dark, yourself. Move anything on the floor. Check the bathroom. If there is no grab support and your parent is unsteady, that is the highest-value thing you can arrange this week.',
        ],
      },
      {
        heading: 'Week one and week two',
        paragraphs: [
          'Establish a repeatable day: the same wake time, the same medication times, the same short walk. Record what happens, even briefly — if a doctor asks at the follow-up whether the pain is improving, "3 out of 10, down from 6" is worth far more than "he says he is better".',
          'If readings such as blood pressure or glucose are being tracked, record them at consistent times and take the log to the appointment. Do not try to interpret them yourself, and be wary of any service that interprets them for you without a clinician involved.',
        ],
      },
      {
        heading: 'The day-14 decision',
        paragraphs: [
          'At the end of the fortnight, there should be a genuine decision: stop, continue at a lower level, or continue as is. Most families need less at day 14 than at day 1, and a service that never proposes reducing support is not acting in your interest.',
        ],
      },
    ],
    relatedPackages: ['14-day-post-discharge-recovery', 'monthly-chronic-care-support'],
  },
  {
    slug: 'nri-parent-care-mumbai',
    title: 'Caring for parents in Mumbai from abroad: what actually works',
    metaTitle: 'NRI parent care in Mumbai — arranging care from abroad',
    metaDescription:
      'A practical guide for NRI families arranging elder care for parents in Mumbai: what to set up, how to verify care is happening, and how to handle emergencies across timezones.',
    intent: 'NRI parent care Mumbai',
    readingMinutes: 8,
    updatedAt: '2026-02-10',
    intro: [
      'The difficulty of arranging care from abroad is not money and it is not affection. It is verification: you cannot see what happened, and your parents will tell you everything is fine because they do not want to worry you.',
      'This guide is about closing that gap.',
    ],
    sections: [
      {
        heading: 'Set up one point of accountability',
        paragraphs: [
          'The single most valuable thing you can buy from abroad is one named person who knows your parents\' situation and is answerable for it — not a call centre, and not a caregiver who reports only to themselves.',
          'Ask directly: who is my named coordinator, what happens when they are on leave, and who supervises them?',
        ],
      },
      {
        heading: 'Insist on a written record, not phone reassurance',
        paragraphs: [
          'A verbal weekly update requires you to ask exactly the right question. A written record of each visit — arrival time, tasks done, medication confirmed, readings taken, notes — lets you notice a pattern you would never have thought to ask about.',
          'The pattern is the point. One skipped walk is nothing; three weeks of skipped walks is a conversation with a doctor.',
        ],
      },
      {
        heading: 'Decide the escalation rules while you are calm',
        paragraphs: [
          'Write down: who is called first, who second, at what hour you want to be woken, which hospital you prefer, who locally has a key and standing to act.',
          'Also decide the boundary honestly. If your father falls at 3am your time, the caregiver should be calling emergency services first and you second. Any arrangement that puts you in the decision path before emergency care is a dangerous arrangement.',
        ],
      },
      {
        heading: 'Get a local human with standing',
        paragraphs: [
          'A cousin, a neighbour, a building manager — somebody who can be physically present within thirty minutes and who your parents will actually let in. Care coordination does not replace this; it makes it usable, by knowing who to call and having told them in advance.',
        ],
      },
      {
        heading: 'Handle the sibling problem early',
        paragraphs: [
          'Where several children are involved, disagreement usually starts from different information rather than different values. Give everyone access to the same record, decide who is the primary decision-maker, and make that explicit to the care provider.',
        ],
      },
      {
        heading: 'When you visit',
        paragraphs: [
          'Use the visit for the things that cannot be done remotely: sit in on a nurse review, meet the caregiver, walk the house looking for hazards, and go to one appointment yourself. Those four things will tell you more than six months of updates.',
        ],
      },
    ],
    relatedPackages: ['nri-parent-care-coordination', 'fall-prevention-home-safety'],
  },
  {
    slug: 'elder-caregiver-mumbai',
    title: 'Hiring an elder caregiver in Mumbai: what to verify and what to ask',
    metaTitle: 'Elder caregiver in Mumbai — hiring and verification guide',
    metaDescription:
      'How to hire an elder caregiver in Mumbai safely: verification to insist on, what a caregiver should and should not do, and how to handle replacement and time off.',
    intent: 'elder caregiver Mumbai',
    readingMinutes: 7,
    updatedAt: '2026-02-18',
    intro: [
      'You are giving someone keys to your parents\' home and responsibility for their day. The hiring decision deserves more scrutiny than it usually gets, and most of that scrutiny is not about warmth or experience — it is about verification and cover.',
    ],
    sections: [
      {
        heading: 'The verification floor',
        paragraphs: ['Do not accept less than this, whoever you hire through.'],
        list: [
          'Government photo identification, checked against a current address.',
          'Police verification, on file, with a date you can see.',
          'A named person who is accountable if something goes wrong — not "the agency".',
          'A clear answer on training: what, when, and what it covered.',
          'An honest status where a check is incomplete, rather than a blanket claim that everyone is verified.',
        ],
      },
      {
        heading: 'What a caregiver should and should not do',
        paragraphs: [
          'Scope creep is where trouble starts. A caregiver supports mobility, meals, hygiene, companionship, light care-related tidying, appointment preparation, and reminds about medication while recording whether it was taken.',
          'A caregiver should never decide a dose, give anything not on the recorded list, perform a clinical procedure, or be left to interpret a symptom alone. If the arrangement you are offered blurs these, walk away — the risk lands on your parent, not on the agency.',
        ],
      },
      {
        heading: 'Ask about the Tuesday problem',
        paragraphs: [
          'Every caregiver will eventually be ill, have a family emergency, or need leave. The question is not whether it happens but whose problem it becomes.',
          'Ask: who covers, how quickly, how do you choose the replacement, will they speak my parent\'s language, and will my parent be told before someone new arrives at the door? A vague answer here predicts exactly how the relationship will fail.',
        ],
      },
      {
        heading: 'Language and gender preferences are practical, not fussy',
        paragraphs: [
          'A senior who cannot comfortably talk to their caregiver will disengage, and disengagement looks like refusal of care. Language match is one of the strongest predictors of whether a placement lasts.',
          'The same applies to gender preference for personal care. State it clearly at the start; it is a reasonable requirement, not an awkward one.',
        ],
      },
      {
        heading: 'The first two weeks',
        paragraphs: [
          'Be present more than you plan to be. Watch one full morning routine. Check that what the plan says is what actually happens. Corrections in week one are easy; corrections in month three feel like accusations.',
        ],
      },
    ],
    relatedPackages: ['monthly-chronic-care-support', '14-day-post-discharge-recovery'],
  },
  {
    slug: 'senior-citizen-home-care',
    title: 'Senior citizen home care: choosing between the options',
    metaTitle: 'Senior citizen home care — comparing your options',
    metaDescription:
      'Comparing options for senior citizen home care: family care, a hired attendant, an agency, coordinated home care and assisted living — with the honest trade-offs of each.',
    intent: 'senior citizen home care',
    readingMinutes: 6,
    updatedAt: '2026-02-24',
    intro: [
      'There are five realistic options, and the right one depends far more on how much coordination your family can sustain than on how much you can spend.',
    ],
    sections: [
      {
        heading: 'Family care only',
        paragraphs: [
          'Works when the need is light, somebody is genuinely available on weekdays, and the medication routine is simple. It fails quietly through exhaustion — usually falling on one daughter or daughter-in-law who never agreed to it.',
          'If this is your current arrangement, the honest question is not "can we manage" but "who is carrying this, and for how much longer".',
        ],
      },
      {
        heading: 'Directly hired attendant',
        paragraphs: [
          'Cheapest, and it can work well for years with the right person. You take on everything else: verification, supervision, leave cover, payroll, and being the escalation point yourself.',
          'The risk concentrates in one person. When they leave, you start again from zero with no record of what the care actually involved.',
        ],
      },
      {
        heading: 'Placement agency',
        paragraphs: [
          'Solves sourcing and some verification. Usually does not solve supervision, reporting or continuity — you still get a person, not a service, and the agency\'s involvement often ends once the placement is made.',
          'Ask specifically what happens after day one. If the answer is "call us if there is a problem", you are buying an introduction.',
        ],
      },
      {
        heading: 'Coordinated home care',
        paragraphs: [
          'A written plan, a supervised caregiver, someone accountable for cover, and a record you can read. Costs more than a direct hire because supervision and coordination are real work.',
          'Worth it when the situation is complex, when the family cannot supervise, or when nobody is nearby. Not worth it for a straightforward need that a good direct hire covers well.',
        ],
      },
      {
        heading: 'Assisted living',
        paragraphs: [
          'Right for some situations, particularly where the home cannot be made safe or a senior needs supervision through the night that a family cannot fund at home.',
          'The trade-off is leaving home, which for many older adults is a much larger loss than the care gain. Worth exploring properly rather than treating as a failure.',
        ],
      },
      {
        heading: 'How to choose',
        paragraphs: [
          'Ask two questions. First: if the caregiver does not come tomorrow, who solves it? Second: if a doctor asks in six weeks how things have been, what evidence do we have?',
          'If the honest answer to both is "me, and none", you need coordination more than you need more hours.',
        ],
      },
    ],
    relatedPackages: ['monthly-chronic-care-support', 'nri-parent-care-coordination'],
  },
  {
    slug: 'chronic-care-support-at-home',
    title: 'Chronic care support at home: managing one to three conditions',
    metaTitle: 'Chronic care support at home for older adults',
    metaDescription:
      'How to support an older adult managing one to three chronic conditions at home: medication routines, recording readings, appointment coordination and what to escalate.',
    intent: 'chronic care support',
    readingMinutes: 7,
    updatedAt: '2026-03-04',
    intro: [
      'Chronic conditions are not managed by intensity, they are managed by consistency over years. The work is unglamorous: the same tablets at the same times, readings taken the same way, appointments attended, and somebody noticing when a pattern changes.',
      'The clinical decisions belong to the treating doctor. Everything described here is the coordination around them.',
    ],
    sections: [
      {
        heading: 'One accurate medication list, one place',
        paragraphs: [
          'Most avoidable problems in chronic care trace back to an inaccurate medication list — a dose that changed, a duplicate under two brand names, or a tablet stopped by one doctor and continued by the family.',
          'Maintain one list from the current prescriptions, with dose and timing, and update it only on a doctor\'s instruction. Anyone supporting the senior should work from that same list.',
        ],
      },
      {
        heading: 'Record readings consistently, and do not interpret them',
        paragraphs: [
          'A blood pressure reading taken after climbing stairs is not comparable to one taken at rest, and a glucose reading after a meal is not comparable to a fasting one. Fix the time and the conditions, and record both alongside the number.',
          'Resist interpreting. A single high reading means very little; a two-week trend means something, and what it means is a clinician\'s judgement. A reading outside an expected range should trigger a review by a qualified person, not a conclusion.',
        ],
      },
      {
        heading: 'Make appointments somebody\'s job',
        paragraphs: [
          'Chronic care runs on periodic reviews — three-monthly, six-monthly — and those are exactly the things that slip when everyone is busy. Assign them explicitly: who books, who takes them, who writes down what was said.',
          'Take the readings log and the current medication list to every appointment. Ten minutes with a doctor is far more useful with evidence than with recollection.',
        ],
      },
      {
        heading: 'Watch the things that are not the condition',
        paragraphs: [
          'Appetite, sleep, mood, and how much someone is moving are often the earliest visible signals that something has changed, and they are the easiest for a family to miss over the phone.',
          'A caregiver who records mood and alertness each visit is doing something more valuable than it sounds.',
        ],
      },
      {
        heading: 'Agree what gets escalated, in writing',
        paragraphs: [
          'Decide with the treating doctor which changes warrant a call and which can wait for the next review, and write that into the care plan so a caregiver at 7am is not guessing.',
          'Anything that looks medically urgent goes to emergency services first. That rule should never be diluted by an escalation process.',
        ],
      },
    ],
    relatedPackages: ['monthly-chronic-care-support', '14-day-post-discharge-recovery'],
  },
  {
    slug: 'dementia-companion-care',
    title: 'Dementia companion care: what helps and what makes things harder',
    metaTitle: 'Dementia companion care at home — a family guide',
    metaDescription:
      'Practical guidance on companion care for someone living with dementia at home: routine, communication, handling repetition and agitation, and supporting the family carer.',
    intent: 'dementia companion care',
    readingMinutes: 8,
    updatedAt: '2026-03-12',
    intro: [
      'Dementia care is where good intentions most often make things worse, because the instincts that work with anyone else — correcting, reminding, reasoning — reliably increase distress.',
      'This is about companionship and daily support. Diagnosis, medication and behavioural treatment are matters for a specialist, and nothing here substitutes for that.',
    ],
    sections: [
      {
        heading: 'Routine does more than hours',
        paragraphs: [
          'The same caregiver, the same times, the same order of the day. Predictability reduces the load on a memory that is struggling, and reduces the anxiety that drives most difficult moments.',
          'This is why a rotating group of caregivers, however skilled, works badly here — and why any provider that cannot promise consistency is not the right provider for dementia care.',
        ],
      },
      {
        heading: 'Do not correct, and do not test',
        paragraphs: [
          'Being told they are wrong, repeatedly, is distressing and changes nothing. Neither does "do you remember who I am?", which is a test the person will fail in front of someone they love.',
          'Respond to the feeling rather than the fact. If your mother is worried about a father who died years ago, the useful reply is about reassurance, not about correcting the timeline.',
        ],
      },
      {
        heading: 'Repetition is not the problem it looks like',
        paragraphs: [
          'The same question asked twelve times is usually anxiety, not curiosity. Answering calmly the twelfth time costs less than the escalation that follows a sharp reply.',
          'Where a question repeats constantly, a written note in a fixed place — "Priya is coming at 6" — sometimes helps more than any verbal answer.',
        ],
      },
      {
        heading: 'Agitation usually has a cause worth finding',
        paragraphs: [
          'Pain, needing the toilet, hunger, too much noise, too many people, or the late-afternoon restlessness many families notice. It is far more often environmental or physical than psychological.',
          'A caregiver who records when agitation happens, and what was going on around it, gives a specialist something genuinely useful to work with.',
        ],
      },
      {
        heading: 'Protect the family carer',
        paragraphs: [
          'The spouse or child providing daily dementia care is at serious risk of exhaustion, and they will rarely say so. Regular, reliable relief — the same afternoons every week — is more sustainable than occasional heroic help.',
          'If you are that carer: you are allowed to need this, and arranging it is not a failure.',
        ],
      },
      {
        heading: 'Safety, without turning the home into an institution',
        paragraphs: [
          'The highest-value changes are usually small: clear night-time routes, good lighting, a reduced-clutter path to the bathroom, and identification on the person in case they leave the house.',
          'Locking a home down comprehensively tends to increase distress. Aim for the fewest changes that address the specific risks you have actually observed.',
        ],
      },
    ],
    relatedPackages: ['companion-dementia-support', 'fall-prevention-home-safety'],
  },
  {
    slug: 'fall-prevention-for-elderly',
    title: 'Fall prevention for older adults: a room-by-room checklist',
    metaTitle: 'Fall prevention for elderly parents — home safety checklist',
    metaDescription:
      'A practical room-by-room fall prevention checklist for older adults at home, plus the non-environmental risks that matter and what to do after a fall or near-fall.',
    intent: 'fall prevention elderly',
    readingMinutes: 6,
    updatedAt: '2026-03-20',
    intro: [
      'A fall is the single event most likely to turn an independent older adult into a dependent one, and most falls at home have a physical cause you could have pointed at beforehand.',
      'This checklist is the environmental half. The other half — strength, balance, vision and the effects of medication — needs professional assessment, and this guide does not attempt it.',
    ],
    sections: [
      {
        heading: 'Bathroom',
        paragraphs: ['Statistically the highest-risk room in the house, and the cheapest to fix.'],
        list: [
          'Grab support beside the toilet and inside the washing area, fixed into the wall rather than suction-mounted.',
          'A non-slip surface where water collects, and a squeegee or mat so the floor is not left wet.',
          'A stool for washing while seated, if standing is unsteady.',
          'A raised toilet seat where getting up from low is difficult.',
          'Nothing stored so low or so high that it requires bending or reaching.',
        ],
      },
      {
        heading: 'The night-time route',
        paragraphs: [
          'Walk it yourself, in the dark, exactly as your parent would. This one exercise finds more hazards than any checklist.',
        ],
        list: [
          'A light your parent can reach from bed, and motion or plug-in lights along the route.',
          'Nothing on the floor along that path — no wires, no bags, no low furniture edges.',
          'Slippers with a back and a grip, not loose chappals.',
          'A phone or call device reachable from the floor, in case of a fall.',
        ],
      },
      {
        heading: 'Living areas and kitchen',
        paragraphs: [],
        list: [
          'Loose rugs removed or taped down; small mats are a common trip cause.',
          'Chair heights that allow standing without pulling on something unstable.',
          'Everyday items between waist and shoulder height, so nothing needs a stool.',
          'Clear routes at least the width of a walker if one is used.',
          'Any raised threshold between rooms marked or ramped.',
        ],
      },
      {
        heading: 'Stairs and entrance',
        paragraphs: [],
        list: [
          'A handrail on at least one side, secure along the full run.',
          'Step edges visible — a contrasting strip helps where vision is reduced.',
          'Adequate lighting at both the top and the bottom.',
          'A plan for lift failures, which in Mumbai buildings are frequent enough to plan for.',
        ],
      },
      {
        heading: 'The risks that are not environmental',
        paragraphs: [
          'Reduced vision, weakness in the legs, dizziness on standing, poor footwear, and the effects of some medications all raise fall risk substantially, and none of them are fixed by moving furniture.',
          'These need proper assessment. If your parent has had a fall or a near-fall, raise it with their doctor rather than treating it as clumsiness — and mention every medicine they take.',
        ],
      },
      {
        heading: 'After a fall or near-fall',
        paragraphs: [
          'Record it, even if nobody was hurt: when, where, what they were doing, whether they were dizzy, whether they could get up. A near-fall is the cheapest warning you will ever get.',
          'Tell the doctor. A pattern of near-falls is clinically meaningful in a way that a single incident is not.',
        ],
      },
    ],
    relatedPackages: ['fall-prevention-home-safety', 'monthly-chronic-care-support'],
  },
  {
    slug: 'home-healthcare-coordination',
    title: 'Home healthcare coordination: who owns what',
    metaTitle: 'Home healthcare coordination — how the roles fit together',
    metaDescription:
      'Understand home healthcare coordination: the difference between caregiver, nurse, coordinator, doctor and family responsibilities, and how escalation should work.',
    intent: 'home healthcare coordination',
    readingMinutes: 6,
    updatedAt: '2026-03-28',
    intro: [
      'Care at home involves five parties, and almost every failure is a handover failure rather than a competence failure. Being explicit about who owns what removes most of the risk.',
    ],
    sections: [
      {
        heading: 'The caregiver',
        paragraphs: [
          'Owns the day: mobility support, meals, hygiene, companionship, medication reminders and recording what happened. Their job includes escalating anything unusual immediately, and it explicitly excludes deciding anything clinical.',
          'A caregiver being asked to make judgement calls about symptoms or doses is a system failure, not a caregiver failure.',
        ],
      },
      {
        heading: 'The nurse or supervisor',
        paragraphs: [
          'Owns the plan and its review: reads the notes and readings, decides whether a visit or a change is needed, and is the person a caregiver escalates to. Also the professional check on whether care is actually working.',
          'Without this role, nobody is looking at the pattern — only at today.',
        ],
      },
      {
        heading: 'The coordinator',
        paragraphs: [
          'Owns scheduling, attendance, replacement cover, appointment logistics and family communication. Invisible when done well, and the source of most family frustration when absent.',
          'This is the role families most often end up performing themselves without realising they have taken a second job.',
        ],
      },
      {
        heading: 'The doctor',
        paragraphs: [
          'Owns everything clinical: diagnosis, treatment, prescriptions, and what a reading means. Home care supports this by producing an accurate record and getting the patient to appointments — never by substituting for it.',
          'Any home service that appears to be making clinical decisions is a service to be cautious of.',
        ],
      },
      {
        heading: 'The family',
        paragraphs: [
          'Owns the decisions, the preferences and the consent. In a good arrangement the family is not doing the coordination — but they are the ones who decide what "better" means, and they should never be cut out of that.',
        ],
      },
      {
        heading: 'How escalation should look',
        paragraphs: [
          'Caregiver to nurse to operations to family, with a defined time target at each step, and a clear separation for anything medically urgent: emergency services first, everyone else second.',
          'Ask any provider to show you their escalation rules. If they cannot describe them specifically, they do not have any.',
        ],
      },
    ],
    relatedPackages: ['nri-parent-care-coordination', 'monthly-chronic-care-support'],
  },
];

export function findArticle(slug: string): ResourceArticle | undefined {
  return RESOURCE_ARTICLES.find((article) => article.slug === slug);
}
