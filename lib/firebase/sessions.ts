import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { logger } from "@/lib/logger";
import { ensureAnonymousUser, getDb } from "./client";

// Session telemetry writes to Firestore. These are FIRE-AND-FORGET — never
// awaited by the UI, never block navigation, never throw. Firebase config
// or network errors are logged and swallowed; the rest of the app
// (sessionStorage caching, the live pipeline, the matrix UI) continues
// to work without any Firebase credentials at all.
//
// Schema:
//   sessions/{uid}
//     { priorities[], constituency, state, createdAt,
//       pipelineCompleted?, completedAt? }
//
// Both writes use { merge: true } so the completion event extends the
// existing document rather than replacing it.

const COLLECTION = "sessions";

type FirebaseContext = { uid: string };

async function getContext(): Promise<FirebaseContext | null> {
  try {
    const uid = await ensureAnonymousUser();
    return { uid };
  } catch (err) {
    // Firebase is not configured (missing NEXT_PUBLIC_FIREBASE_* vars) or
    // anonymous auth is not enabled in the console. Either way, no telemetry
    // — the app continues to work normally.
    logger.warn("firebase_session_context_unavailable", {
      reason: err instanceof Error ? err.message : "unknown_error"
    });
    return null;
  }
}

// Caller-supplied uid path: LandingForm captures the uid in a ref on mount
// and passes it in synchronously, so the submit click does not race the
// anonymous-auth round-trip. Pass null if the ref hasn't populated yet —
// we'll fall back to ensuring a user, but the write may be lost if the
// user navigates away first.
export function recordPrioritySelection(
  uid: string | null,
  priorities: readonly string[],
  state: string,
  constituency: string
): void {
  void (async () => {
    let resolvedUid = uid;
    if (resolvedUid === null) {
      const ctx = await getContext();
      if (ctx === null) return;
      resolvedUid = ctx.uid;
    }
    try {
      const db = getDb();
      await setDoc(
        doc(db, COLLECTION, resolvedUid),
        {
          priorities: [...priorities],
          state,
          constituency,
          createdAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (err) {
      logger.warn("firebase_session_priorities_write_failed", {
        reason: err instanceof Error ? err.message : "unknown_error"
      });
    }
  })();
}

// Pipeline completion: LiveMatrix is on a separate route from LandingForm,
// so the in-memory uid ref is gone. We re-call ensureAnonymousUser, which
// returns the same persisted uid (auth state survives across routes via
// Firebase's IndexedDB persistence by default).
export function recordPipelineCompletion(): void {
  void (async () => {
    const ctx = await getContext();
    if (ctx === null) return;
    try {
      const db = getDb();
      await setDoc(
        doc(db, COLLECTION, ctx.uid),
        {
          pipelineCompleted: true,
          completedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (err) {
      logger.warn("firebase_session_completion_write_failed", {
        reason: err instanceof Error ? err.message : "unknown_error"
      });
    }
  })();
}
