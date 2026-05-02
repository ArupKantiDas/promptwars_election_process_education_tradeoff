import type { ClassifiedCommitment } from "./classification.js";

// Phase 6 — deterministic "What's Missing" detector.
//
// Per AGENTS.md and the Phase 6 brief: the model is NOT called for this
// computation. The model's only role for missing-issue detection was the
// pass-two classification (Phase 4). Here we read that classified output
// and compute set-difference: which of the user's priority issues are not
// represented by any classified commitment for this candidate.
//
// This is pure logic: no I/O, no async, no model. Easy to unit-test.
// The HTTP wrapper (routes/missing.ts) is responsible for fetching the
// classified output and the issue label lookup before calling this.

export type IssueLookup = {
  byId: Readonly<Record<string, { id: string; label: string }>>;
};

export type MissingIssue = {
  issueId: string;
  label: string;
};

export function detectMissingIssues(
  classified: readonly ClassifiedCommitment[],
  priorities: readonly string[],
  taxonomy: IssueLookup
): MissingIssue[] {
  // Build the set of issues this candidate addressed (any commitment with a
  // non-null issueId). Null issueIds — commitments the classifier could not
  // map to any canonical issue — are excluded; they do not count as
  // "addressing" any priority.
  const addressed = new Set<string>();
  for (const c of classified) {
    if (c.issueId !== null) addressed.add(c.issueId);
  }

  const seen = new Set<string>();
  const missing: MissingIssue[] = [];
  for (const priority of priorities) {
    if (seen.has(priority)) continue;
    seen.add(priority);
    if (addressed.has(priority)) continue;
    const issue = taxonomy.byId[priority];
    if (issue === undefined) {
      // Priority is not in the canonical taxonomy; skip silently. Caller
      // should surface this as a request-validation error if needed.
      continue;
    }
    missing.push({ issueId: issue.id, label: issue.label });
  }
  return missing;
}
