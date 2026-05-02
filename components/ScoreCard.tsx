import type { CellState } from "@/lib/types/pipeline";
import type { ScoredCommitment } from "@/lib/types/scoring";
import { DIMENSION_META, DIMENSION_ORDER } from "@/lib/types/scoring";
import { RubricBadge } from "./RubricBadge";

type Props = {
  cell: CellState;
  candidateName: string;
  onOpenDetail?: ((commitment: ScoredCommitment) => void) | undefined;
};

// Three visually distinct states: loading skeleton, "Not addressed"
// dashed-border placeholder, and a populated card. The three states are
// kept distinguishable on a glance — loading uses a soft pulse, empty uses
// a dashed border + slate background, scored uses a solid border + white.
export function ScoreCard({ cell, candidateName, onOpenDetail }: Props) {
  if (cell.kind === "loading") {
    return (
      <article
        aria-label={`${candidateName}: loading score`}
        aria-busy="true"
        className="flex h-full min-h-[140px] flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
      >
        <div className="flex flex-grow flex-col gap-2">
          <div className="h-2.5 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-2.5 w-11/12 animate-pulse rounded bg-slate-200" />
          <div className="h-2.5 w-2/3 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="mt-2 space-y-1">
          {DIMENSION_ORDER.map((dim) => (
            <div key={dim} className="flex items-center justify-between gap-2">
              <div className="h-2 w-16 animate-pulse rounded bg-slate-100" />
              <div className="h-2 w-12 animate-pulse rounded bg-slate-100" />
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
        className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-center"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Not addressed</p>
        <p className="mt-1 text-[11px] text-slate-400">No commitment classified into this issue</p>
      </article>
    );
  }

  const commitment = cell.commitment;
  const handleClick = onOpenDetail ? () => onOpenDetail(commitment) : undefined;

  return (
    <article
      aria-label={`${candidateName} commitment, click to view rubric breakdown`}
      className="flex h-full min-h-[140px] flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
    >
      <p className="line-clamp-3 flex-grow text-xs leading-snug text-slate-800">
        {commitment.text}
      </p>
      <ul aria-label="Rubric scores" className="mt-2 grid grid-cols-1 gap-1">
        {DIMENSION_ORDER.map((dim) => (
          <li key={dim} className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
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
      {handleClick !== undefined && (
        <button
          type="button"
          onClick={handleClick}
          className="mt-2 self-start text-[11px] font-medium text-blue-600 underline-offset-2 hover:underline focus:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          aria-label={`Open rubric breakdown for ${candidateName}'s commitment`}
        >
          View rubric breakdown →
        </button>
      )}
      {!commitment.verified && (
        <p
          role="status"
          className="mt-2 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700"
        >
          Span unverified
        </p>
      )}
    </article>
  );
}
