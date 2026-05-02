import Link from "next/link";
import { LiveMatrix } from "@/components/LiveMatrix";
import { CANDIDATES } from "@/lib/types/candidates";
import { CANONICAL_ISSUES, ISSUE_BY_ID } from "@/lib/types/issues";
import type { IssueId } from "@/lib/types/issues";

const MATRIX_ROWS = 5;

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
    if (out.length === MATRIX_ROWS) break;
  }
  return out;
}

type Props = {
  searchParams: { priorities?: string | string[]; state?: string; constituency?: string };
};

export default function MatrixPage({ searchParams }: Props) {
  const priorityIds = parsePriorities(searchParams.priorities);
  const priorities = priorityIds.map((id) => ISSUE_BY_ID[id]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Comparison matrix
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700">
            Scored commitments side by side, clustered by your ranked priorities. Each cell populates independently as <code className="rounded bg-slate-100 px-1 text-xs">/api/score</code> returns data; cells that show &ldquo;Not addressed&rdquo; mean the candidate had no commitment classified into that issue.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-blue-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          ← Edit priorities
        </Link>
      </header>
      {priorities.length === 0 ? (
        <section
          aria-labelledby="empty-state-heading"
          className="mt-8 rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center"
        >
          <h2 id="empty-state-heading" className="text-base font-semibold text-slate-800">
            No priorities selected
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Pick your top issues on the landing page to see the comparison matrix populate.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Pick priorities
          </Link>
        </section>
      ) : (
        <div className="mt-6">
          <LiveMatrix candidates={CANDIDATES} priorities={priorities} />
        </div>
      )}
    </main>
  );
}
