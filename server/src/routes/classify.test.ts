import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Stub mode is required for these tests: the live path would hit Vertex AI.
// Set this BEFORE importing the service so the cached Gemini client picks
// up stub mode on first init.
delete process.env["GCP_PROJECT_ID"];

const { classifyCommitments } = await import("../services/classification.js");

type Input = { text: string; page: number; paragraph: number };
const c = (text: string): Input => ({ text, page: 1, paragraph: 1 });

describe("classifyCommitments (stub-mode synonym matcher)", () => {
  it("classifies a commitment containing 'jobs' (employment synonym) into employment", async () => {
    // 'jobs' is the first English synonym for the employment issue in
    // /content/taxonomy/issues.json — the stub matcher uses the full
    // multilingual list, so a single hit suffices.
    const out = await classifyCommitments([c("Create more jobs in Bhabanipur within the first year.")]);
    assert.equal(out.length, 1);
    assert.equal(out[0]?.issueId, "employment");
  });

  it("returns null issueId when the commitment matches no taxonomy synonym", async () => {
    // Generic civic prose with no policy keywords. If this starts failing,
    // it's a sign the synonym list grew to cover something here.
    const out = await classifyCommitments([c("Stand together as one community.")]);
    assert.equal(out.length, 1);
    assert.equal(out[0]?.issueId, null);
    assert.equal(out[0]?.confidence, 0);
  });

  it("tie-breaker: a commitment naming both a service area and transparency dashboards classifies as the service area, not corruption", async () => {
    // Per AGENTS.md: "when a commitment names both a target service area and
    // a transparency mechanism, prefer the service-area issueId over corruption."
    // The stub matcher implements this in classifyByMatches: if corruption is
    // the top synonym hit but a runner-up has >=2 matches and >= corruption/2
    // matches, the runner-up wins. The text below gives corruption ~4 hits
    // (transparency, dashboard, governance, accountability) and healthcare
    // ~2 hits (hospital, primary care), exercising the tie-breaker.
    const text =
      "Build a transparency dashboard for governance accountability tracking primary care hospital performance.";
    const out = await classifyCommitments([c(text)]);
    assert.equal(out.length, 1);
    assert.equal(
      out[0]?.issueId,
      "healthcare",
      `expected healthcare, got ${String(out[0]?.issueId)}`
    );
  });

  it("response shape matches the AGENTS.md endpoint contract", async () => {
    // Contract: { classified: [{ text, page, paragraph, issueId, confidence }] }
    // The route's response body is { classified: <this array> }; the service
    // returns the array directly. Same shape.
    const inputs: Input[] = [
      { text: "Recruit 12,000 paramedical positions.", page: 3, paragraph: 7 },
      c("Stand together as one community.")
    ];
    const out = await classifyCommitments(inputs);
    assert.equal(out.length, inputs.length);
    for (let i = 0; i < out.length; i += 1) {
      const item = out[i];
      assert.ok(item !== undefined);
      assert.equal(typeof item.text, "string");
      assert.equal(typeof item.page, "number");
      assert.equal(typeof item.paragraph, "number");
      assert.ok(
        item.issueId === null || typeof item.issueId === "string",
        "issueId must be string or null"
      );
      assert.equal(typeof item.confidence, "number");
      assert.ok(
        item.confidence >= 0 && item.confidence <= 1,
        `confidence out of range: ${item.confidence}`
      );
      // Verify position fields are zipped back correctly from the input.
      assert.equal(item.text, inputs[i]?.text);
      assert.equal(item.page, inputs[i]?.page);
      assert.equal(item.paragraph, inputs[i]?.paragraph);
    }
  });
});
