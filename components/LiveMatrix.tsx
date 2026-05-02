"use client";

import { useEffect, useMemo, useState } from "react";
import type { Candidate } from "@/lib/types/candidates";
import type { Issue } from "@/lib/types/issues";
import type {
  CellState,
  ClassifiedCommitment,
  ScoreInputCommitment
} from "@/lib/types/pipeline";
import { DIMENSION_ORDER, type ScoredCommitment } from "@/lib/types/scoring";
import { apiClassify, apiExtract, apiScore } from "@/lib/api";
import { computeMissingForCandidate } from "@/lib/missing";
import { MatrixGrid } from "./MatrixGrid";
import { MissingPanel, type MissingEntry } from "./MissingPanel";

// Phase 7 — live matrix orchestrator.
//
// One useEffect runs the full pipeline: parallel extract+classify per
// candidate, then parallel /api/score per priority (each batch contains
// every (candidate, commitment) pair classified into that issue). Cells
// stream into the matrix as scores resolve. The "What's Missing" panel
// renders below once classification completes for all four — derived
// deterministically on the frontend from the classify data we already
// have (mirroring the server-side detector in lib/missing.ts).
//
// StrictMode-safe: the AbortController is created *inside* the effect, so
// each invocation gets a fresh one. StrictMode's first cleanup aborts the
// first controller; the second invocation creates a new controller and
// proceeds normally. The score phase reads from a local `classifyResults`
// Map (not React state) so it does not depend on a re-render firing first.

type ClassifyState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; classified: ClassifiedCommitment[] };

type ScoreState =
  | { status: "pending" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; scored: ScoredCommitment[] };

type Props = {
  candidates: readonly Candidate[];
  priorities: readonly Issue[];
};

const TOP_PRIORITIES_FOR_MISSING = 3;

function sumDimensions(c: ScoredCommitment): number {
  let s = 0;
  for (const d of DIMENSION_ORDER) s += c.dimensions[d].score;
  return s;
}

function initialClassifyState(candidates: readonly Candidate[]): Record<string, ClassifyState> {
  const out: Record<string, ClassifyState> = {};
  for (const c of candidates) out[c.id] = { status: "loading" };
  return out;
}

function initialScoreState(priorities: readonly Issue[]): Record<string, ScoreState> {
  const out: Record<string, ScoreState> = {};
  for (const p of priorities) out[p.id] = { status: "pending" };
  return out;
}

