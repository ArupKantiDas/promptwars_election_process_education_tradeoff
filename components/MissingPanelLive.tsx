"use client";

import { useEffect, useState } from "react";
import type { Candidate } from "@/lib/types/candidates";
import type { IssueId } from "@/lib/types/issues";
import { ISSUE_BY_ID } from "@/lib/types/issues";
import { MissingPanel, type MissingEntry } from "./MissingPanel";

type State =
  | { status: "loading" }
  | { status: "ready"; entries: MissingEntry[] }
  | { status: "error"; message: string };

type Props = {
  candidate: Candidate;
  priorities: readonly IssueId[];
};

// Client wrapper that calls POST /api/missing on mount and renders the
// resolved MissingPanel. The endpoint runs extract → classify → detect
// server-side; this component is the thin presentation layer.
//
// Loading and error states live here; the MissingPanel itself is a pure
// display component shared with the matrix page.
export function MissingPanelLive({ candidate, priorities }: Props) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const top3 = priorities.slice(0, 3);
    if (top3.length === 0) {
      setState({ status: "ready", entries: [] });
      return () => controller.abort();
    }
    setState({ status: "loading" });
    fetch("/api/missing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: candidate.id, priorities: top3 }),
      signal: controller.signal
    })
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`HTTP ${r.status}: ${text}`);
        }
        return r.json() as Promise<{ candidateId: string; missingIssues: { issueId: string; label: string }[] }>;
      })
      .then((body) => {
        const entries: MissingEntry[] = [];
        for (const m of body.missingIssues) {
          const issue = ISSUE_BY_ID[m.issueId as IssueId];
          if (issue !== undefined) entries.push({ candidate, issue });
        }
        setState({ status: "ready", entries });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "unknown_error";
        setState({ status: "error", message });
      });
    return () => controller.abort();
  }, [candidate, priorities]);

  if (state.status === "loading") {
    return (
      <section
        aria-labelledby={`missing-loading-${candidate.id}`}
        className="rounded-lg border border-slate-200 bg-white p-4"
      >
        <h2 id={`missing-loading-${candidate.id}`} className="text-sm font-semibold text-slate-800">
          What {candidate.name} did not address
        </h2>
        <p className="mt-2 text-sm text-slate-500" role="status">
          Computing…
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section
        aria-labelledby={`missing-error-${candidate.id}`}
        className="rounded-lg border border-red-200 bg-red-50 p-4"
      >
        <h2 id={`missing-error-${candidate.id}`} className="text-sm font-semibold text-red-900">
          What {candidate.name} did not address
        </h2>
        <p className="mt-2 text-xs text-red-800" role="alert">
          Could not load missing-issue analysis: {state.message}
        </p>
      </section>
    );
  }

  return <MissingPanel candidate={candidate} missing={state.entries} />;
}
