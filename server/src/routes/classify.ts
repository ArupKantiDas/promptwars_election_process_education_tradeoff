import { Router } from "express";
import { z } from "zod";
import { logger } from "../logger.js";
import {
  classifyCommitments,
  type ClassifiedCommitment
} from "../services/classification.js";

// Pass two of the two-pass extraction. Thin HTTP wrapper around
// services/classification.ts. The service is also called from /api/missing.
//
// Contract (AGENTS.md → Endpoint contracts):
//   Request:  { commitments: [{ text, page, paragraph }] }
//   Response: { classified: [{ text, page, paragraph, issueId, confidence }] }

const InputCommitment = z.object({
  text: z.string().min(1),
  page: z.number().int().nonnegative(),
  paragraph: z.number().int().nonnegative()
});

const ClassifyRequest = z.object({
  commitments: z.array(InputCommitment).min(1)
});

export type { ClassifiedCommitment };

export type ClassifyResponse = {
  classified: ClassifiedCommitment[];
};

export const classifyRouter = Router();

classifyRouter.post("/", async (req, res) => {
  const parsed = ClassifyRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }
  try {
    const classified = await classifyCommitments(parsed.data.commitments);
    const response: ClassifyResponse = { classified };
    res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.error("classify_failed", { message });
    res.status(502).json({ error: "classify_failed", message });
  }
});
