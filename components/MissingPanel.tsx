import type { Candidate } from "@/lib/types/candidates";
import type { Issue } from "@/lib/types/issues";

export type MissingEntry = {
  candidate: Candidate;
  issue: Issue;
};

type Props = {
  // Up to 3 missing entries per candidate (per spec). Empty array renders the
  // empty-state placeholder. Caller is responsible for trimming to top 3
  // priorities and only including issues the candidate did not address.
  missing: readonly MissingEntry[];
  candidate?: Candidate | undefined;
};

export function MissingPanel({ missing, candidate }: Props) {
  const heading = candidate
    ? `What ${candidate.name} did not address`
    : "What's missing";

  if (missing.length === 0) {
    return (
      <section aria-labelledby="missing-heading" className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 id="missing-heading" className="text-sm font-semibold text-slate-800">
          {heading}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          The What&apos;s Missing panel will list the user&apos;s top 3 priorities that this candidate did not address with any classified commitment. Currently empty: no classification data available yet.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="missing-heading" className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 id="missing-heading" className="text-sm font-semibold text-slate-800">
        {heading}
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Issues from the user&apos;s top three priorities not addressed by any classified commitment.
      </p>
      <ul role="list" className="mt-3 grid gap-3 sm:grid-cols-3">
        {missing.slice(0, 3).map((m) => (
          <li
            key={`${m.candidate.id}-${m.issue.id}`}
            className="rounded-md border-2 border-dashed border-amber-300 bg-amber-50 p-3"
          >
            <h3 className="text-sm font-semibold text-amber-900">{m.issue.label}</h3>
            <p className="mt-1 text-xs text-amber-800">
              {m.candidate.name} did not address this priority in any classified commitment.
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
