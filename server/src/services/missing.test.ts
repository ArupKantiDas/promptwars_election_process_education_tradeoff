import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectMissingIssues, type IssueLookup } from "./missing.js";
import type { ClassifiedCommitment } from "./classification.js";

// Phase 6 brief: "Add a unit test verifying that a manually-constructed
// classification output produces the expected missing-issue list."
//
// All tests use hand-built ClassifiedCommitment arrays. No file I/O, no
// network, no model — the detector is pure and so are these tests.

const TAXONOMY: IssueLookup = {
  byId: Object.freeze({
    employment: { id: "employment", label: "Employment and Livelihoods" },
    healthcare: { id: "healthcare", label: "Healthcare Access and Quality" },
    womens_safety: { id: "womens_safety", label: "Women's Safety and Law and Order" },
    corruption: { id: "corruption", label: "Corruption and Governance" },
    education: { id: "education", label: "Education and Skill Development" },
    agriculture: { id: "agriculture", label: "Agriculture and Rural Economy" },
    infrastructure: { id: "infrastructure", label: "Infrastructure and Urban Development" },
    welfare: { id: "welfare", label: "Welfare Schemes and Social Protection" },
    citizenship_identity: {
      id: "citizenship_identity",
      label: "Citizenship, Identity and Electoral Integrity"
    },
    environment: { id: "environment", label: "Environment and Climate Resilience" }
  })
};

function commit(text: string, issueId: string | null): ClassifiedCommitment {
  return { text, page: 1, paragraph: 1, issueId, confidence: issueId === null ? 0 : 0.8 };
}

describe("detectMissingIssues", () => {
  it("returns issues the candidate did not address with any classified commitment", () => {
    const classified: ClassifiedCommitment[] = [
      commit("Recruit 12,000 paramedical positions", "healthcare"),
      commit("Hire 4,500 teachers", "education"),
      commit("Top up MSP for paddy farmers", "agriculture")
    ];
    const priorities = ["healthcare", "womens_safety", "corruption"];
    const missing = detectMissingIssues(classified, priorities, TAXONOMY);
    assert.deepEqual(missing, [
      { issueId: "womens_safety", label: "Women's Safety and Law and Order" },
      { issueId: "corruption", label: "Corruption and Governance" }
    ]);
  });

  it("returns empty when every priority is addressed", () => {
    const classified: ClassifiedCommitment[] = [
      commit("a", "employment"),
      commit("b", "healthcare"),
      commit("c", "education")
    ];
    const priorities = ["employment", "healthcare", "education"];
    assert.deepEqual(detectMissingIssues(classified, priorities, TAXONOMY), []);
  });

  it("returns all priorities when no commitments classified into any of them", () => {
    const classified: ClassifiedCommitment[] = [
      commit("a", "infrastructure"),
      commit("b", "environment")
    ];
    const priorities = ["welfare", "corruption", "womens_safety"];
    const missing = detectMissingIssues(classified, priorities, TAXONOMY);
    assert.deepEqual(missing.map((m) => m.issueId), [
      "welfare",
      "corruption",
      "womens_safety"
    ]);
  });

  it("treats null issueIds as not addressing anything", () => {
    // Commitments whose classifier could not map them must not count as
    // addressing any priority — even if a priority happened to be a synonym
    // hit at extraction time.
    const classified: ClassifiedCommitment[] = [
      commit("Stand with the farmer who feeds Bengal.", null),
      commit("Restore public trust in the institutions that serve Bhabanipur.", null)
    ];
    const priorities = ["agriculture", "corruption"];
    const missing = detectMissingIssues(classified, priorities, TAXONOMY);
    assert.equal(missing.length, 2);
    assert.equal(missing[0]?.issueId, "agriculture");
    assert.equal(missing[1]?.issueId, "corruption");
  });

  it("preserves priority order in the output", () => {
    const classified: ClassifiedCommitment[] = [
      commit("a", "employment")
    ];
    const priorities = ["welfare", "corruption", "environment"];
    const missing = detectMissingIssues(classified, priorities, TAXONOMY);
    assert.deepEqual(
      missing.map((m) => m.issueId),
      ["welfare", "corruption", "environment"]
    );
  });

  it("deduplicates repeated priority IDs in the input", () => {
    // If the caller mistakenly passes the same priority twice, the output
    // should only list it once.
    const classified: ClassifiedCommitment[] = [];
    const priorities = ["welfare", "welfare", "corruption"];
    const missing = detectMissingIssues(classified, priorities, TAXONOMY);
    assert.deepEqual(
      missing.map((m) => m.issueId),
      ["welfare", "corruption"]
    );
  });

  it("silently skips priority IDs not in the canonical taxonomy", () => {
    // An unknown priority is dropped (no missing entry for it). Caller is
    // expected to validate priorities upstream; the detector is forgiving.
    const classified: ClassifiedCommitment[] = [];
    const priorities = ["welfare", "not_a_real_issue", "corruption"];
    const missing = detectMissingIssues(classified, priorities, TAXONOMY);
    assert.deepEqual(
      missing.map((m) => m.issueId),
      ["welfare", "corruption"]
    );
  });

  it("respects the spec's per-candidate-per-priority semantics: addressed by any commitment counts", () => {
    // The spec says "if any classified commitment has issueId == priority,
    // the issue is addressed." A single matching commitment is sufficient,
    // even amid many unrelated commitments.
    const classified: ClassifiedCommitment[] = [
      commit("a", "infrastructure"),
      commit("b", "infrastructure"),
      commit("c", "infrastructure"),
      commit("d", "welfare") // single match counts
    ];
    const priorities = ["welfare", "agriculture"];
    const missing = detectMissingIssues(classified, priorities, TAXONOMY);
    assert.deepEqual(missing.map((m) => m.issueId), ["agriculture"]);
  });
});
