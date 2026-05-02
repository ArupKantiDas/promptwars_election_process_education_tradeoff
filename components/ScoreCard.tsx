import type { CellState } from "@/lib/types/pipeline";
import type { ScoredCommitment } from "@/lib/types/scoring";
import { DIMENSION_META, DIMENSION_ORDER } from "@/lib/types/scoring";
import { RubricBadge } from "./RubricBadge";

type Props = {
  cell: CellState;
  candidateName: string;
  onOpenDetail?: ((commitment: ScoredCommitment) => void) | undefined;
};

export function ScoreCard({ cell, candidateName, onOpenDetail }: Props) {
  if (cell.kind === "loading") {
    return (
      <article
        aria-label={`${candidateName}: loading score`}
        aria-busy="true"
        className="flex h-full min-h-[160px] flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-card"
      >
        <div className="flex flex-grow flex-col gap-2">
          <div className="h-2.5 w-full animate-pulse rounded-full bg-slate-200/80" />
          <div className="h-2.5 w-11/12 animate-pulse rounded-full bg-slate-200/70" />
          <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-slate-200/60" />
        </div>
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
          {DIMENSION_ORDER.map((dim) => (
            <div key={dim} className="flex items-center justify-between gap-2">
              <div className="h-2 w-16 animate-pulse rounded-full bg-slate-100" />
              <div className="h-3 w-20 animate-pulse rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
        <p className="sr-only" role="status">
          Loading score for {candidateName}…
        </p>
      </article>
    );
  }

  if (cell.kind === "empty") {
    return (
      <article
        aria-label={`${candidateName}: not addressed`}
        className="flex h-full min-h-[160px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3 text-center"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/70 text-slate-400"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
            <path
              d="M3 8h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Not addressed
        </p>
        <p className="text-[10px] leading-snug text-slate-400">
          No commitment classified into this issue
        </p>
      </article>
    );
  }

  const commitment = cell.commitment;
  const handleClick = onOpenDetail ? () => onOpenDetail(commitment) : undefined;

  return (
    <article
      aria-label={`${candidateName} commitment, click to view rubric breakdown`}
      className="group relative flex h-full min-h-[160px] flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-lifted"
    >
      <p className="line-clamp-3 flex-grow text-[12.5px] font-medium leading-snug text-slate-800">
        {commitment.text}
      </p>
      <ul
        aria-label="Rubric scores"
        className="mt-3 grid grid-cols-1 gap-1 border-t border-slate-100 pt-2.5"
      >
        {DIMENSION_ORDER.map((dim) => (
          <li key={dim} className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {DIMENSION_META[dim].label}
            </span>
            <RubricBadge
              score={commitment.dimensions[dim].score}
              dimensionLabel={DIMENSION_META[dim].label}
              size="sm"
            />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-2">
        {handleClick !== undefined && (
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={`Open rubric breakdown for ${candidateName}'s commitment`}
          >
            View breakdown
            <span aria-hidden="true">→</span>
          </button>
        )}
        {!commitment.verified && (
          <span
            role="status"
            className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200"
          >
            Span unverified
          </span>
        )}
      </div>
    </article>
  );
}
