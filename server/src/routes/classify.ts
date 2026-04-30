import { Router } from "express";
import { z } from "zod";
import { logger } from "../logger.js";

// Pass two of the two-pass extraction. Classifies pre-extracted commitments
// against the canonical taxonomy using hand-authored synonym lists. The model
// must return the issue ID (e.g., "womens-safety"), not the label.
const Commitment = z.object({
  id: z.string().min(1),
  text: z.string().min(1)
});

const ClassifyRequest = z.object({
  candidateId: z.string().min(1),
  commitments: z.array(Commitment).min(1)
});

export type ClassifiedCommitment = {
  id: string;
  issueId: string;
};

export type ClassifyResponse = {
  candidateId: string;
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
    // TODO: call Gemini with the canonical taxonomy + synonym lists in the
    // prompt context. Reject any output where issueId is not in the taxonomy.
    const response: ClassifyResponse = {
      candidateId: parsed.data.candidateId,
      classified: []
    };
    res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.error("classify_failed", { message });
    res.status(502).json({ error: "classify_failed" });
  }
});
