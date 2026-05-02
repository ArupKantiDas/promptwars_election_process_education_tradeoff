import type { ClassifiedCommitment } from "./types/pipeline";
import type { Issue, IssueId } from "./types/issues";
import { ISSUE_BY_ID } from "./types/issues";

// Frontend deterministic mirror of server/src/services/missing.ts. The
// matrix page already has the full classify output for each candidate
// (via the live pipeline in LiveMatrix), so re-running the entire
// extract+classify pipeline through /api/missing would be wasteful.
// This function produces an identical result to the server's
// detectMissingIssues from data we already have.
//
// If the server-side logic ever changes, this function must change in
// lockstep — covered by parity intent in the comment block of both.

export type FrontendMissingEntry = {
  issue: Issue;
};

export function computeMissingForCandidate(
  classified: readonly ClassifiedCommitment[],
  priorities: readonly IssueId[]
): FrontendMissingEntry[] {
  const addressed = new Set<IssueId>();
  for (const c of classified) {
    if (c.issueId !== null) addressed.add(c.issueId);
  }
  const seen = new Set<IssueId>();
  const out: FrontendMissingEntry[] = [];
  for (const p of priorities) {
    if (seen.has(p)) continue;
    seen.add(p);
    if (addressed.has(p)) continue;
    const issue = ISSUE_BY_ID[p];
    if (issue !== undefined) out.push({ issue });
  }
  return out;
}
