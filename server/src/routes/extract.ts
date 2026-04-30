import { Router } from "express";
import { z } from "zod";
import { logger } from "../logger.js";

// Pass one of the two-pass extraction. Extracts every commitment from the
// manifesto without an issue filter. Pass two (classify) is a separate call.
const ExtractRequest = z.object({
  candidateId: z.string().min(1),
  manifestoText: z.string().min(1)
});

export type Commitment = {
  id: string;
  text: string;
  sourceSpan: string;
};

export type ExtractResponse = {
  candidateId: string;
  commitments: Commitment[];
};

export const extractRouter = Router();

extractRouter.post("/", async (req, res) => {
  const parsed = ExtractRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request", issues: parsed.error.issues });
    return;
  }

  try {
    // TODO: call Gemini 2.5 Flash via Vertex AI; return commitments without
    // issue classification. Validate verbatim spans server-side.
    const response: ExtractResponse = {
      candidateId: parsed.data.candidateId,
      commitments: []
    };
    res.status(200).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.error("extract_failed", { message });
    res.status(502).json({ error: "extract_failed" });
  }
});
