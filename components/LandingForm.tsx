"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { IssueId } from "@/lib/types/issues";
import { CANONICAL_ISSUES } from "@/lib/types/issues";
import { DEFAULT_CONSTITUENCY_ID, DEFAULT_STATE_CODE } from "@/lib/data/states";
import {
  readPrioritiesSelectionCache,
  writePrioritiesSelectionCache
} from "@/lib/pipelineStatus";
import { IssueRanker } from "./IssueRanker";
import { StateConstituencySelector } from "./StateConstituencySelector";

const MIN_PRIORITIES_TO_SUBMIT = 3;
const MAX_PRIORITIES = 5;

type SectionProps = {
  step: 1 | 2;
  title: string;
  caption: string;
  children: React.ReactNode;
};

function Section({ step, title, caption, children }: SectionProps) {
  return (
    <section
      aria-labelledby={`landing-section-${step}`}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-7"
    >
      <div className="flex items-baseline gap-3">
        <span
          aria-hidden="true"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 font-mono text-[10.5px] font-bold text-white"
        >
          {step}
        </span>
        <h2
          id={`landing-section-${step}`}
          className="text-lg font-semibold tracking-tight text-slate-900"
        >
          {title}
        </h2>
      </div>
      <p className="mt-2 max-w-2xl pl-9 text-sm leading-relaxed text-slate-600">
        {caption}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function LandingForm() {
  const router = useRouter();
  const [stateCode, setStateCode] = useState(DEFAULT_STATE_CODE);
  const [constituencyId, setConstituencyId] = useState(DEFAULT_CONSTITUENCY_ID);
  const [priorities, setPriorities] = useState<readonly IssueId[]>([]);

  // Restore the user's previous selection on back-navigation from
  // /matrix. Done in an effect (not lazy useState init) to avoid
  // hydration mismatch — server renders an empty form, the client
  // hydrates with the same empty form, then restores from cache.
  useEffect(() => {
    const cached = readPrioritiesSelectionCache();
    if (cached.length === 0) return;
    const validIds = new Set(CANONICAL_ISSUES.map((i) => i.id));
    const restored: IssueId[] = [];
    for (const id of cached) {
      if (validIds.has(id as IssueId)) restored.push(id as IssueId);
    }
    if (restored.length > 0) setPriorities(restored);
  }, []);

  // Persist on every change so back-nav from /matrix always sees the
  // selection that produced the comparison.
  useEffect(() => {
    writePrioritiesSelectionCache(priorities);
  }, [priorities]);

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
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      aria-label="Choose your locale and priority issues"
    >
      <Section
        step={1}
        title="Where do you vote?"
        caption="The state and constituency are real. The candidates contesting them in this demo are fictional."
      >
        <StateConstituencySelector
          initialStateCode={stateCode}
          initialConstituencyId={constituencyId}
          onChange={(s, c) => {
            setStateCode(s);
            setConstituencyId(c);
          }}
        />
      </Section>
      <Section
        step={2}
        title={`Rank your top ${MAX_PRIORITIES} issues`}
        caption={`Add issues you care about, then drag or use the arrow buttons to put them in priority order. Submit with as few as ${MIN_PRIORITIES_TO_SUBMIT}; the matrix will show ${MAX_PRIORITIES} rows but the rest stay empty.`}
      >
        <IssueRanker ranked={priorities} onChange={setPriorities} />
      </Section>
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card-lifted backdrop-blur sm:flex-nowrap">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-tight text-slate-900">
            {canSubmit
              ? `Ready: ${priorities.length} priority${priorities.length === 1 ? "" : "ies"} selected`
              : `Add at least ${MIN_PRIORITIES_TO_SUBMIT} priorities to compare`}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            We will run the four candidate manifestos through extraction → classification → scoring as soon as you continue.
          </p>
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Compare candidates
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
