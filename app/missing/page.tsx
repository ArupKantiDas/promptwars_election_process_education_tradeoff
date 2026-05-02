import Link from "next/link";
import { MissingPanelLive } from "@/components/MissingPanelLive";
import { CANDIDATES } from "@/lib/types/candidates";
import { CANONICAL_ISSUES } from "@/lib/types/issues";
import type { IssueId } from "@/lib/types/issues";

const TOP_PRIORITIES_FOR_MISSING = 3;

function parsePriorities(raw: string | string[] | undefined): readonly IssueId[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  const validIds = new Set(CANONICAL_ISSUES.map((i) => i.id));
  const seen = new Set<IssueId>();
  const out: IssueId[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim() as IssueId;
    if (validIds.has(trimmed) && !seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
    if (out.length === TOP_PRIORITIES_FOR_MISSING) break;
  }
  return out;
}

type Props = {
  searchParams: { priorities?: string | string[] };
};

export default function MissingPage({ searchParams }: Props) {
  const top = parsePriorities(searchParams.priorities);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="border-b border-slate-200 pb-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-800 ring-1 ring-amber-200">
          Deterministic · No model call
        </p>
        <h1 className="mt-3 text-[2rem] font-bold leading-tight tracking-tightest text-slate-900 sm:text-[2.4rem]">
          What&apos;s missing
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-slate-600">
          For each candidate, this panel lists any of your top {TOP_PRIORITIES_FOR_MISSING} priorities they did not address with a classified commitment. The detection runs deterministically from the pass-two classification output — the model is never asked &ldquo;is this issue missing?&rdquo;
        </p>
      </header>
      {top.length === 0 ? (
        <section
          aria-labelledby="empty-missing-heading"
          className="mt-10 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center"
        >
          <h2 id="empty-missing-heading" className="text-lg font-semibold tracking-tight text-slate-900">
            No priorities selected
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            Pick your top issues on the landing page to see what each candidate did not address.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Pick priorities
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      ) : (
        <section className="mt-8 space-y-5">
          {CANDIDATES.map((c) => (
            <MissingPanelLive key={c.id} candidate={c} priorities={top} />
          ))}
        </section>
      )}
    </main>
  );
}
