import { CANDIDATES } from "@/lib/types/candidates";
import { CANONICAL_ISSUES, type IssueId } from "@/lib/types/issues";
import type {
  ClassifiedCommitment,
  ExtractedCommitment,
  ScoreInputCommitment
} from "@/lib/types/pipeline";
import { DIMENSION_ORDER, type ScoredCommitment } from "@/lib/types/scoring";

// Phase 9 — symmetry CI runner.
//
// Pulls every candidate through the full extract → classify → score
// pipeline against the FULL canonical issue taxonomy (not just a user
// priority subset), computes per-candidate metrics, and checks them
// against the bands declared in AGENTS.md. Returns a structured
// SymmetryReport; the CLI wrapper formats and exits with the right
// code.
//
// Scoring batches are by issue (AGENTS.md spec: "All four candidates'
// commitments on a single issue are scored in the same prompt batch").
// All requests fan out in parallel where the data dependency allows.

export const TOTAL_COMMITMENTS_BAND = { min: 35, max: 45 } as const;
export const MEAN_DELTA_BAND = 0.4;
export const STDDEV_DELTA_BAND = 0.5;

export type Violation =
  | {
      type: "totalCommitments";
      candidateId: string;
      candidateName: string;
      actual: number;
      expected: string;
    }
  | {
      type: "meanSpecificity";
      candidateId: string;
      candidateName: string;
      actual: number;
      corpusMean: number;
      delta: number;
      bandMax: number;
    }
  | {
      type: "meanMeasurability";
      candidateId: string;
      candidateName: string;
      actual: number;
      corpusMean: number;
      delta: number;
      bandMax: number;
    }
  | {
      type: "stdDev";
      candidateId: string;
      candidateName: string;
      actual: number;
      corpusMean: number;
      delta: number;
      bandMax: number;
    }
  | {
      type: "issueCoverage";
      issueId: string;
      addressedByCount: number;
    };

export type CandidateMetrics = {
  candidateId: string;
  candidateName: string;
  totalCommitments: number;
  scoredCommitments: number;
  issuesAddressed: readonly IssueId[];
  meanSpecificity: number;
  meanMeasurability: number;
  stdDevAllDimensions: number;
};

export type SymmetryReport = {
  pass: boolean;
  backendUrl: string;
  ranAt: string;
  durationMs: number;
  candidates: readonly CandidateMetrics[];
  corpus: {
    meanSpecificity: number;
    meanMeasurability: number;
    meanStdDev: number;
  };
  violations: readonly Violation[];
};

async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`POST ${url} → HTTP ${r.status}: ${text.slice(0, 200)}`);
  }
  return (await r.json()) as TResponse;
}

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (const n of xs) sum += n;
  return sum / xs.length;
}

function stddev(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  let sq = 0;
  for (const x of xs) sq += (x - m) ** 2;
  return Math.sqrt(sq / xs.length);
}

