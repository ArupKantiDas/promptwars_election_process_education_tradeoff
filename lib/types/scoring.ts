export type RubricScore = 1 | 2 | 3 | 4 | 5;

export type DimensionName =
  | "specificity"
  | "measurability"
  | "timeline"
  | "accountability"
  | "feasibility";

export const DIMENSION_ORDER: readonly DimensionName[] = [
  "specificity",
  "measurability",
  "timeline",
  "accountability",
  "feasibility"
] as const;

export type DimensionScore = {
  score: RubricScore;
  triggering_span: string;
};

export type ScoredCommitment = {
  candidateId: string;
  text: string;
  dimensions: Record<DimensionName, DimensionScore>;
  verified: boolean;
};

export type ScoreResponse = {
  scored: ScoredCommitment[];
};

export type DimensionMeta = {
  label: string;
  description: string;
};

// Calibration anchors copied verbatim from AGENTS.md "The five-dimension rubric"
// section. AGENTS.md states these "must appear verbatim in the rubric scorer's
// system prompt every time. Do not paraphrase." The same definitions are
// surfaced in the UI so the user sees exactly what the model was scored against.
export const DIMENSION_META: Record<DimensionName, DimensionMeta> = {
  specificity: {
    label: "Specificity",
    description:
      "Does it name a specific scheme, sector, or population? 5 = names a scheme/sector/population AND a target. 1 = aspirational language only."
  },
  measurability: {
    label: "Measurability",
    description:
      "Can progress be measured? 5 = contains a number AND a unit. 1 = no measurable element."
  },
  timeline: {
    label: "Timeline",
    description:
      "Is there a deadline? 5 = explicit year or window stated. 3 = \"within X years\" without a base year. 1 = no timeline."
  },
  accountability: {
    label: "Accountability",
    description:
      "Is responsibility assigned? 5 = names a department, ministry, or implementing body. 1 = no implementing entity named."
  },
  feasibility: {
    label: "Feasibility",
    description:
      "Is funding or mechanism mentioned? 5 = budget figure or funding source named. 3 = mechanism described without numbers. 1 = no mechanism mentioned."
  }
};
