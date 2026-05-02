"use client";

import { useState } from "react";
import type { Candidate } from "@/lib/types/candidates";
import type { Issue } from "@/lib/types/issues";
import type { CellState } from "@/lib/types/pipeline";
import type { ScoredCommitment } from "@/lib/types/scoring";
import { ScoreCard } from "./ScoreCard";
import { RubricDimensionDetail } from "./RubricDimensionDetail";

type Props = {
  candidates: readonly Candidate[];
  priorities: readonly Issue[];
  cells: Readonly<Record<string, Readonly<Record<string, CellState>>>>;
};

type DetailState =
  | { open: false }
  | { open: true; commitment: ScoredCommitment; candidateName: string; issueLabel: string };

const ARCHETYPE_ACCENT: Record<string, string> = {
  "welfare-expansion": "bg-rose-500",
  "market-reform": "bg-blue-500",
  "regional-identity": "bg-violet-500",
  "reformist-outsider": "bg-amber-500"
};

export function MatrixGrid({ candidates, priorities, cells }: Props) {
  const [detail, setDetail] = useState<DetailState>({ open: false });

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
        <div
          role="table"
          aria-label="Candidate commitments by issue priority"
          className="grid w-full"
          style={{
            gridTemplateColumns: `minmax(160px, 200px) repeat(${candidates.length}, minmax(200px, 1fr))`
          }}
        >
          <div role="row" className="contents">
            <div
              role="columnheader"
              className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
            >
              Issue priority
            </div>
            {candidates.map((c) => {
              const accent = ARCHETYPE_ACCENT[c.archetype] ?? "bg-slate-400";
              return (
                <div
                  key={c.id}
                  role="columnheader"
                  className="border-b border-r border-slate-200 bg-slate-50 px-4 py-3 last:border-r-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rounded-full ${accent}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold tracking-tight text-slate-900">
                        {c.name}
                      </p>
                      <p className="truncate text-[11px] font-medium text-slate-500">
                        {c.party}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {priorities.map((issue, rowIdx) => (
            <div role="row" key={issue.id} className="contents">
              <div
                role="rowheader"
                className={`sticky left-0 z-10 border-r border-slate-200 bg-slate-50/70 px-4 py-3.5 ${
                  rowIdx < priorities.length - 1 ? "border-b" : ""
                }`}
              >
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Priority {rowIdx + 1}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold leading-tight tracking-tight text-slate-900">
                  {issue.label}
                </p>
              </div>
              {candidates.map((c) => {
                const cell: CellState =
                  cells[issue.id]?.[c.id] ?? { kind: "loading" };
                return (
                  <div
                    key={`${issue.id}-${c.id}`}
                    role="cell"
                    className={`border-r border-slate-200 bg-white p-2.5 last:border-r-0 ${
                      rowIdx < priorities.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <ScoreCard
                      cell={cell}
                      candidateName={c.name}
                      onOpenDetail={
                        cell.kind === "scored"
                          ? (cm) =>
                              setDetail({
                                open: true,
                                commitment: cm,
                                candidateName: c.name,
                                issueLabel: issue.label
                              })
                          : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <RubricDimensionDetail
        open={detail.open}
        commitment={detail.open ? detail.commitment : null}
        candidateName={detail.open ? detail.candidateName : ""}
        issueLabel={detail.open ? detail.issueLabel : ""}
        onClose={() => setDetail({ open: false })}
      />
    </>
  );
}
