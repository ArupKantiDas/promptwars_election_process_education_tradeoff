import { Router } from "express";
import { z } from "zod";
import { logger } from "../logger.js";
import { extractCommitments, type ExtractedCommitment } from "../services/extraction.js";

// Pass one of the two-pass extraction. Thin HTTP wrapper around
// services/extraction.ts. The service is also called from /api/missing.
//
// Contract (AGENTS.md → Endpoint contracts):
//   Request:  { candidateId: string }
//   Response: { commitments: [{ text, page, paragraph }] }

const ExtractRequest = z.object({
  candidateId: z.string().min(1)
});

export type { ExtractedCommitment };

export type ExtractResponse = {
  commitments: ExtractedCommitment[];
};

export const extractRouter = Router();

extractRouter.post("/", async (req, res) => {
  const parsed = ExtractRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  const { candidateId } = parsed.data;
  try {
    const commitments = await extractCommitments(candidateId);
    const response: ExtractResponse = { commitments };
    res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.error("extract_failed", { candidateId, message });
    res.status(502).json({ error: "extract_failed", message });
  }
});
