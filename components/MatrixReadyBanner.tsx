"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PIPELINE_COMPLETE_EVENT,
  dismissMatrixBanner,
  isMatrixBannerDismissed
} from "@/lib/pipelineStatus";

type Props = {
  priorityIds: readonly string[];
};

// Threshold past which the user has clearly started exploring the matrix
// — at that point the "ready" prompt has done its job and we dismiss.
// Tuned to roughly the height of the sticky banner + a bit of breathing
// room, so a small scroll-jiggle won't dismiss prematurely.
const SCROLL_DISMISS_PX = 240;

// Sticky banner that pops in below the nav once the matrix pipeline
// finishes for the current mount. Visibility is event-driven only — we
// deliberately do NOT consult sessionStorage on first render, because a
// stale completion flag from a previous session would otherwise make
// the banner appear before the new pipeline has actually run. LiveMatrix
// also clears the flag on mount as belt-and-suspenders.
//
// Dismissal: click the banner OR scroll past SCROLL_DISMISS_PX. We do
// NOT auto-scroll the page — the CTA is informational. Dismissal
// persists per priority set within the tab session, so re-running with
// a different top-N gets a fresh ready moment.
export function MatrixReadyBanner({ priorityIds }: Props) {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    dismissMatrixBanner(priorityIds);
  }, [priorityIds]);

  // Subscribe to the same-tab "pipeline finished" event. The flag in
  // sessionStorage is intentionally NOT read here: it's only consulted
  // when the event fires (and even then only to skip showing if the
  // user already dismissed during this mount).
  useEffect(() => {
    if (priorityIds.length === 0) return;
    setVisible(false); // Reset on priority change.
    const onComplete = (): void => {
      if (isMatrixBannerDismissed(priorityIds)) return;
      setVisible(true);
    };
    window.addEventListener(PIPELINE_COMPLETE_EVENT, onComplete);
    return () => {
      window.removeEventListener(PIPELINE_COMPLETE_EVENT, onComplete);
    };
  }, [priorityIds]);

  // Scroll-past dismissal. Only attached while the banner is visible.
  useEffect(() => {
    if (!visible) return;
    const onScroll = (): void => {
      if (window.scrollY > SCROLL_DISMISS_PX) {
        dismiss();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      className="sticky top-[3.4rem] z-20 -mx-6 mb-6 animate-slideDown px-6 sm:-mx-0 sm:px-0"
      role="status"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss — your comparison is ready"
        className="flex w-full items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-5 py-3 text-left shadow-card-lifted ring-1 ring-emerald-100 transition-colors hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
          >
            <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6.5 L5 9.5 L10 3.5" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tracking-tight text-slate-900">
              Your comparison is ready
            </p>
            <p className="mt-0.5 truncate text-[12px] text-slate-600">
              All four candidates scored across your priorities.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11.5px] font-semibold text-white shadow-sm transition-colors group-hover:bg-emerald-700">
          Scroll to explore
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 4.5 L6 7.5 L9 4.5" />
          </svg>
        </span>
      </button>
    </div>
  );
}