export async function runSymmetryTest(backendUrl: string): Promise<SymmetryReport> {
  const startedAt = Date.now();

  // Phase 1 — extract + classify per candidate, in parallel.
  const candidateData = await Promise.all(
    CANDIDATES.map(async (cand) => {
      const ext = await postJson<{ commitments: ExtractedCommitment[] }>(
        `${backendUrl}/api/extract`,
        { candidateId: cand.id }
      );
      const cls = await postJson<{ classified: ClassifiedCommitment[] }>(
        `${backendUrl}/api/classify`,
        { commitments: ext.commitments }
      );
      return { candidate: cand, classified: cls.classified };
    })
  );

  // Phase 2 — per-issue scoring across all four candidates.
  const allScored: Record<string, ScoredCommitment[]> = {};
  for (const c of CANDIDATES) allScored[c.id] = [];

  await Promise.all(
    CANONICAL_ISSUES.map(async (issue) => {
      const batch: ScoreInputCommitment[] = [];
      for (const { candidate, classified } of candidateData) {
        for (const cm of classified) {
          if (cm.issueId === issue.id) {
            batch.push({
              candidateId: candidate.id,
              text: cm.text,
              issueId: issue.id
            });
          }
        }
      }
      if (batch.length === 0) return;
      const resp = await postJson<{ scored: ScoredCommitment[] }>(
        `${backendUrl}/api/score`,
        { issueId: issue.id, commitments: batch }
      );
      for (const s of resp.scored) {
        const bucket = allScored[s.candidateId];
        if (bucket !== undefined) bucket.push(s);
      }
    })
  );

  // Phase 3 — per-candidate metrics.
  const candidateMetrics: CandidateMetrics[] = [];
  for (const cand of CANDIDATES) {
    const data = candidateData.find((d) => d.candidate.id === cand.id);
    if (data === undefined) continue;
    const scored = allScored[cand.id] ?? [];
    const issuesAddressedSet = new Set<IssueId>();
    for (const cm of data.classified) {
      if (cm.issueId !== null) issuesAddressedSet.add(cm.issueId);
    }
    const specs: number[] = [];
    const meass: number[] = [];
    const allDims: number[] = [];
    for (const s of scored) {
      specs.push(s.dimensions.specificity.score);
      meass.push(s.dimensions.measurability.score);
      for (const d of DIMENSION_ORDER) allDims.push(s.dimensions[d].score);
    }
    candidateMetrics.push({
      candidateId: cand.id,
      candidateName: cand.name,
      totalCommitments: data.classified.length,
      scoredCommitments: scored.length,
      issuesAddressed: Array.from(issuesAddressedSet).sort(),
      meanSpecificity: mean(specs),
      meanMeasurability: mean(meass),
      stdDevAllDimensions: stddev(allDims)
    });
  }

  // Phase 4 — corpus statistics (mean of per-candidate values).
  const corpusSpec = mean(candidateMetrics.map((c) => c.meanSpecificity));
  const corpusMeas = mean(candidateMetrics.map((c) => c.meanMeasurability));
  const corpusStdDev = mean(candidateMetrics.map((c) => c.stdDevAllDimensions));

  // Phase 5 — band checks.
  const violations: Violation[] = [];
  for (const m of candidateMetrics) {
    if (
      m.totalCommitments < TOTAL_COMMITMENTS_BAND.min ||
      m.totalCommitments > TOTAL_COMMITMENTS_BAND.max
    ) {
      violations.push({
        type: "totalCommitments",
        candidateId: m.candidateId,
        candidateName: m.candidateName,
        actual: m.totalCommitments,
        expected: `${TOTAL_COMMITMENTS_BAND.min}–${TOTAL_COMMITMENTS_BAND.max}`
      });
    }
    const dSpec = m.meanSpecificity - corpusSpec;
    if (Math.abs(dSpec) > MEAN_DELTA_BAND) {
      violations.push({
        type: "meanSpecificity",
        candidateId: m.candidateId,
        candidateName: m.candidateName,
        actual: m.meanSpecificity,
        corpusMean: corpusSpec,
        delta: dSpec,
        bandMax: MEAN_DELTA_BAND
      });
    }
    const dMeas = m.meanMeasurability - corpusMeas;
    if (Math.abs(dMeas) > MEAN_DELTA_BAND) {
      violations.push({
        type: "meanMeasurability",
        candidateId: m.candidateId,
        candidateName: m.candidateName,
        actual: m.meanMeasurability,
        corpusMean: corpusMeas,
        delta: dMeas,
        bandMax: MEAN_DELTA_BAND
      });
    }
    const dStdDev = m.stdDevAllDimensions - corpusStdDev;
    if (Math.abs(dStdDev) > STDDEV_DELTA_BAND) {
      violations.push({
        type: "stdDev",
        candidateId: m.candidateId,
        candidateName: m.candidateName,
        actual: m.stdDevAllDimensions,
        corpusMean: corpusStdDev,
        delta: dStdDev,
        bandMax: STDDEV_DELTA_BAND
      });
    }
  }
  // Issue coverage — every canonical issue must be addressed by ≥1 candidate.
  for (const issue of CANONICAL_ISSUES) {
    const cnt = candidateMetrics.filter((m) =>
      m.issuesAddressed.includes(issue.id)
    ).length;
    if (cnt === 0) {
      violations.push({
        type: "issueCoverage",
        issueId: issue.id,
        addressedByCount: 0
      });
    }
  }

  return {
    pass: violations.length === 0,
    backendUrl,
    ranAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    candidates: candidateMetrics,
    corpus: {
      meanSpecificity: corpusSpec,
      meanMeasurability: corpusMeas,
      meanStdDev: corpusStdDev
    },
    violations
  };
}
