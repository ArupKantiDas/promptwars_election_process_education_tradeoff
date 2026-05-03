"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Candidate } from "@/lib/types/candidates";
import type { Issue } from "@/lib/types/issues";
import type {
  CellState,
  ClassifiedCommitment,
  ScoreInputCommitment
} from "@/lib/types/pipeline";
import { DIMENSION_ORDER, type ScoredCommitment } from "@/lib/types/scoring";
import { apiClassifyBatched, apiExtract, apiScore } from "@/lib/api";
import { computeMissingForCandidate } from "@/lib/missing";
import {
  clearPipelineState,
  markPipelineComplete,
  readMatrixCache,
  writeMatrixCache,
  type MatrixCacheValue
} from "@/lib/pipelineStatus";
import { ElectionFacts } from "./ElectionFacts";
import { MatrixGrid } from "./MatrixGrid";
import { MatrixReadyBanner } from "./MatrixReadyBanner";
import { MissingPanel, type MissingEntry } from "./MissingPanel";
import { PipelineProgress } from "./PipelineProgress";

// PipelineProgress lifecycle after the pipeline finishes:
// 1. allCellsSettled flips true → switch to "done" header label.
// 2. Hold the done state for PROGRESS_DONE_HOLD_MS so the user notices it.
// 3. Apply opacity-0 → animate fade-out for PROGRESS_DONE_FADE_MS.
// 4. Unmount.
const PROGRESS_DONE_HOLD_MS = 2_000;
const PROGRESS_DONE_FADE_MS = 400;

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

type ExtractState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; count: number };

type ClassifyState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; classified: ClassifiedCommitment[] };

type ScoreState =
  | { status: "pending" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; scored: ScoredCommitment[] };

export type PhaseStatus = "pending" | "loading" | "ready" | "error";

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

