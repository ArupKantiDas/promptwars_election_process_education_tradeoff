export type IssueId =
  | "employment"
  | "healthcare"
  | "womens_safety"
  | "corruption"
  | "education"
  | "agriculture"
  | "infrastructure"
  | "welfare"
  | "citizenship_identity"
  | "environment";

export type Issue = {
  id: IssueId;
  label: string;
  description: string;
};

// IDs and labels mirror /content/taxonomy/issues.json which is the source of
// truth. If you change one, change the other; AGENTS.md states the JSON wins
// in case of drift. Snake_case is canonical — never kebab-case.
export const CANONICAL_ISSUES: readonly Issue[] = [
  {
    id: "employment",
    label: "Employment and Livelihoods",
    description:
      "Job creation, public recruitment, delayed government examinations, outward migration of educated youth, industrial revival."
  },
  {
    id: "healthcare",
    label: "Healthcare Access and Quality",
    description:
      "Gaps in specialist care, affordability, rural health infrastructure, public hospital capacity."
  },
  {
    id: "womens_safety",
    label: "Women's Safety and Law and Order",
    description:
      "Crimes against women, law and order, police accountability, campus safety."
  },
  {
    id: "corruption",
    label: "Corruption and Governance",
    description:
      "Recruitment scams, institutional credibility, administrative transparency, anti-corruption measures."
  },
  {
    id: "education",
    label: "Education and Skill Development",
    description:
      "School and college quality, recruitment reform, higher education access, vocational training."
  },
  {
    id: "agriculture",
    label: "Agriculture and Rural Economy",
    description:
      "Farmer income, crop price support, irrigation, rural credit, flood damage."
  },
  {
    id: "infrastructure",
    label: "Infrastructure and Urban Development",
    description:
      "Roads, bridges, public transport, drinking water, electricity, flood management."
  },
  {
    id: "welfare",
    label: "Welfare Schemes and Social Protection",
    description:
      "Direct benefit transfers, ration, MGNREGA, housing for poor, pension."
  },
  {
    id: "citizenship_identity",
    label: "Citizenship, Identity and Electoral Integrity",
    description:
      "CAA, SIR roll deletions, undocumented migration, minority representation."
  },
  {
    id: "environment",
    label: "Environment and Climate Resilience",
    description:
      "Cyclone preparedness, Sundarbans degradation, industrial pollution, clean air."
  }
] as const;

export const ISSUE_BY_ID: Readonly<Record<IssueId, Issue>> = Object.freeze(
  Object.fromEntries(CANONICAL_ISSUES.map((i) => [i.id, i])) as Record<IssueId, Issue>
);
