"use client";

import { useMemo, useState } from "react";
import type { Issue, IssueId } from "@/lib/types/issues";
import { CANONICAL_ISSUES, ISSUE_BY_ID } from "@/lib/types/issues";

const MAX_PRIORITIES = 5;

type Props = {
  initialPriorities?: readonly IssueId[];
  // Called with the ordered list of selected priority IDs whenever the user
  // changes the ranking. Form-submit handling is the parent's responsibility.
  onChange?: (priorities: readonly IssueId[]) => void;
};

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
        <h3 id="available-issues-heading" className="text-sm font-semibold text-slate-800">
          Available issues
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {ranked.length < MAX_PRIORITIES
            ? `Add ${MAX_PRIORITIES - ranked.length} more to complete your top ${MAX_PRIORITIES}.`
            : `You have selected ${MAX_PRIORITIES} priorities. Remove one to add another.`}
        </p>
        <ul role="list" className="mt-3 space-y-2">
          {available.length === 0 ? (
            <li className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              All issues have been added to your ranking.
            </li>
          ) : (
            available.map((i) => (
              <li key={i.id} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-grow">
                    <h4 className="text-sm font-medium text-slate-900">{i.label}</h4>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{i.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(i.id)}
                    disabled={ranked.length >= MAX_PRIORITIES}
                    className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    aria-label={`Add ${i.label} to ranked priorities`}
                  >
                    Add
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
      <section aria-labelledby="ranked-priorities-heading">
        <h3 id="ranked-priorities-heading" className="text-sm font-semibold text-slate-800">
          Your ranked priorities ({ranked.length}/{MAX_PRIORITIES})
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Drag to reorder, or use the move-up/move-down buttons. Position #1 is your highest priority.
        </p>
        <ol role="list" className="mt-3 space-y-2">
          {ranked.length === 0 ? (
            <li className="rounded border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
              No priorities selected yet. Add up to {MAX_PRIORITIES} from the list on the left.
            </li>
          ) : (
            ranked.map((id, idx) => {
              const issue = ISSUE_BY_ID[id];
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
                  className="cursor-grab rounded-md border border-slate-200 bg-white p-3 active:cursor-grabbing"
                  aria-label={`Priority ${idx + 1}: ${issue.label}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700"
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-grow">
                      <h4 className="text-sm font-medium text-slate-900">{issue.label}</h4>
                      <p className="mt-0.5 text-xs leading-snug text-slate-500">{issue.description}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      aria-label={`Move ${issue.label} up`}
                    >
                      ↑ Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(idx)}
                      disabled={idx === ranked.length - 1}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      aria-label={`Move ${issue.label} down`}
                    >
                      ↓ Down
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(id)}
                      className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
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