function initialExtractState(candidates: readonly Candidate[]): Record<string, ExtractState> {
  const out: Record<string, ExtractState> = {};
  for (const c of candidates) out[c.id] = { status: "loading" };
  return out;
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
  const [extractByCandidate, setExtractByCandidate] = useState<Record<string, ExtractState>>(
    () => initialExtractState(candidates)
  );
  const [classifyByCandidate, setClassifyByCandidate] = useState<Record<string, ClassifyState>>(
    () => initialClassifyState(candidates)
  );
  const [scoreByIssue, setScoreByIssue] = useState<Record<string, ScoreState>>(() =>
    initialScoreState(priorities)
  );
  const [firstCellScored, setFirstCellScored] = useState(false);
  // PipelineProgress has its own visibility state machine because it
  // needs to linger for a beat after the pipeline finishes (so the user
  // sees the done state) and then fade out smoothly.
  const [progressPhase, setProgressPhase] = useState<"running" | "done" | "fading" | "hidden">(
    "running"
  );
  // Cached cells from a prior /matrix run with the same priority set.
  // When non-null, the live pipeline is skipped entirely — the cells
  // memo, MatrixGrid, and missing section all read from this instead.
  const [cachedCells, setCachedCells] = useState<MatrixCacheValue | null>(null);

  // Pipeline timing instrumentation. pipelineStartRef captures the moment
  // the effect runs (= first extract call); firstScoredAtRef captures the
  // moment the first scored cell becomes visible. Logged once per mount.
  const pipelineStartRef = useRef<number | null>(null);
  const firstScoredLoggedRef = useRef<boolean>(false);

  useEffect(() => {
    const priorityIds = priorities.map((p) => p.id);

    // Cache hit short-circuit: a prior /matrix run with this exact
    // priority set already produced settled cells. Hydrate state and
    // skip the pipeline. Banner is event-driven, so it stays hidden
    // (no PIPELINE_COMPLETE_EVENT is dispatched here — the user is
    // returning to a comparison they've already seen).
    const cached = readMatrixCache(priorityIds);
    if (cached !== null) {
      setCachedCells(cached);
      setProgressPhase("hidden");
      return;
    }

    // Fresh run. Wipe any completion / dismissal flags from a previous
    // session for this exact priority set so the banner only fires on
    // the PIPELINE_COMPLETE_EVENT dispatched by markPipelineComplete
    // during *this* mount.
    setCachedCells(null);
    setProgressPhase("running");
    clearPipelineState(priorityIds);

    const controller = new AbortController();
    pipelineStartRef.current = performance.now();
    firstScoredLoggedRef.current = false;

    async function runPipeline(): Promise<void> {
      // Phase 1 — parallel extract+classify per candidate. Local Map captures
      // results so the score phase below can build batches without depending
      // on React state having flushed. Classify is sub-batched on the
      // frontend (3 parallel /api/classify calls per candidate) so a single
      // candidate's classify completes in ~1/3 the wall time of one large
      // call. The server contract is unchanged — each sub-batch is a normal
      // /api/classify request.
      const classifyResults = new Map<string, ClassifiedCommitment[]>();

      await Promise.all(
        candidates.map(async (c) => {
          try {
            const extracted = await apiExtract(c.id, controller.signal);
            if (controller.signal.aborted) return;
            setExtractByCandidate((prev) => ({
              ...prev,
              [c.id]: { status: "ready", count: extracted.length }
            }));
            const classified = await apiClassifyBatched(extracted, controller.signal);
            if (controller.signal.aborted) return;
            classifyResults.set(c.id, classified);
            setClassifyByCandidate((prev) => ({
              ...prev,
              [c.id]: { status: "ready", classified }
            }));
          } catch (err) {
            if (controller.signal.aborted) return;
            const message = err instanceof Error ? err.message : "unknown_error";
            setExtractByCandidate((prev) => {
              const cur = prev[c.id];
              if (cur?.status === "ready") return prev;
              return { ...prev, [c.id]: { status: "error", message } };
            });
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

  // Derive per-cell display state from the live pipeline. On cache hit
  // we ignore this and read from cachedCells instead (see `cells` below).
  const livePipelineCells = useMemo(() => {
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

  const cells = cachedCells ?? livePipelineCells;

  const missingByCandidate = useMemo(() => {
    const top = priorities.slice(0, TOP_PRIORITIES_FOR_MISSING);
    const out: Record<string, MissingEntry[]> = {};

    // Cache-hit path: derive missing from settled cells. An "empty" cell
    // in a top-3 priority means the candidate has no scored commitment
    // for that issue. We only cache successful runs (no errors), so an
    // empty cell here unambiguously means "did not address" — same
    // semantics the live path computes via classifyByCandidate.
    if (cachedCells !== null) {
      for (const c of candidates) {
        const entries: MissingEntry[] = [];
        for (const p of top) {
          const cell = cachedCells[p.id]?.[c.id];
          if (cell?.kind === "empty") {
            entries.push({ candidate: c, issue: p });
          }
        }
        out[c.id] = entries;
      }
      return out;
    }

    // Live path: read directly from classify results, which distinguish
    // "no commitment classified" from "score errored after classify hit".
    const topIds = top.map((p) => p.id);
    for (const c of candidates) {
      const cs = classifyByCandidate[c.id];
      if (cs?.status !== "ready") {
        out[c.id] = [];
        continue;
      }
      out[c.id] = computeMissingForCandidate(cs.classified, topIds).map((m) => ({
        candidate: c,
        issue: m.issue
      }));
    }
    return out;
  }, [cachedCells, classifyByCandidate, candidates, priorities]);

  // On cache hit, classify state is empty but the missing section should
  // still render real entries instead of the "Computing…" placeholder.
  const allClassifyReady =
    cachedCells !== null ||
    candidates.every((c) => classifyByCandidate[c.id]?.status === "ready");

  // Pipeline is "complete" when every cell has settled into "scored" or
  // "empty" — no more loading states. NavBar reads this via sessionStorage
  // to decide whether to enable the "What's missing" link.
  const allCellsSettled = useMemo(() => {
    for (const issue of priorities) {
      for (const c of candidates) {
        const cell = cells[issue.id]?.[c.id];
        if (cell === undefined || cell.kind === "loading") return false;
      }
    }
    return true;
  }, [cells, priorities, candidates]);

  // Did any phase of the live pipeline end in error? Used to gate the
  // cache write — caching errored runs would hide real failures behind
  // an instant load on the next visit. Cache-hit runs don't reach this
  // path because allCellsSettled is computed from cached cells (no
  // errors possible).
  const livePipelineHadErrors = useMemo(() => {
    for (const c of candidates) {
      if (extractByCandidate[c.id]?.status === "error") return true;
      if (classifyByCandidate[c.id]?.status === "error") return true;
    }
    for (const p of priorities) {
      if (scoreByIssue[p.id]?.status === "error") return true;
    }
    return false;
  }, [extractByCandidate, classifyByCandidate, scoreByIssue, candidates, priorities]);

  useEffect(() => {
    if (!allCellsSettled) return;
    // Skip the "ready" beat + cache write when restoring from cache —
    // the user is returning to a comparison they've already seen.
    if (cachedCells !== null) {
      setProgressPhase("hidden");
      return;
    }
    markPipelineComplete(priorities.map((p) => p.id));
    if (!livePipelineHadErrors) {
      writeMatrixCache(priorities.map((p) => p.id), livePipelineCells);
    }
    setProgressPhase((prev) => (prev === "running" ? "done" : prev));
    const fadeStart = window.setTimeout(() => {
      setProgressPhase((prev) => (prev === "done" ? "fading" : prev));
    }, PROGRESS_DONE_HOLD_MS);
    const hide = window.setTimeout(() => {
      setProgressPhase((prev) => (prev === "fading" ? "hidden" : prev));
    }, PROGRESS_DONE_HOLD_MS + PROGRESS_DONE_FADE_MS);
    return () => {
      window.clearTimeout(fadeStart);
      window.clearTimeout(hide);
    };
  }, [allCellsSettled, priorities, cachedCells, livePipelineHadErrors, livePipelineCells]);

  // Detect first-scored-cell once per mount. Drives both the perf log and
  // the conditional collapse of the PipelineProgress / ElectionFacts panel.
  useEffect(() => {
    if (firstCellScored) return;
    if (pipelineStartRef.current === null) return;
    let firstFound = false;
    for (const issue of priorities) {
      for (const c of candidates) {
        if (cells[issue.id]?.[c.id]?.kind === "scored") {
          firstFound = true;
          break;
        }
      }
      if (firstFound) break;
    }
    if (!firstFound) return;
    if (!firstScoredLoggedRef.current) {
      const elapsedMs = performance.now() - pipelineStartRef.current;
      firstScoredLoggedRef.current = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[livematrix-perf] first scored cell at ${(elapsedMs / 1000).toFixed(2)}s`
      );
    }
    setFirstCellScored(true);
  }, [cells, priorities, candidates, firstCellScored]);

  // Derive simple PhaseStatus maps for PipelineProgress.
  const extractPhase = useMemo<Record<string, PhaseStatus>>(() => {
    const out: Record<string, PhaseStatus> = {};
    for (const c of candidates) out[c.id] = extractByCandidate[c.id]?.status ?? "loading";
    return out;
  }, [extractByCandidate, candidates]);

  const classifyPhase = useMemo<Record<string, PhaseStatus>>(() => {
    const out: Record<string, PhaseStatus> = {};
    for (const c of candidates) {
      const ext = extractByCandidate[c.id]?.status;
      const cls = classifyByCandidate[c.id]?.status;
      // Classify hasn't logically started until extract is done. Surface
      // "pending" until extract completes so the UI doesn't show four
      // candidates "classifying" at t=0.
      if (cls === "ready" || cls === "error") out[c.id] = cls;
      else if (ext === "ready") out[c.id] = "loading";
      else out[c.id] = "pending";
    }
    return out;
  }, [classifyByCandidate, extractByCandidate, candidates]);

  const scorePhase = useMemo<Record<string, PhaseStatus>>(() => {
    const out: Record<string, PhaseStatus> = {};
    for (const p of priorities) out[p.id] = scoreByIssue[p.id]?.status ?? "pending";
    return out;
  }, [scoreByIssue, priorities]);

  return (
    <>
      <MatrixReadyBanner priorityIds={priorities.map((p) => p.id)} />
      {progressPhase !== "hidden" && (
        <div
          className={`mb-6 grid gap-4 transition-opacity ease-out lg:grid-cols-[1.6fr_1fr] ${
            progressPhase === "fading" ? "opacity-0" : "opacity-100"
          }`}
          style={{ transitionDuration: `${PROGRESS_DONE_FADE_MS}ms` }}
          aria-hidden={progressPhase === "fading" ? "true" : undefined}
        >
          <PipelineProgress
            candidates={candidates}
            priorities={priorities}
            extractPhase={extractPhase}
            classifyPhase={classifyPhase}
            scorePhase={scorePhase}
            done={progressPhase === "done" || progressPhase === "fading"}
          />
          <ElectionFacts />
        </div>
      )}
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
