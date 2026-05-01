import Link from "next/link";
import { MissingPanel } from "@/components/MissingPanel";
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
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">What&apos;s missing</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-700">
          For each candidate, this panel will list any of your top {TOP_PRIORITIES_FOR_MISSING} priorities they did not address with a classified commitment. The detection runs deterministically from the pass-two classification output — the model is never asked &ldquo;is this issue missing?&rdquo;
        </p>
      </header>
      {top.length === 0 ? (
        <section
          aria-labelledby="empty-missing-heading"
          className="mt-8 rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center"
        >
          <h2 id="empty-missing-heading" className="text-base font-semibold text-slate-800">
            No priorities selected
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Pick your top issues on the landing page to see what each candidate did not address.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Pick priorities
          </Link>
        </section>
      ) : (
        <section className="mt-6 space-y-4">
          {CANDIDATES.map((c) => (
            <MissingPanel key={c.id} candidate={c} missing={[]} />
          ))}
        </section>
      )}
    </main>
  );
}
