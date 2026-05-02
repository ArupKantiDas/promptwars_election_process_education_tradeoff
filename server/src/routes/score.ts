import { Router } from "express";
import { z } from "zod";
import { logger } from "../logger.js";
import { getGeminiClient } from "../llm/gemini.js";
import {
  scoreBatchWithRetry,
  type AnonCommitment,
  type DimensionName,
  type ScoredAnon,
  DIMENSION_ORDER
} from "../llm/scoring.js";
import { stubScoreBatch } from "../llm/stubScorer.js";
import { loadCandidateMetadata } from "../sources/manifestoSource.js";
import { sanitizeForPrompt } from "../sources/sanitize.js";

// Five-dimension rubric scorer. All four candidates' commitments on a single
// issue are scored in the same prompt batch to keep calibration consistent.
// The scorer is blind to candidate identity beyond a numeric anon_id;
// archetype labels never appear.
//
// Contract (AGENTS.md → Endpoint contracts):
//   Request:  { issueId, commitments: [{ candidateId, text, issueId }] }
//   Response: { scored: [{ candidateId, text,
//                          dimensions{...with optional unverified}, verified }] }

const InputCommitment = z.object({
  candidateId: z.string().min(1),
  text: z.string().min(1),
  issueId: z.string().min(1)
});

const ScoreRequest = z.object({
  issueId: z.string().min(1),
  commitments: z.array(InputCommitment).min(1).max(20)
});

export type RubricScore = 1 | 2 | 3 | 4 | 5;

export type DimensionScore = {
  score: RubricScore;
  triggering_span: string;
  unverified?: boolean;
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

export const scoreRouter = Router();

scoreRouter.post("/", async (req, res) => {
  const parsed = ScoreRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const { issueId, commitments } = parsed.data;

  try {
    // 1. Sanitise each commitment text against its candidate's identifying
    // strings (party + name + archetype). The scorer must never see them.
    // Build two parallel arrays: anonymised commitments for the prompt,
    // and the original candidateId mapping for the response.
    const sanitised: AnonCommitment[] = [];
    const anonToCandidate = new Map<number, string>();
    const anonToOriginalText = new Map<number, string>();
    let nextAnonId = 1;
    for (const c of commitments) {
      const meta = await loadCandidateMetadata(c.candidateId);
      const cleaned = sanitizeForPrompt(c.text, {
        candidateName: meta.name,
        party: meta.party
      });
      const anonId = nextAnonId;
      nextAnonId += 1;
      sanitised.push({ anonId, text: cleaned });
      anonToCandidate.set(anonId, c.candidateId);
      anonToOriginalText.set(anonId, c.text);
    }

    // 2. Score (live Gemini with retry, or local stub).
    const gemini = getGeminiClient();
    let scoredAnon: ScoredAnon[];
    if (gemini.isLive) {
      scoredAnon = await scoreBatchWithRetry(issueId, sanitised, 3);
      logger.info("score_live", { issueId, count: scoredAnon.length });
    } else {
      scoredAnon = stubScoreBatch(sanitised);
      logger.info("score_stub", { issueId, count: scoredAnon.length });
    }

    // 3. Reverse-map anon_id → candidateId, restore original (un-sanitised)
    // commitment text for display, and compute verified rollup.
    const out: ScoredCommitment[] = [];
    for (const sc of scoredAnon) {
      const candidateId = anonToCandidate.get(sc.anonId);
      const text = anonToOriginalText.get(sc.anonId);
      if (candidateId === undefined || text === undefined) {
        logger.warn("score_anon_id_unmapped", { anonId: sc.anonId });
        continue;
      }
      const dimensions: Record<DimensionName, DimensionScore> = {
        specificity: toResponseDim(sc.dimensions.specificity),
        measurability: toResponseDim(sc.dimensions.measurability),
        timeline: toResponseDim(sc.dimensions.timeline),
        accountability: toResponseDim(sc.dimensions.accountability),
        feasibility: toResponseDim(sc.dimensions.feasibility)
      };
      const verified = DIMENSION_ORDER.every((d) => dimensions[d].unverified !== true);
      out.push({ candidateId, text, dimensions, verified });
    }

    const response: ScoreResponse = { scored: out };
    res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.error("score_failed", { issueId, message });
    res.status(502).json({ error: "score_failed", message });
  }
});

function toResponseDim(d: { score: RubricScore; triggeringSpan: string; unverified: boolean }): DimensionScore {
  const out: DimensionScore = { score: d.score, triggering_span: d.triggeringSpan };
  if (d.unverified) out.unverified = true;
  return out;
}
