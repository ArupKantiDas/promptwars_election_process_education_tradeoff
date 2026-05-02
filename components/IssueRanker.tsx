"use client";

import { useMemo, useState } from "react";
import type { Issue, IssueId } from "@/lib/types/issues";
import { CANONICAL_ISSUES, ISSUE_BY_ID } from "@/lib/types/issues";

const MAX_PRIORITIES = 5;

type Props = {
  initialPriorities?: readonly IssueId[];
  onChange?: (priorities: readonly IssueId[]) => void;
};

const DragHandle = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className="h-4 w-4 text-slate-400 group-hover:text-slate-500"
    fill="currentColor"
  >
    <circle cx="6" cy="4" r="1.2" />
    <circle cx="6" cy="8" r="1.2" />
    <circle cx="6" cy="12" r="1.2" />
    <circle cx="10" cy="4" r="1.2" />
    <circle cx="10" cy="8" r="1.2" />
    <circle cx="10" cy="12" r="1.2" />
  </svg>
);

export function IssueRanker({ initialPriorities = [], onChange }: Props) {
  const [ranked, setRanked] = useState<readonly IssueId[]>(() =>
    initialPriorities.slice(0, MAX_PRIORITIES)
  );
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  const available = useMemo<readonly Issue[]>(() => {
    const rankedSet = new Set(ranked);
    return CANONICAL_ISSUES.filter((i) => !rankedSet.has(i.id));
  }, [ranked]);

  function commit(next: readonly IssueId[]) {
    setRanked(next);
    onChange?.(next);
  }

  function add(id: IssueId) {
    if (ranked.length >= MAX_PRIORITIES) return;
    if (ranked.includes(id)) return;
    commit([...ranked, id]);
  }

  function remove(id: IssueId) {
    commit(ranked.filter((r) => r !== id));
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    const next = [...ranked];
    const a = next[index - 1];
    const b = next[index];
    if (a === undefined || b === undefined) return;
    next[index - 1] = b;
    next[index] = a;
    commit(next);
  }

  function moveDown(index: number) {
    if (index >= ranked.length - 1) return;
    const next = [...ranked];
    const a = next[index];
    const b = next[index + 1];
    if (a === undefined || b === undefined) return;
    next[index] = b;
    next[index + 1] = a;
    commit(next);
  }

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    if (from >= ranked.length || to >= ranked.length) return;
    const next = [...ranked];
    const moved = next.splice(from, 1)[0];
    if (moved === undefined) return;
    next.splice(to, 0, moved);
    commit(next);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="available-issues-heading">
        <div className="flex items-baseline justify-between">
          <h3
            id="available-issues-heading"
            className="text-sm font-semibold tracking-tight text-slate-900"
          >
            Available issues
          </h3>
          <span className="font-mono text-[11px] tabular-nums text-slate-500">
            {available.length} of {CANONICAL_ISSUES.length}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          {ranked.length < MAX_PRIORITIES
            ? `Add ${MAX_PRIORITIES - ranked.length} more to complete your top ${MAX_PRIORITIES}.`
            : `You have selected ${MAX_PRIORITIES}. Remove one to add another.`}
        </p>
        <ul role="list" className="mt-3 space-y-2">
          {available.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
              All issues have been added to your ranking.
            </li>
          ) : (
            available.map((i) => (
              <li
                key={i.id}
                className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-card transition-all hover:border-slate-300 hover:shadow-card-lifted"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-grow">
                    <h4 className="text-[13px] font-semibold tracking-tight text-slate-900">
                      {i.label}
                    </h4>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
                      {i.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(i.id)}
                    disabled={ranked.length >= MAX_PRIORITIES}
                    className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={`Add ${i.label} to ranked priorities`}
                  >
                    + Add
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
      <section aria-labelledby="ranked-priorities-heading">
        <div className="flex items-baseline justify-between">
          <h3
            id="ranked-priorities-heading"
            className="text-sm font-semibold tracking-tight text-slate-900"
          >
            Your ranked priorities
          </h3>
          <span className="font-mono text-[11px] tabular-nums text-slate-500">
            {ranked.length} / {MAX_PRIORITIES}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Drag to reorder, or use the arrow buttons. Position #1 is your highest priority.
        </p>
        <ol role="list" className="mt-3 space-y-2">
          {ranked.length === 0 ? (
            <li className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
              <p className="text-[13px] font-semibold text-slate-700">
                No priorities selected yet
              </p>
              <p className="mt-1 text-[11.5px] text-slate-500">
                Add up to {MAX_PRIORITIES} from the list on the left to get started.
              </p>
            </li>
          ) : (
            ranked.map((id, idx) => {
              const issue = ISSUE_BY_ID[id];
              const isDragSource = dragSourceIndex === idx;
              return (
                <li
                  key={id}
                  draggable
                  onDragStart={() => setDragSourceIndex(idx)}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={() => {
                    if (dragSourceIndex !== null) reorder(dragSourceIndex, idx);
                    setDragSourceIndex(null);
                  }}
                  onDragEnd={() => setDragSourceIndex(null)}
                  className={`group cursor-grab rounded-xl border bg-white p-3.5 shadow-card transition-all active:cursor-grabbing ${
                    isDragSource
                      ? "border-blue-400 ring-2 ring-blue-100 opacity-60"
                      : "border-slate-200 hover:border-slate-300 hover:shadow-card-lifted"
                  }`}
                  aria-label={`Priority ${idx + 1}: ${issue.label}`}
                >
                  <div className="flex items-start gap-3">
                    <DragHandle />
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 font-mono text-[11px] font-bold text-white shadow-sm"
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-grow">
                      <h4 className="text-[13px] font-semibold tracking-tight text-slate-900">
                        {issue.label}
                      </h4>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
                        {issue.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-label={`Move ${issue.label} up`}
                    >
                      ↑ Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(idx)}
                      disabled={idx === ranked.length - 1}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      aria-label={`Move ${issue.label} down`}
                    >
                      ↓ Down
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(id)}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      aria-label={`Remove ${issue.label} from ranking`}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ol>
      </section>
    </div>
  );
}
