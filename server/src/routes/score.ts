import { Router } from "express";

// Contract (AGENTS.md → Endpoint contracts):
//   Request:  { issueId: string,
//               commitments: [{ candidateId: string, text: string, issueId: string }] }
//   Response: { scored: [{ candidateId, text,
//                          dimensions: { specificity, measurability, timeline,
//                                        accountability, feasibility }
//                            where each = { score: number, triggering_span: string },
//                          verified: boolean }] }

export type RubricScore = 1 | 2 | 3 | 4 | 5;

export type DimensionScore = {
  score: RubricScore;
  triggering_span: string;
};

export type ScoredCommitment = {
  candidateId: string;
  text: string;
  dimensions: {
    specificity: DimensionScore;
    measurability: DimensionScore;
    timeline: DimensionScore;
    accountability: DimensionScore;
    feasibility: DimensionScore;
  };
  verified: boolean;
};

export type ScoreResponse = {
  scored: ScoredCommitment[];
};

export const scoreRouter = Router();

scoreRouter.post("/", (_req, res) => {
  // TODO: implement in Phase 5
  const response: ScoreResponse = { scored: [] };
  res.status(200).json(response);
});
