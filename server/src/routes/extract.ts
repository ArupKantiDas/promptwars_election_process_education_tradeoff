import { Router } from "express";

// Contract (AGENTS.md → Endpoint contracts):
//   Request:  { candidateId: string }
//   Response: { commitments: [{ text: string, page: number, paragraph: number }] }

export type ExtractedCommitment = {
  text: string;
  page: number;
  paragraph: number;
};

export type ExtractResponse = {
  commitments: ExtractedCommitment[];
};

export const extractRouter = Router();

extractRouter.post("/", (_req, res) => {
  // TODO: implement in Phase 4
  const response: ExtractResponse = { commitments: [] };
  res.status(200).json(response);
});
