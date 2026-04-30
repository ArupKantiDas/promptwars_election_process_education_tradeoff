import { Router } from "express";

// Contract (AGENTS.md → Endpoint contracts):
//   Request:  { commitments: [{ text: string, page: number, paragraph: number }] }
//   Response: { classified: [{ text: string, page: number, paragraph: number,
//                              issueId: string | null, confidence: number }] }

export type ClassifiedCommitment = {
  text: string;
  page: number;
  paragraph: number;
  issueId: string | null;
  confidence: number;
};

export type ClassifyResponse = {
  classified: ClassifiedCommitment[];
};

export const classifyRouter = Router();

classifyRouter.post("/", (_req, res) => {
  // TODO: implement in Phase 4
  const response: ClassifyResponse = { classified: [] };
  res.status(200).json(response);
});
