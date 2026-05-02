import type { IssueId } from "./issues";
import type { ScoredCommitment } from "./scoring";

// Frontend mirrors of the wire types returned by /api/extract,
// /api/classify, and /api/score. Kept here to avoid coupling the frontend
// to the server's internal type names.

export type ExtractedCommitment = {
  text: string;
  page: number;
  paragraph: number;
};

export type ClassifiedCommitment = {
  text: string;
  page: number;
  paragraph: number;
  issueId: IssueId | null;
  confidence: number;
};

export type ScoreInputCommitment = {
  candidateId: string;
  text: string;
  issueId: IssueId;
};

// Per-cell state in the live matrix. A cell is one (issue, candidate) pair.
// `loading` covers both pre-classify and post-classify-but-pre-score; the
// LiveMatrix orchestrator does not distinguish them in the UI.
// `empty` means the candidate had no commitment classified into this issue —
// rendered as the visually-distinct "Not addressed" placeholder.
// `scored` means /api/score returned for this issue and we have at least one
// scored commitment for this candidate on it.
export type CellState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "scored"; commitment: ScoredCommitment };
