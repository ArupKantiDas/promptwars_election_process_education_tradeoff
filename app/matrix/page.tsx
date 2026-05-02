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
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10">
            Bhabanipur · 4 candidates · 5 priorities
          </p>
          <h1 className="mt-3 text-[2rem] font-bold leading-tight tracking-tightest text-slate-900 sm:text-[2.4rem]">
            Comparison matrix
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
            Scored commitments side by side, clustered by your ranked priorities. Cells populate independently as{" "}
            <code className="rounded bg-slate-100 px-1 font-mono text-[12px] font-medium text-slate-700">
              /api/score
            </code>{" "}
            returns data. Empty cells mean the candidate had no commitment classified into that issue.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span aria-hidden="true">←</span>
          Edit priorities
        </Link>
      </header>
      {priorities.length === 0 ? (
        <section
          aria-labelledby="empty-state-heading"
          className="mt-10 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center"
        >
          <h2 id="empty-state-heading" className="text-lg font-semibold tracking-tight text-slate-900">
            No priorities selected
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            Pick your top issues on the landing page to see the comparison matrix populate.
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
        <div className="mt-8">
          <LiveMatrix candidates={CANDIDATES} priorities={priorities} />
        </div>
      )}
    </main>
  );
}
