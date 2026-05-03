"use client";

import { useMemo } from "react";
import type { Candidate } from "@/lib/types/candidates";
import type { Issue } from "@/lib/types/issues";
import type { PhaseStatus } from "./LiveMatrix";

type Props = {
  candidates: readonly Candidate[];
  priorities: readonly Issue[];
  extractPhase: Record<string, PhaseStatus>;
  classifyPhase: Record<string, PhaseStatus>;
  scorePhase: Record<string, PhaseStatus>;
  done?: boolean;
};

const ARCHETYPE_ACCENT: Record<string, string> = {
  "welfare-expansion": "bg-rose-500",
  "market-reform": "bg-blue-500",
  "regional-identity": "bg-violet-500",
  "reformist-outsider": "bg-amber-500"
};

function StatusDot({ status }: { status: PhaseStatus }) {
  if (status === "ready") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white"
      >
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6.5 L5 9.5 L10 3.5" />
        </svg>
      </span>
    );
  }
  if (status === "loading") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 items-center justify-center"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4 animate-spin text-blue-600" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
          <path d="M8 2 a 6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white"
      >
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M3 3 L9 9 M9 3 L3 9" />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-4 w-4 items-center justify-center"
    >
      <span className="h-2 w-2 rounded-full border-2 border-slate-300 bg-white" />
    </span>
  );
}

function PhaseBar({
  done,
  total,
  toneClass = "bg-blue-600"
}: {
  done: number;
  total: number;
  toneClass?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full ${toneClass} transition-all duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function pickActiveLabel(
  candidates: readonly Candidate[],
  priorities: readonly Issue[],
  extractPhase: Record<string, PhaseStatus>,
  classifyPhase: Record<string, PhaseStatus>,
  scorePhase: Record<string, PhaseStatus>
): string {
  // Score in flight wins (it's the latest phase). Then classify. Then extract.
  for (const p of priorities) {
    if (scorePhase[p.id] === "loading") {
      return `Scoring all four candidates on ${p.label}…`;
    }
  }
  for (const c of candidates) {
    if (classifyPhase[c.id] === "loading") {
      return `Classifying ${c.name.split(" ")[0]}'s commitments…`;
    }
  }
  for (const c of candidates) {
    if (extractPhase[c.id] === "loading") {
      return `Reading ${c.name.split(" ")[0]}'s manifesto…`;
    }
  }
  // Nothing loading right now (transient state between phases)
  const allExtractDone = candidates.every((c) => extractPhase[c.id] === "ready");
  const allClassifyDone = candidates.every((c) => classifyPhase[c.id] === "ready");
  if (!allExtractDone) return "Reading manifestos from Vertex AI Search…";
  if (!allClassifyDone) return "Classifying commitments against the canonical taxonomy…";
  return "Scoring against the five-dimension rubric…";
}

export function PipelineProgress({
  candidates,
  priorities,
  extractPhase,
  classifyPhase,
  scorePhase,
  done = false
}: Props) {
  const extractDone = candidates.filter(
    (c) => extractPhase[c.id] === "ready" || extractPhase[c.id] === "error"
  ).length;
  const classifyDone = candidates.filter(
    (c) => classifyPhase[c.id] === "ready" || classifyPhase[c.id] === "error"
  ).length;
  const scoreDone = priorities.filter(
    (p) => scorePhase[p.id] === "ready" || scorePhase[p.id] === "error"
  ).length;

  const activeLabel = useMemo(
    () => pickActiveLabel(candidates, priorities, extractPhase, classifyPhase, scorePhase),
    [candidates, priorities, extractPhase, classifyPhase, scorePhase]
  );

  return (
    <section
      aria-labelledby="pipeline-progress-heading"
      aria-live="polite"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
    >
      <header className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
        <div className="min-w-0">
          <h2
            id="pipeline-progress-heading"
            className="text-[15px] font-semibold tracking-tight text-slate-900"
          >
            {done ? "Comparison ready" : "Building your matrix"}
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-600" role="status">
            {done ? "All cells scored — scroll to explore." : activeLabel}
          </p>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-emerald-800 ring-1 ring-emerald-200">
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6.5 L5 9.5 L10 3.5" />
            </svg>
            done
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-blue-800 ring-1 ring-blue-100">
            <svg viewBox="0 0 16 16" className="h-3 w-3 animate-spin" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
              <path d="M8 2 a 6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            live
          </span>
        )}
      </header>
      <div className="grid gap-4 p-5 md:grid-cols-3">
        {/* Extract */}
        <PhaseBlock
          stepNum={1}
          stepLabel="Extract"
          subLabel="Reading manifestos"
          done={extractDone}
          total={candidates.length}
          unitSingular="candidate"
        >
          <ul role="list" className="space-y-1.5">
            {candidates.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <StatusDot status={extractPhase[c.id] ?? "pending"} />
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${ARCHETYPE_ACCENT[c.archetype] ?? "bg-slate-400"}`}
                />
                <span className="truncate text-[12px] font-medium text-slate-700">
                  {c.name.split(" ")[0]}
                </span>
              </li>
            ))}
          </ul>
        </PhaseBlock>

        {/* Classify */}
        <PhaseBlock
          stepNum={2}
          stepLabel="Classify"
          subLabel="Mapping to canonical issues"
          done={classifyDone}
          total={candidates.length}
          unitSingular="candidate"
        >
          <ul role="list" className="space-y-1.5">
            {candidates.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <StatusDot status={classifyPhase[c.id] ?? "pending"} />
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${ARCHETYPE_ACCENT[c.archetype] ?? "bg-slate-400"}`}
                />
                <span className="truncate text-[12px] font-medium text-slate-700">
                  {c.name.split(" ")[0]}
                </span>
              </li>
            ))}
          </ul>
        </PhaseBlock>

        {/* Score */}
        <PhaseBlock
          stepNum={3}
          stepLabel="Score"
          subLabel="Five-dimension rubric"
          done={scoreDone}
          total={priorities.length}
          unitSingular="issue"
        >
          <ul role="list" className="space-y-1.5">
            {priorities.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <StatusDot status={scorePhase[p.id] ?? "pending"} />
                <span className="truncate text-[12px] font-medium text-slate-700">
                  {p.label}
                </span>
              </li>
            ))}
          </ul>
        </PhaseBlock>
      </div>
    </section>
  );
}

type PhaseBlockProps = {
  stepNum: 1 | 2 | 3;
  stepLabel: string;
  subLabel: string;
  done: number;
  total: number;
  unitSingular: string;
  children: React.ReactNode;
};

function PhaseBlock({
  stepNum,
  stepLabel,
  subLabel,
  done,
  total,
  unitSingular,
  children
}: PhaseBlockProps) {
  const allDone = done === total && total > 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Step {stepNum}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold tracking-tight text-slate-900">
            {stepLabel}
          </p>
          <p className="text-[11px] text-slate-500">{subLabel}</p>
        </div>
        <span
          className={`font-mono text-[11px] tabular-nums ${
            allDone ? "text-emerald-700" : "text-slate-600"
          }`}
        >
          {done}/{total} {done === 1 ? unitSingular : `${unitSingular}s`}
        </span>
      </div>
      <div className="mt-2.5">
        <PhaseBar done={done} total={total} toneClass={allDone ? "bg-emerald-500" : "bg-blue-600"} />
      </div>
      <div className="mt-3 border-t border-slate-200/70 pt-2.5">{children}</div>
    </div>
  );
}
