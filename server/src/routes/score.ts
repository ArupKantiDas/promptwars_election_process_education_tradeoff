import { Router } from "express";
import { z } from "zod";
import { logger } from "../logger.js";

// Five-dimension rubric scorer. All four candidates' commitments on a single
// issue are scored in the same prompt batch to keep calibration consistent.
// The scorer is blind to which candidate's commitment it is rating.
const RubricDimension = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5)
]);

const Item = z.object({
  candidateId: z.string().min(1),
  commitmentId: z.string().min(1),
  text: z.string().min(1),
  manifestoText: z.string().min(1)
});

const ScoreRequest = z.object({
  issueId: z.string().min(1),
  items: z.array(Item).min(1).max(20)
});

export type RubricScore = z.infer<typeof RubricDimension>;

export type ScoredCommitment = {
  candidateId: string;
  commitmentId: string;
  scores: {
    specificity: RubricScore;
    measurability: RubricScore;
    timeline: RubricScore;
    accountability: RubricScore;
    feasibility: RubricScore;
  };
  span: string;
};

export type ScoreResponse = {
  issueId: string;
  scored: ScoredCommitment[];
};

export const scoreRouter = Router();

scoreRouter.post("/", async (req, res) => {
  const parsed = ScoreRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }

  try {
    // TODO: call Gemini with the calibration anchors in the system prompt
    // verbatim. Validate that returned `span` substring-matches the source
    // manifestoText. Retry up to three times on validation failure.
    const response: ScoreResponse = {
      issueId: parsed.data.issueId,
      scored: []
    };
    res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.error("score_failed", { message });
    res.status(502).json({ error: "score_failed" });
  }
});
