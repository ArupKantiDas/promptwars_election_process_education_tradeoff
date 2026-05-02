import { logger } from "../logger.js";
import { getGeminiClient, SYSTEM_PROMPT_NEUTRAL, type GeminiPromptParts } from "./gemini.js";

// Phase 5 — rubric scoring helpers.
//
// Per AGENTS.md "The five-dimension rubric": the calibration anchors below
// must appear *verbatim* in every scorer prompt — they are normative, not
// rephrasable. They were copied character-for-character from AGENTS.md and
// any drift between this constant and AGENTS.md is a bug. (See the unit
// test in server/test/scoring.test.ts for the verbatim check.)
export const RUBRIC_DEFINITIONS_VERBATIM = `specificity      Does it name a specific scheme, sector, or population?
                 5 = names a scheme/sector/population AND a target.
                 1 = aspirational language only.

measurability    Can progress be measured?
                 5 = contains a number AND a unit.
                 1 = no measurable element.

timeline         Is there a deadline?
                 5 = explicit year or window stated.
                 3 = "within X years" without a base year.
                 1 = no timeline.

accountability   Is responsibility assigned?
                 5 = names a department, ministry, or implementing body.
                 1 = no implementing entity named.

feasibility      Is funding or mechanism mentioned?
                 5 = budget figure or funding source named.
                 3 = mechanism described without numbers.
                 1 = no mechanism mentioned.`;

const SCORE_SYSTEM = `${SYSTEM_PROMPT_NEUTRAL} Your task is rubric scoring. You score each commitment on five dimensions using the calibration anchors below. The anchors are normative; do not paraphrase or re-interpret them. For each dimension you must include a triggering_span — a contiguous substring of the commitment text that supports your score. The span must be exactly as it appears in the text, including punctuation and casing. Do not paraphrase the span. Do not summarise. Do not use ellipsis.

Calibration anchors (verbatim):

${RUBRIC_DEFINITIONS_VERBATIM}

The scorer is blind to candidate identity. Each commitment is identified by an anonymous numeric ID (anon_id) for batch consistency. You must not infer candidate identity, party, or political archetype from the commitment text or from any pattern across the batch. Score each commitment independently on its own merits.`;

const SCORE_OUTPUT_SCHEMA = {
  type: "OBJECT",
  properties: {
    scored: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          anon_id: { type: "INTEGER" },
          dimensions: {
            type: "OBJECT",
            properties: {
              specificity: dimSchema(),
              measurability: dimSchema(),
              timeline: dimSchema(),
              accountability: dimSchema(),
              feasibility: dimSchema()
            },
            required: ["specificity", "measurability", "timeline", "accountability", "feasibility"]
          }
        },
        required: ["anon_id", "dimensions"]
      }
    }
  },
  required: ["scored"]
};

function dimSchema(): object {
  return {
    type: "OBJECT",
    properties: {
      score: { type: "INTEGER" },
      triggering_span: { type: "STRING" }
    },
    required: ["score", "triggering_span"]
  };
}

export type AnonCommitment = { anonId: number; text: string };

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

export type DimensionResult = {
  score: 1 | 2 | 3 | 4 | 5;
  triggeringSpan: string;
  unverified: boolean;
};

export type ScoredAnon = {
  anonId: number;
  dimensions: Record<DimensionName, DimensionResult>;
};

type RawDim = { score?: unknown; triggering_span?: unknown };
type RawScored = {
  anon_id?: unknown;
  dimensions?: Partial<Record<DimensionName, RawDim>>;
};

function clampScore(n: unknown): 1 | 2 | 3 | 4 | 5 {
  if (typeof n !== "number" || !Number.isFinite(n)) return 1;
  const r = Math.min(5, Math.max(1, Math.round(n)));
  return r as 1 | 2 | 3 | 4 | 5;
}

function spanIsSubstring(span: string, source: string): boolean {
  if (typeof span !== "string" || span.length === 0) return false;
  return source.includes(span);
}

