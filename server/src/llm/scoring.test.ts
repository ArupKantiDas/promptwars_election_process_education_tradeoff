import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIMENSION_ORDER,
  RUBRIC_DEFINITIONS_VERBATIM,
  scoreBatchWithRetry,
  type AnonCommitment
} from "./scoring.js";
import { stubScoreBatch } from "./stubScorer.js";

// Force stub mode for this test suite. The cached Gemini client is
// initialised lazily on first call, so this delete is effective as long
// as nothing has called getGeminiClient yet in the current process.
delete process.env["GCP_PROJECT_ID"];

const ALL_DIMENSIONS = [
  "specificity",
  "measurability",
  "timeline",
  "accountability",
  "feasibility"
] as const;

describe("RUBRIC_DEFINITIONS_VERBATIM", () => {
  it("names every one of the five dimensions in order", () => {
    // The constant is the calibration anchor pasted into every scorer
    // prompt verbatim. AGENTS.md "The five-dimension rubric" requires all
    // five names appear; missing one would silently degrade the rubric.
    let lastIndex = -1;
    for (const dim of ALL_DIMENSIONS) {
      const idx = RUBRIC_DEFINITIONS_VERBATIM.indexOf(dim);
      assert.notEqual(idx, -1, `dimension "${dim}" missing from rubric definition`);
      assert.ok(
        idx > lastIndex,
        `dimension "${dim}" appears out of order in rubric definition`
      );
      lastIndex = idx;
    }
  });

  it("DIMENSION_ORDER matches the five dimension names", () => {
    assert.deepEqual([...DIMENSION_ORDER], [...ALL_DIMENSIONS]);
  });
});

describe("stubScoreBatch", () => {
  const fixtureCommitments: AnonCommitment[] = [
    {
      anonId: 1,
      text: "Recruit 12,000 paramedical positions across the wards within 24 months, funded by ₹185 crore from the State Health Department's budget."
    },
    {
      anonId: 2,
      text: "Strengthen primary-health centres in the constituency over this term."
    },
    {
      anonId: 3,
      text: "Stand with the farmer who feeds Bengal."
    }
  ];

  it("returns one entry per input commitment, preserving anon_id", () => {
    const scored = stubScoreBatch(fixtureCommitments);
    assert.equal(scored.length, fixtureCommitments.length);
    for (let i = 0; i < scored.length; i += 1) {
      assert.equal(scored[i]?.anonId, fixtureCommitments[i]?.anonId);
    }
  });

  it("returns scores in [1, 5] for all five dimensions on every commitment", () => {
    const scored = stubScoreBatch(fixtureCommitments);
    for (const sc of scored) {
      for (const dim of ALL_DIMENSIONS) {
        const result = sc.dimensions[dim];
        assert.ok(
          Number.isInteger(result.score),
          `score for ${dim} must be an integer (got ${String(result.score)})`
        );
        assert.ok(
          result.score >= 1 && result.score <= 5,
          `score for ${dim} out of range: ${result.score}`
        );
      }
    }
  });

  it("returns triggering_span that is a substring of the input commitment text", () => {
    const scored = stubScoreBatch(fixtureCommitments);
    for (const sc of scored) {
      const source = fixtureCommitments.find((c) => c.anonId === sc.anonId)?.text ?? "";
      assert.notEqual(source, "");
      for (const dim of ALL_DIMENSIONS) {
        const span = sc.dimensions[dim].triggeringSpan;
        assert.ok(span.length > 0, `triggering_span empty for ${dim}`);
        assert.ok(
          source.includes(span),
          `triggering_span "${span}" not found in source for dimension ${dim}`
        );
      }
    }
  });

  it("marks every dimension as not unverified (route translates to verified: true)", () => {
    // The /api/score route rolls up `verified: every dim's unverified !== true`.
    // Stub-mode spans are by construction substrings, so nothing should be
    // unverified — and the route's verified field must therefore be true.
    const scored = stubScoreBatch(fixtureCommitments);
    for (const sc of scored) {
      for (const dim of ALL_DIMENSIONS) {
        assert.equal(
          sc.dimensions[dim].unverified,
          false,
          `dimension ${dim} unexpectedly unverified in stub mode`
        );
      }
    }
  });
});

describe("scoreBatchWithRetry", () => {
  it("throws in stub mode (route handler is expected to branch to stubScoreBatch)", async () => {
    // scoreBatchWithRetry is the live-mode-only path. Calling it without a
    // configured Gemini client must throw a clear error rather than silently
    // produce empty scores.
    await assert.rejects(
      () => scoreBatchWithRetry("employment", [{ anonId: 1, text: "x" }], 1),
      /stub mode/u
    );
  });
});