export function LiveMatrix({ candidates, priorities }: Props) {
  const [classifyByCandidate, setClassifyByCandidate] = useState<Record<string, ClassifyState>>(
    () => initialClassifyState(candidates)
  );
  const [scoreByIssue, setScoreByIssue] = useState<Record<string, ScoreState>>(() =>
    initialScoreState(priorities)
  );

  useEffect(() => {
    const controller = new AbortController();

    async function runPipeline(): Promise<void> {
      // Phase 1 — parallel extract+classify per candidate. Local Map captures
      // results so the score phase below can build batches without depending
      // on React state having flushed.
      const classifyResults = new Map<string, ClassifiedCommitment[]>();

      await Promise.all(
        candidates.map(async (c) => {
          try {
            const extracted = await apiExtract(c.id, controller.signal);
            const classified = await apiClassify(extracted, controller.signal);
            if (controller.signal.aborted) return;
            classifyResults.set(c.id, classified);
            setClassifyByCandidate((prev) => ({
              ...prev,
              [c.id]: { status: "ready", classified }
            }));
          } catch (err) {
            if (controller.signal.aborted) return;
            const message = err instanceof Error ? err.message : "unknown_error";
            setClassifyByCandidate((prev) => ({
              ...prev,
              [c.id]: { status: "error", message }
            }));
          }
        })
      );

      if (controller.signal.aborted) return;

      // Phase 2 — parallel /api/score per priority. Build each batch from the
      // local Map (skipping candidates whose classify errored out).
      await Promise.all(
        priorities.map(async (priority) => {
          const batch: ScoreInputCommitment[] = [];
          for (const c of candidates) {
            const classified = classifyResults.get(c.id);
            if (classified === undefined) continue;
            for (const cm of classified) {
              if (cm.issueId === priority.id) {
                batch.push({ candidateId: c.id, text: cm.text, issueId: priority.id });
              }
            }
          }

          if (batch.length === 0) {
            if (controller.signal.aborted) return;
            setScoreByIssue((prev) => ({
              ...prev,
              [priority.id]: { status: "ready", scored: [] }
            }));
            return;
          }

          try {
            setScoreByIssue((prev) => ({ ...prev, [priority.id]: { status: "loading" } }));
            const scored = await apiScore(priority.id, batch, controller.signal);
            if (controller.signal.aborted) return;
            setScoreByIssue((prev) => ({
              ...prev,
              [priority.id]: { status: "ready", scored }
            }));
          } catch (err) {
            if (controller.signal.aborted) return;
            const message = err instanceof Error ? err.message : "unknown_error";
            setScoreByIssue((prev) => ({
              ...prev,
              [priority.id]: { status: "error", message }
            }));
          }
        })
      );
    }

    void runPipeline();

    return () => {
      controller.abort();
    };
  }, [candidates, priorities]);

  // Derive per-cell display state.
  const cells = useMemo(() => {
    const result: Record<string, Record<string, CellState>> = {};
    for (const issue of priorities) {
      result[issue.id] = {};
      for (const c of candidates) {
        const cs = classifyByCandidate[c.id];
        if (cs === undefined || cs.status === "loading") {
          result[issue.id]![c.id] = { kind: "loading" };
          continue;
        }
        if (cs.status === "error") {
          result[issue.id]![c.id] = { kind: "empty" };
          continue;
        }
        const hasCommitment = cs.classified.some((cm) => cm.issueId === issue.id);
        if (!hasCommitment) {
          result[issue.id]![c.id] = { kind: "empty" };
          continue;
        }
        const ss = scoreByIssue[issue.id];
        if (ss === undefined || ss.status === "pending" || ss.status === "loading") {
          result[issue.id]![c.id] = { kind: "loading" };
          continue;
        }
        if (ss.status === "error") {
          result[issue.id]![c.id] = { kind: "empty" };
          continue;
        }
        const forCandidate = ss.scored.filter((s) => s.candidateId === c.id);
        if (forCandidate.length === 0) {
          result[issue.id]![c.id] = { kind: "empty" };
          continue;
        }
        const best = forCandidate.reduce((a, b) =>
          sumDimensions(b) > sumDimensions(a) ? b : a
        );
        result[issue.id]![c.id] = { kind: "scored", commitment: best };
      }
    }
    return result;
  }, [classifyByCandidate, scoreByIssue, candidates, priorities]);

  const missingByCandidate = useMemo(() => {
    const top = priorities.slice(0, TOP_PRIORITIES_FOR_MISSING).map((p) => p.id);
    const out: Record<string, MissingEntry[]> = {};
    for (const c of candidates) {
      const cs = classifyByCandidate[c.id];
      if (cs?.status !== "ready") {
        out[c.id] = [];
        continue;
      }
      out[c.id] = computeMissingForCandidate(cs.classified, top).map((m) => ({
        candidate: c,
        issue: m.issue
      }));
    }
    return out;
  }, [classifyByCandidate, candidates, priorities]);

  const allClassifyReady = candidates.every(
    (c) => classifyByCandidate[c.id]?.status === "ready"
  );

  return (
    <>
      <MatrixGrid candidates={candidates} priorities={priorities} cells={cells} />
      <section aria-labelledby="missing-panels-heading" className="mt-8 space-y-4">
        <h2 id="missing-panels-heading" className="sr-only">
          What&apos;s missing per candidate
        </h2>
        {!allClassifyReady ? (
          <p
            role="status"
            className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500"
          >
            Computing &ldquo;What&apos;s missing&rdquo; once classification completes for all four candidates…
          </p>
        ) : (
          candidates.map((c) => (
            <MissingPanel
              key={c.id}
              candidate={c}
              missing={missingByCandidate[c.id] ?? []}
            />
          ))
        )}
      </section>
    </>
  );
}
