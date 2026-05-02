import type { Candidate } from "@/lib/types/candidates";
import type { Issue } from "@/lib/types/issues";

export type MissingEntry = {
  candidate: Candidate;
  issue: Issue;
};

type Props = {
  missing: readonly MissingEntry[];
  candidate?: Candidate | undefined;
};

export function MissingPanel({ missing, candidate }: Props) {
  const heading = candidate ? `What ${candidate.name} did not address` : "What's missing";

  if (missing.length === 0) {
    return (
      <section
        aria-labelledby={`missing-heading-${candidate?.id ?? "all"}`}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
      >
        <h2
          id={`missing-heading-${candidate?.id ?? "all"}`}
          className="text-[15px] font-semibold tracking-tight text-slate-900"
        >
          {heading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {candidate
            ? `${candidate.name} addressed all of your top priorities with at least one classified commitment.`
            : "The What's Missing panel will list the user's top 3 priorities that this candidate did not address with any classified commitment."}
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`missing-heading-${candidate?.id ?? "all"}`}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
        <div>
          <h2
            id={`missing-heading-${candidate?.id ?? "all"}`}
            className="text-[15px] font-semibold tracking-tight text-slate-900"
          >
            {heading}
          </h2>
          <p className="mt-0.5 text-[11.5px] text-slate-500">
            From your top three priorities, not addressed by any classified commitment.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-[10.5px] font-bold tabular-nums text-amber-800 ring-1 ring-amber-200">
          {missing.length} missing
        </span>
      </div>
      <ul role="list" className="grid gap-3 p-4 sm:grid-cols-3">
        {missing.slice(0, 3).map((m) => (
          <li
            key={`${m.candidate.id}-${m.issue.id}`}
            className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5"
          >
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-500" />
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-amber-700">
                Not addressed
              </p>
            </div>
            <h3 className="mt-1.5 text-[14px] font-semibold tracking-tight text-amber-900">
              {m.issue.label}
            </h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-amber-800">
              {m.candidate.name} did not address this priority in any classified commitment.
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
