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
  // cells[issueId][candidateId] -> CellState ({loading|empty|scored}).
  // Cells with no entry default to {kind: "loading"}.
  cells: Readonly<Record<string, Readonly<Record<string, CellState>>>>;
};

type DetailState =
  | { open: false }
  | { open: true; commitment: ScoredCommitment; candidateName: string; issueLabel: string };

export function MatrixGrid({ candidates, priorities, cells }: Props) {
  const [detail, setDetail] = useState<DetailState>({ open: false });

  return (
    <>
      <div
        role="table"
        aria-label="Candidate commitments by issue priority"
        className="grid w-full overflow-x-auto rounded-lg border border-slate-200 bg-white"
        style={{
          gridTemplateColumns: `minmax(140px, 180px) repeat(${candidates.length}, minmax(180px, 1fr))`
        }}
      >
        <div role="row" className="contents">
          <div
            role="columnheader"
            className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Issue priority
          </div>
          {candidates.map((c) => (
            <div
              key={c.id}
              role="columnheader"
              className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 last:border-r-0"
            >
              <span className="block">{c.name}</span>
              <span className="block text-[10px] font-normal text-slate-500">{c.party}</span>
            </div>
          ))}
        </div>
        {priorities.map((issue, rowIdx) => (
          <div role="row" key={issue.id} className="contents">
            <div
              role="rowheader"
              className={`border-r border-slate-200 bg-slate-50 px-3 py-3 ${
                rowIdx < priorities.length - 1 ? "border-b" : ""
              }`}
            >
              <span className="block text-xs font-medium text-slate-800">
                #{rowIdx + 1} {issue.label}
              </span>
            </div>
            {candidates.map((c) => {
              const cell: CellState =
                cells[issue.id]?.[c.id] ?? { kind: "loading" };
              return (
                <div
                  key={`${issue.id}-${c.id}`}
                  role="cell"
                  className={`border-r border-slate-200 p-2 last:border-r-0 ${
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
