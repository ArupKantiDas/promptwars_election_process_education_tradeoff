"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Candidate } from "@/lib/types/candidates";
import type { Issue, IssueId } from "@/lib/types/issues";
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
// On mount: fires extract → classify in parallel for all four candidates.
// Once all four classifications complete, fires /api/score in parallel
// per priority (each batch contains all four candidates' commitments
// classified into that issue). Cells stream into the matrix as scores
// resolve. The "What's Missing" panel renders below once classification
// completes for all four — derived deterministically from the classify
// data already in memory (no /api/missing call needed; the same
// set-difference logic that the server uses is mirrored in lib/missing.ts).

type ClassifyState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; classified: ClassifiedCommitment[] };

type ScoreState =
  | { status: "pending" } // classify still in flight
  | { status: "loading" } // /api/score in flight
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

  // One AbortController per component instance, aborted on unmount.
  const abortRef = useRef<AbortController | null>(null);
  if (abortRef.current === null) abortRef.current = new AbortController();
  // Tracks which issues have already had a score call kicked off, so the
  // score-effect (which re-runs as classify state evolves) does not double-fire.
  const scoreKickedOffRef = useRef<Set<IssueId>>(new Set());

  useEffect(() => {
    const controller = abortRef.current;
    return () => {
      controller?.abort();
    };
  }, []);

  // Step 1 — extract → classify in parallel per candidate.
  useEffect(() => {
    const signal = abortRef.current?.signal;
    for (const c of candidates) {
      void (async () => {
        try {
          const extracted = await apiExtract(c.id, signal);
          const classified = await apiClassify(extracted, signal);
          if (signal?.aborted === true) return;
          setClassifyByCandidate((prev) => ({
            ...prev,
            [c.id]: { status: "ready", classified }
          }));
        } catch (err) {
          if (signal?.aborted === true) return;
          const message = err instanceof Error ? err.message : "unknown_error";
          setClassifyByCandidate((prev) => ({
            ...prev,
            [c.id]: { status: "error", message }
          }));
        }
      })();
    }
    // candidates is stable (frozen const at module scope); deps only listed for lint.
  }, [candidates]);

  // Step 2 — once every candidate's classify resolves (success OR error),
  // fire /api/score per priority. The score batch for issue X contains every
  // (candidate, commitment) pair where the commitment was classified into X.
  // Issues with an empty batch are marked ready immediately (no score call).
  useEffect(() => {
    const allClassifyResolved = candidates.every((c) => {
      const s = classifyByCandidate[c.id];
      return s?.status === "ready" || s?.status === "error";
    });
    if (!allClassifyResolved) return;
    const signal = abortRef.current?.signal;

    for (const priority of priorities) {
      if (scoreKickedOffRef.current.has(priority.id)) continue;
      scoreKickedOffRef.current.add(priority.id);

      const batch: ScoreInputCommitment[] = [];
      for (const c of candidates) {
        const cs = classifyByCandidate[c.id];
        if (cs?.status !== "ready") continue;
        for (const cm of cs.classified) {
          if (cm.issueId === priority.id) {
            batch.push({ candidateId: c.id, text: cm.text, issueId: priority.id });
          }
        }
      }

      if (batch.length === 0) {
        setScoreByIssue((prev) => ({
          ...prev,
          [priority.id]: { status: "ready", scored: [] }
        }));
        continue;
      }

      setScoreByIssue((prev) => ({ ...prev, [priority.id]: { status: "loading" } }));
      apiScore(priority.id, batch, signal)
        .then((scored) => {
          if (signal?.aborted === true) return;
          setScoreByIssue((prev) => ({
            ...prev,
            [priority.id]: { status: "ready", scored }
          }));
        })
        .catch((err: unknown) => {
          if (signal?.aborted === true) return;
          const message = err instanceof Error ? err.message : "unknown_error";
          setScoreByIssue((prev) => ({
            ...prev,
            [priority.id]: { status: "error", message }
          }));
        });
    }
  }, [classifyByCandidate, candidates, priorities]);

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

  // Derive missing-panel data deterministically from the classify output.
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
