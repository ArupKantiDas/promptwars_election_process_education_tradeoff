// Tracks "did the matrix pipeline finish for this priority set?" so the
// "Your comparison is ready" banner knows when to slide in, plus a
// per-priority-set cache of the full pipeline output so pressing back
// from /matrix returns instantly without re-running extraction →
// classification → scoring. State lives in sessionStorage so it
// survives soft navigations within the tab; closing the tab resets.

import type { CellState } from "./types/pipeline";

const KEY_PREFIX = "tradeoff_pipeline_complete_";
const BANNER_KEY_PREFIX = "tradeoff_matrix_banner_dismissed_";
const MATRIX_KEY_PREFIX = "tradeoff_matrix_";
const PRIORITIES_SELECTION_KEY = "tradeoff_priorities_selection";

// Shape of the matrix cache value. The full cells map is the primary
// payload; missingByCandidate on the page is derived from this on
// cache-hit.
export type MatrixCacheValue = Record<string, Record<string, CellState>>;

export const PIPELINE_COMPLETE_EVENT = "tradeoff:pipeline-complete";

function cacheKey(priorities: readonly string[]): string {
  return KEY_PREFIX + [...priorities].sort().join(",");
}

function bannerKey(priorities: readonly string[]): string {
  return BANNER_KEY_PREFIX + [...priorities].sort().join(",");
}

function matrixKey(priorities: readonly string[]): string {
  return MATRIX_KEY_PREFIX + [...priorities].sort().join(",");
}

export function markPipelineComplete(priorities: readonly string[]): void {
  if (priorities.length === 0) return;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(cacheKey(priorities), "true");
    // Same-tab notification — the native `storage` event only fires in
    // *other* tabs of the same origin, so the banner needs our own event.
    window.dispatchEvent(new CustomEvent(PIPELINE_COMPLETE_EVENT));
  } catch {
    // sessionStorage may be unavailable (private mode, quota exhausted).
    // The dispatch above will already have notified live listeners; the
    // only loss is cross-mount persistence within the same tab.
  }
}

// Wipe both the completion and dismissal flags for this priority set.
// LiveMatrix calls this on every fresh pipeline run so a stale flag
// can't pop the "ready" banner before the new run completes, and a
// leftover dismissal can't suppress the new banner. Matrix cache is
// NOT cleared — cache-hit short-circuits before we reach this codepath.
export function clearPipelineState(priorities: readonly string[]): void {
  if (priorities.length === 0) return;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(cacheKey(priorities));
    window.sessionStorage.removeItem(bannerKey(priorities));
  } catch {
    // No-op — if storage is unavailable there's nothing to clear.
  }
}

// Matrix cache: full cells map for one priority set. Letting the user
// press back from /matrix and return instantly without re-spending
// 60+ seconds of model latency. Only written on a clean run (no errors
// in extract/classify/score), since errored cells look identical to
// "no commitment for this issue" and would be misleading on rehydrate.

export function readMatrixCache(priorities: readonly string[]): MatrixCacheValue | null {
  if (priorities.length === 0) return null;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(matrixKey(priorities));
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") return null;
    return parsed as MatrixCacheValue;
  } catch {
    return null;
  }
}

export function writeMatrixCache(
  priorities: readonly string[],
  cells: MatrixCacheValue
): void {
  if (priorities.length === 0) return;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(matrixKey(priorities), JSON.stringify(cells));
  } catch {
    // Quota exhausted — fine, the page just won't be instant on back-nav.
  }
}

// Landing-page priority selection cache. So pressing back from /matrix
// shows the user's previous ranking, not a blank ranker. Stored as a
// JSON array of issue IDs.

export function readPrioritiesSelectionCache(): readonly string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(PRIORITIES_SELECTION_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    for (const v of parsed) {
      if (typeof v === "string") out.push(v);
    }
    return out;
  } catch {
    return [];
  }
}

export function writePrioritiesSelectionCache(priorities: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      PRIORITIES_SELECTION_KEY,
      JSON.stringify(priorities)
    );
  } catch {
    // No-op.
  }
}

export function isMatrixBannerDismissed(priorities: readonly string[]): boolean {
  if (priorities.length === 0) return true;
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(bannerKey(priorities)) === "true";
  } catch {
    return false;
  }
}

export function dismissMatrixBanner(priorities: readonly string[]): void {
  if (priorities.length === 0) return;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(bannerKey(priorities), "true");
  } catch {
    // Soft failure: banner just stays visible until the tab closes.
  }
}
