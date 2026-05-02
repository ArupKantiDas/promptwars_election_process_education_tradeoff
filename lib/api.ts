import type {
  ClassifiedCommitment,
  ExtractedCommitment,
  ScoreInputCommitment
} from "./types/pipeline";
import type { ScoredCommitment } from "./types/scoring";

// Typed fetch wrappers for the backend. When NEXT_PUBLIC_BACKEND_URL is set
// (e.g., http://localhost:8080 in dev, the Cloud Run service URL in prod),
// the frontend hits the backend directly with that base URL. Otherwise it
// falls back to a relative path so a Next.js rewrite proxy can handle it.
//
// Direct fetch (not the dev proxy) is required because the Next.js dev
// server's rewrite proxy times out at ~30s; live Gemini calls regularly
// exceed that. The backend has CORS configured for localhost dev origins
// + any production origins listed in CORS_ALLOWED_ORIGINS.
//
// AbortSignal is supported on every call so cancelled React effects do
// not leak in-flight requests.

const BACKEND_BASE = (process.env["NEXT_PUBLIC_BACKEND_URL"] ?? "").replace(/\/$/u, "");

function urlFor(path: string): string {
  return BACKEND_BASE.length > 0 ? `${BACKEND_BASE}${path}` : path;
}

async function postJson<TRequest, TResponse>(
  path: string,
  body: TRequest,
  signal?: AbortSignal
): Promise<TResponse> {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
  if (signal !== undefined) init.signal = signal;
  const res = await fetch(urlFor(path), init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as TResponse;
}

export async function apiExtract(
  candidateId: string,
  signal?: AbortSignal
): Promise<ExtractedCommitment[]> {
  const resp = await postJson<
    { candidateId: string },
    { commitments: ExtractedCommitment[] }
  >("/api/extract", { candidateId }, signal);
  return resp.commitments;
}

export async function apiClassify(
  commitments: readonly ExtractedCommitment[],
  signal?: AbortSignal
): Promise<ClassifiedCommitment[]> {
  const resp = await postJson<
    { commitments: readonly ExtractedCommitment[] },
    { classified: ClassifiedCommitment[] }
  >("/api/classify", { commitments }, signal);
  return resp.classified;
}

const CLASSIFY_BATCH_COUNT = 3;

// Splits a commitment array into N contiguous slices of roughly equal size
// and fires N /api/classify calls in parallel. Concatenates results in
// original order. The server contract is unchanged — each sub-batch is a
// normal /api/classify request. Sub-batching is purely a frontend
// concurrency strategy: live Gemini latency is dominated by output token
// generation, so 3 parallel calls of ~12 commitments each finish faster
// than one serial call of ~35.
//
// Falls back to a single call when the input is small enough that
// sub-batching would just add overhead without parallelism savings.
export async function apiClassifyBatched(
  commitments: readonly ExtractedCommitment[],
  signal?: AbortSignal,
  batchCount: number = CLASSIFY_BATCH_COUNT
): Promise<ClassifiedCommitment[]> {
  if (commitments.length === 0) return [];
  if (commitments.length <= batchCount) {
    return apiClassify(commitments, signal);
  }
  const sliceSize = Math.ceil(commitments.length / batchCount);
  const batches: ExtractedCommitment[][] = [];
  for (let i = 0; i < commitments.length; i += sliceSize) {
    batches.push(commitments.slice(i, i + sliceSize));
  }
  const results = await Promise.all(
    batches.map((batch) => apiClassify(batch, signal))
  );
  return results.flat();
}

export async function apiScore(
  issueId: string,
  commitments: readonly ScoreInputCommitment[],
  signal?: AbortSignal
): Promise<ScoredCommitment[]> {
  const resp = await postJson<
    { issueId: string; commitments: readonly ScoreInputCommitment[] },
    { scored: ScoredCommitment[] }
  >("/api/score", { issueId, commitments }, signal);
  return resp.scored;
}

export type Booth = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  directions_url: string;
};

export async function apiBooth(
  pincode: string,
  signal?: AbortSignal
): Promise<Booth[]> {
  const resp = await postJson<{ pincode: string }, { booths: Booth[] }>(
    "/api/booth",
    { pincode },
    signal
  );
  return resp.booths;
}
