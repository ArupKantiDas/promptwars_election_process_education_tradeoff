"use client";

import { useEffect, useRef } from "react";
import type { ScoredCommitment } from "@/lib/types/scoring";
import { DIMENSION_META, DIMENSION_ORDER } from "@/lib/types/scoring";
import { RubricBadge } from "./RubricBadge";

type Props = {
  open: boolean;
  commitment: ScoredCommitment | null;
  candidateName: string;
  issueLabel: string;
  onClose: () => void;
};

export function RubricDimensionDetail({
  open,
  commitment,
  candidateName,
  issueLabel,
  onClose
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (commitment === null) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="rubric-detail-heading"
      onClose={onClose}
      className="w-full max-w-2xl rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/70 px-6 py-4">
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
            {issueLabel}
          </p>
          <h2
            id="rubric-detail-heading"
            className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900"
          >
            Rubric breakdown
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-600">
            {candidateName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close rubric breakdown"
          className="-mr-1 -mt-1 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </header>
      <div className="space-y-5 px-6 py-5">
        <section aria-labelledby="commitment-text-heading">
          <h3
            id="commitment-text-heading"
            className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500"
          >
            Commitment text
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-800">
            {commitment.text}
          </p>
        </section>
        <section aria-labelledby="dimensions-heading">
          <h3
            id="dimensions-heading"
            className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500"
          >
            Five-dimension rubric
          </h3>
          <ul role="list" className="mt-3 space-y-3">
            {DIMENSION_ORDER.map((dim) => {
              const d = commitment.dimensions[dim];
              const meta = DIMENSION_META[dim];
              return (
                <li
                  key={dim}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-[14px] font-semibold tracking-tight text-slate-900">
                      {meta.label}
                    </h4>
                    <RubricBadge score={d.score} dimensionLabel={meta.label} />
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
                    {meta.description}
                  </p>
                  <figure className="mt-2.5 rounded-md border-l-[3px] border-blue-500 bg-blue-50/70 px-3 py-2">
                    <figcaption className="text-[9.5px] font-semibold uppercase tracking-wider text-blue-700">
                      Triggering text span (verbatim)
                    </figcaption>
                    <blockquote className="mt-1 text-[12px] italic leading-relaxed text-slate-800">
                      &ldquo;{d.triggering_span || "[span will appear once /api/score validates a verbatim substring match]"}&rdquo;
                    </blockquote>
                  </figure>
                </li>
              );
            })}
          </ul>
        </section>
        {!commitment.verified && (
          <p
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] font-medium text-amber-800"
          >
            One or more triggering spans failed substring validation against the source manifesto. Marked unverified per AGENTS.md.
          </p>
        )}
      </div>
    </dialog>
  );
}
