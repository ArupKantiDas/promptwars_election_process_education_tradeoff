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

export function RubricDimensionDetail({ open, commitment, candidateName, issueLabel, onClose }: Props) {
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
      className="w-full max-w-2xl rounded-lg p-0 backdrop:bg-slate-900/40"
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{issueLabel}</p>
          <h2 id="rubric-detail-heading" className="text-base font-semibold text-slate-900">
            Rubric breakdown — {candidateName}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close rubric breakdown"
          className="-mr-2 rounded p-1 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <div className="space-y-4 px-5 py-4">
        <section aria-labelledby="commitment-text-heading">
          <h3 id="commitment-text-heading" className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Commitment text
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-800">{commitment.text}</p>
        </section>
        <section aria-labelledby="dimensions-heading">
          <h3 id="dimensions-heading" className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Five-dimension rubric
          </h3>
          <ul role="list" className="mt-2 divide-y divide-slate-100">
            {DIMENSION_ORDER.map((dim) => {
              const d = commitment.dimensions[dim];
              const meta = DIMENSION_META[dim];
              return (
                <li key={dim} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-900">{meta.label}</h4>
                    <RubricBadge score={d.score} dimensionLabel={meta.label} />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{meta.description}</p>
                  <figure className="mt-2 rounded border-l-4 border-blue-400 bg-blue-50 px-3 py-2">
                    <figcaption className="text-[10px] font-medium uppercase tracking-wide text-blue-700">
                      Triggering text span (verbatim)
                    </figcaption>
                    <blockquote className="mt-1 text-xs italic text-slate-800">
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
            className="rounded bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
          >
            One or more triggering spans failed substring validation against the source manifesto. Marked unverified per AGENTS.md.
          </p>
        )}
      </div>
    </dialog>
  );
}
