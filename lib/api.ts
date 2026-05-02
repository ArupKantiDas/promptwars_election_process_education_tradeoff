import type {
  ClassifiedCommitment,
  ExtractedCommitment,
  ScoreInputCommitment
} from "./types/pipeline";
import type { ScoredCommitment } from "./types/scoring";

// Typed fetch wrappers for the backend. The frontend always proxies through
// `/api/*` (Next.js rewrite to NEXT_PUBLIC_BACKEND_URL); never call the
// backend URL directly. AbortSignal is supported on every call so cancelled
// React effects do not leak in-flight requests.

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
  const res = await fetch(path, init);
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
