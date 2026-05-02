import { Router } from "express";
import { logger } from "../logger.js";
import { getGeminiClient } from "../llm/gemini.js";
import { getManifestoSource, loadCandidateMetadata } from "../sources/manifestoSource.js";
import { loadTaxonomy } from "../sources/taxonomy.js";

// Warmup endpoint. Per AGENTS.md / BUILD_BLUEPRINT Phase 4: "If first cold
// start exceeds 30 seconds, add a warm-up call in the journey page load."
// The journey page calls /api/warm on mount; the handler primes the
// taxonomy cache, the manifesto source's connection (if Vertex), and the
// Gemini client (lazy-loaded SDK module). This avoids a 30s cold-start
// penalty on the user's first matrix query.
//
// The handler is fire-and-forget on the client side: it returns 200 as soon
// as the warm-up tasks are dispatched; the actual warming may continue in
// the background. The frontend should not block on the response.

export const warmRouter = Router();

warmRouter.post("/", async (_req, res) => {
  // Respond immediately so the caller is unblocked.
  res.status(200).json({ status: "warming" });
  // Continue priming caches in the background.
  void primeCaches().catch((err) => {
    const message = err instanceof Error ? err.message : "unknown_error";
    logger.warn("warm_background_failed", { message });
  });
});

async function primeCaches(): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];
  tasks.push(loadTaxonomy());
  // Touch the manifesto source so its connection (if Vertex) initialises.
  tasks.push(
    (async () => {
      try {
        await loadCandidateMetadata("anuradha-sen-sharma");
        await getManifestoSource().load("anuradha-sen-sharma");
      } catch (err) {
        // Local-mode warm-up may fail if files are absent in production
        // builds; that is acceptable, the caller will see a real error on
        // the first /api/extract call.
        const message = err instanceof Error ? err.message : "unknown_error";
        logger.warn("warm_manifesto_load_skipped", { message });
      }
    })()
  );
  // Touch the Gemini client so its SDK module is dynamically imported.
  tasks.push(Promise.resolve(getGeminiClient()));
  await Promise.allSettled(tasks);
  logger.info("warm_complete");
}
