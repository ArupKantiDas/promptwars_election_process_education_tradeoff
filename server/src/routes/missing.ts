import { Router } from "express";
import { z } from "zod";
import { logger } from "../logger.js";
import { extractCommitments } from "../services/extraction.js";
import { classifyCommitments } from "../services/classification.js";
import { detectMissingIssues, type MissingIssue } from "../services/missing.js";
import { loadTaxonomy } from "../sources/taxonomy.js";

// Phase 6 — deterministic "What's Missing" endpoint.
//
// The model is NOT called for the missing-detection step. The route runs
// extract → classify (each of which may call Gemini, or the local stub),
// then computes set-difference deterministically against the user's
// priorities.
//
// Contract (AGENTS.md → Endpoint contracts):
//   Request:  { candidateId, priorities: [string] }   (1–5 entries)
//   Response: { candidateId, missingIssues: [{ issueId, label }] }
//
// The cap is 5 because the issue ranker on the landing page (Phase 3) lets
// the user select up to 5 priorities. The matrix renders 5 rows; the
// missing panel runs against the same set rather than truncating to 3.

const MAX_PRIORITIES = 5;

const MissingRequest = z.object({
  candidateId: z.string().min(1),
  priorities: z.array(z.string().min(1)).min(1).max(MAX_PRIORITIES)
});

export type MissingResponse = {
  candidateId: string;
  missingIssues: MissingIssue[];
};

export const missingRouter = Router();

missingRouter.post("/", async (req, res) => {
  const parsed = MissingRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const { candidateId, priorities } = parsed.data;

  try {
    const taxonomy = await loadTaxonomy();
    // Validate priorities against the canonical taxonomy. Unknown IDs are
    // a request error — the missing detector itself is forgiving but the
    // HTTP contract should not silently accept garbage.
    const validIds = new Set(taxonomy.issues.map((i) => i.id));
    for (const p of priorities) {
      if (!validIds.has(p)) {
        res.status(400).json({
          error: "invalid_priority",
          issueId: p,
          message: `Priority "${p}" is not in the canonical taxonomy`
        });
        return;
      }
    }

    // Run the pass-one + pass-two pipeline for this candidate. These are
    // the same code paths /api/extract and /api/classify use.
    const extracted = await extractCommitments(candidateId);
    const classified = await classifyCommitments(extracted);

    // Deterministic detection — no model call.
    const missingIssues = detectMissingIssues(classified, priorities, taxonomy);

    logger.info("missing_computed", {
      candidateId,
      prioritiesCount: priorities.length,
      missingCount: missingIssues.length
    });

    const response: MissingResponse = { candidateId, missingIssues };
    res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.error("missing_failed", { candidateId, message });
    res.status(502).json({ error: "missing_failed", message });
  }
});
