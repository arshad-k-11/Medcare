import { overlapCount, readList } from '../json-list';

/**
 * Caregiver replacement matching.
 *
 * The differentiator the business sells is that a caregiver going unavailable does not
 * become the family's problem. That promise needs a defensible, explainable ranking —
 * ops has to tell a family *why* this person, and an auditor has to see the same reasons
 * later. So each factor contributes a fixed weight and a sentence.
 *
 * Weights total 100. They live here rather than in the database because changing them
 * changes behaviour the team has to re-validate.
 */

export const MATCH_WEIGHTS = {
  proximity: 30,
  availability: 25,
  skills: 15,
  language: 10,
  shift: 10,
  experience: 5,
  performance: 5,
} as const;

export type CandidateInput = {
  id: string;
  name: string;
  status: string;
  verificationStatus: string;
  preferredAreas: string;
  skills: string;
  languages: string;
  experienceYears: number;
  performanceScore: number;
  maxConcurrentPatients: number;
  activeAssignmentCount: number;
  /** Shift patterns the caregiver already works, from their current assignments. */
  currentShiftPatterns: string[];
  /** True when the caregiver has no visit overlapping the requested window. */
  isFreeInWindow: boolean;
  onApprovedLeave: boolean;
};

export type MatchRequirement = {
  area: string;
  zone?: string | null;
  requiredSkills: string[];
  languages: string[];
  shiftPattern: string;
};

export type MatchResult = {
  candidateId: string;
  name: string;
  score: number;
  reasons: string[];
  concerns: string[];
  eligible: boolean;
};

export function scoreCandidate(
  candidate: CandidateInput,
  requirement: MatchRequirement,
): MatchResult {
  const reasons: string[] = [];
  const concerns: string[] = [];
  let score = 0;

  // --- Hard filters. These make a candidate ineligible, not merely lower-scoring. ---
  let eligible = true;
  if (candidate.onApprovedLeave) {
    eligible = false;
    concerns.push('On approved leave for this period');
  }
  if (['INACTIVE', 'UNDER_REVIEW'].includes(candidate.status)) {
    eligible = false;
    concerns.push(
      candidate.status === 'UNDER_REVIEW'
        ? 'Currently under internal review'
        : 'Not an active team member',
    );
  }
  if (candidate.activeAssignmentCount >= candidate.maxConcurrentPatients) {
    eligible = false;
    concerns.push(
      `Already at capacity (${candidate.activeAssignmentCount}/${candidate.maxConcurrentPatients} patients)`,
    );
  }
  if (candidate.verificationStatus !== 'VERIFIED') {
    // Not a hard block — ops may knowingly deploy an in-progress caregiver with a nurse
    // visit alongside — but it must be visible, never silently assumed away.
    concerns.push(`Verification: ${candidate.verificationStatus.toLowerCase().replace('_', ' ')}`);
  }

  // --- Proximity ---
  const areas = readList(candidate.preferredAreas).map((a) => a.toLowerCase());
  const wantedArea = requirement.area.toLowerCase();
  if (areas.includes(wantedArea)) {
    score += MATCH_WEIGHTS.proximity;
    reasons.push(`Already works in ${requirement.area}`);
  } else if (requirement.zone && areas.some((a) => a.includes(requirement.zone!.toLowerCase()))) {
    score += Math.round(MATCH_WEIGHTS.proximity * 0.5);
    reasons.push(`Works in the same zone as ${requirement.area}`);
  } else {
    concerns.push(`Does not currently cover ${requirement.area}`);
  }

  // --- Availability in the requested window ---
  if (candidate.isFreeInWindow) {
    score += MATCH_WEIGHTS.availability;
    reasons.push('No conflicting visit in the requested window');
  } else {
    concerns.push('Has an overlapping visit in the requested window');
  }

  // --- Skills ---
  const skills = readList(candidate.skills);
  if (requirement.requiredSkills.length === 0) {
    score += MATCH_WEIGHTS.skills;
  } else {
    const matched = overlapCount(skills, requirement.requiredSkills);
    const ratio = matched / requirement.requiredSkills.length;
    score += Math.round(MATCH_WEIGHTS.skills * ratio);
    if (ratio === 1) reasons.push('Has every skill the care plan needs');
    else if (matched > 0)
      reasons.push(`Has ${matched} of ${requirement.requiredSkills.length} required skills`);
    else concerns.push('None of the care-plan skills recorded yet');
  }

  // --- Language: the single biggest driver of whether a senior accepts a caregiver ---
  const languages = readList(candidate.languages);
  if (requirement.languages.length === 0) {
    score += MATCH_WEIGHTS.language;
  } else {
    const shared = overlapCount(languages, requirement.languages);
    if (shared > 0) {
      score += MATCH_WEIGHTS.language;
      reasons.push('Speaks a language the family asked for');
    } else {
      concerns.push('No shared language recorded with the family preference');
    }
  }

  // --- Shift compatibility ---
  if (candidate.currentShiftPatterns.length === 0) {
    score += MATCH_WEIGHTS.shift;
    reasons.push('Shift is open');
  } else if (candidate.currentShiftPatterns.includes(requirement.shiftPattern)) {
    score += Math.round(MATCH_WEIGHTS.shift * 0.6);
    reasons.push('Already works this shift pattern');
  } else {
    concerns.push('Usually works a different shift');
  }

  // --- Experience & performance: tie-breakers, deliberately small ---
  score += Math.round(MATCH_WEIGHTS.experience * Math.min(1, candidate.experienceYears / 8));
  if (candidate.experienceYears >= 5) reasons.push(`${candidate.experienceYears} years of experience`);

  score += Math.round(MATCH_WEIGHTS.performance * (candidate.performanceScore / 100));
  if (candidate.performanceScore >= 85) reasons.push('Consistently strong internal performance score');

  return {
    candidateId: candidate.id,
    name: candidate.name,
    score: Math.min(100, score),
    reasons,
    concerns,
    eligible,
  };
}

export function rankCandidates(
  candidates: CandidateInput[],
  requirement: MatchRequirement,
): MatchResult[] {
  return candidates
    .map((candidate) => scoreCandidate(candidate, requirement))
    .sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.score - a.score;
    });
}

export function matchBand(score: number): 'STRONG' | 'GOOD' | 'POSSIBLE' {
  if (score >= 80) return 'STRONG';
  if (score >= 60) return 'GOOD';
  return 'POSSIBLE';
}
