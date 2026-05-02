"use client";

import { useEffect } from "react";

// Phase 4 instruction (BUILD_BLUEPRINT.md): "If first cold start exceeds 30
// seconds, add a warm-up call in the journey page load." This component
// fires a one-shot POST to /api/warm on mount. The endpoint returns 200
// immediately and primes Vertex AI Search + Gemini in the background; if
// the user later picks priorities and lands on /matrix, the first
// /api/extract call is no longer cold.
//
// Silent on success and on failure — warm-up is best-effort.
export function JourneyWarmup() {
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/warm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: controller.signal
    }).catch(() => {
      // Silent: warm-up failure is non-fatal.
    });
    return () => controller.abort();
  }, []);
  return null;
}
