"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IssueId } from "@/lib/types/issues";
import { DEFAULT_CONSTITUENCY_ID, DEFAULT_STATE_CODE } from "@/lib/data/states";
import { IssueRanker } from "./IssueRanker";
import { StateConstituencySelector } from "./StateConstituencySelector";

const MIN_PRIORITIES_TO_SUBMIT = 3;
const MAX_PRIORITIES = 5;

export function LandingForm() {
  const router = useRouter();
  const [stateCode, setStateCode] = useState(DEFAULT_STATE_CODE);
  const [constituencyId, setConstituencyId] = useState(DEFAULT_CONSTITUENCY_ID);
  const [priorities, setPriorities] = useState<readonly IssueId[]>([]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (priorities.length < MIN_PRIORITIES_TO_SUBMIT) return;
    const params = new URLSearchParams({
      state: stateCode,
      constituency: constituencyId,
      priorities: priorities.join(",")
    });
    router.push(`/matrix?${params.toString()}`);
  }

  const canSubmit = priorities.length >= MIN_PRIORITIES_TO_SUBMIT;

  return (
    <form onSubmit={handleSubmit} className="space-y-8" aria-label="Choose your locale and priority issues">
      <section aria-labelledby="locale-heading" className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 id="locale-heading" className="text-base font-semibold text-slate-900">
          Where do you vote?
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          The state and constituency are real. The candidates and their parties contesting them in this demo are fictional.
        </p>
        <div className="mt-4">
          <StateConstituencySelector
            initialStateCode={stateCode}
            initialConstituencyId={constituencyId}
            onChange={(s, c) => {
              setStateCode(s);
              setConstituencyId(c);
            }}
          />
        </div>
      </section>
      <section aria-labelledby="priorities-heading" className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 id="priorities-heading" className="text-base font-semibold text-slate-900">
          Rank your top {MAX_PRIORITIES} issues
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Add issues you care about, then drag or use the buttons to put them in priority order. You can submit with as few as {MIN_PRIORITIES_TO_SUBMIT} selected; the matrix will show {MAX_PRIORITIES} rows but rows beyond your ranked count remain empty.
        </p>
        <div className="mt-4">
          <IssueRanker initialPriorities={priorities} onChange={setPriorities} />
        </div>
      </section>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-600">
          {canSubmit
            ? `Ready: ${priorities.length} priority${priorities.length === 1 ? "" : "ies"} selected.`
            : `Add at least ${MIN_PRIORITIES_TO_SUBMIT} priorities to compare candidates.`}
        </p>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          Compare candidates →
        </button>
      </div>
    </form>
  );
}