// Score a batch with up to maxAttempts retries. The model is asked again if
// any triggering_span fails substring-validation against its commitment's
// text. We pick the attempt with the fewest invalid spans; remaining
// invalid dimensions are flagged unverified and logged.
//
// `commitments` arrives already anonymised. Caller is responsible for
// reverse-mapping anon_id → candidateId on the response.
export async function scoreBatchWithRetry(
  issueId: string,
  commitments: readonly AnonCommitment[],
  maxAttempts = 3
): Promise<ScoredAnon[]> {
  const gemini = getGeminiClient();
  if (!gemini.isLive) {
    // Stub mode handled separately by route handler; this function is the
    // live-mode path only.
    throw new Error("scoreBatchWithRetry called in stub mode — route handler should branch earlier");
  }

  const promptParts: GeminiPromptParts = {
    system: SCORE_SYSTEM,
    context: `issue_id: ${issueId}\nbatch size: ${commitments.length} commitments across all four candidates on this single issue.`,
    input: JSON.stringify({
      issue_id: issueId,
      commitments: commitments.map((c) => ({ anon_id: c.anonId, text: c.text }))
    }),
    outputSchema: SCORE_OUTPUT_SCHEMA
  };

  const textByAnonId = new Map<number, string>();
  for (const c of commitments) textByAnonId.set(c.anonId, c.text);

  type AttemptResult = {
    parsed: ScoredAnon[];
    invalidCount: number;
  };
  const attempts: AttemptResult[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let raw: unknown;
    try {
      raw = await gemini.callJson(promptParts);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      logger.warn("score_attempt_failed", { attempt, message });
      continue;
    }
    const parsed = parseGeminiResponse(raw, commitments);
    let invalidCount = 0;
    for (const sc of parsed) {
      const source = textByAnonId.get(sc.anonId) ?? "";
      for (const dim of DIMENSION_ORDER) {
        const d = sc.dimensions[dim];
        if (!spanIsSubstring(d.triggeringSpan, source)) {
          d.unverified = true;
          invalidCount += 1;
        }
      }
    }
    attempts.push({ parsed, invalidCount });
    logger.info("score_attempt_complete", { attempt, invalidCount });
    if (invalidCount === 0) break;
  }

  if (attempts.length === 0) {
    throw new Error("score_failed: no successful Gemini response across retries");
  }

  // Pick the attempt with the fewest unverified dimensions. Any dimension
  // still invalid is logged for human review.
  const best = attempts.reduce((a, b) => (b.invalidCount < a.invalidCount ? b : a));
  for (const sc of best.parsed) {
    for (const dim of DIMENSION_ORDER) {
      if (sc.dimensions[dim].unverified) {
        logger.warn("score_span_unverified_after_retries", {
          anonId: sc.anonId,
          dimension: dim,
          span: sc.dimensions[dim].triggeringSpan
        });
      }
    }
  }

  return best.parsed;
}

function parseGeminiResponse(
  raw: unknown,
  commitments: readonly AnonCommitment[]
): ScoredAnon[] {
  const obj = (raw ?? {}) as { scored?: unknown };
  const list = Array.isArray(obj.scored) ? (obj.scored as RawScored[]) : [];
  const out: ScoredAnon[] = [];
  for (const sc of list) {
    if (typeof sc.anon_id !== "number" || !Number.isInteger(sc.anon_id)) continue;
    const dims = sc.dimensions ?? {};
    out.push({
      anonId: sc.anon_id,
      dimensions: {
        specificity: parseDim(dims.specificity),
        measurability: parseDim(dims.measurability),
        timeline: parseDim(dims.timeline),
        accountability: parseDim(dims.accountability),
        feasibility: parseDim(dims.feasibility)
      }
    });
  }
  // Ensure every requested commitment has a row, even if the model dropped
  // some. Missing rows score 1 across the board with an empty span; the
  // span will fail substring validation and get marked unverified.
  const seen = new Set(out.map((s) => s.anonId));
  for (const c of commitments) {
    if (!seen.has(c.anonId)) {
      out.push({
        anonId: c.anonId,
        dimensions: emptyDimensions()
      });
    }
  }
  return out;
}

function parseDim(d: RawDim | undefined): DimensionResult {
  return {
    score: clampScore(d?.score),
    triggeringSpan: typeof d?.triggering_span === "string" ? d.triggering_span : "",
    unverified: false
  };
}

function emptyDimensions(): Record<DimensionName, DimensionResult> {
  const empty = (): DimensionResult => ({ score: 1, triggeringSpan: "", unverified: false });
  return {
    specificity: empty(),
    measurability: empty(),
    timeline: empty(),
    accountability: empty(),
    feasibility: empty()
  };
}
