import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";

// Stub mode is required for these tests (no GCP credentials needed). Set
// before importing modules that lazy-init the Gemini client.
delete process.env["GCP_PROJECT_ID"];

const express = (await import("express")).default;
const { extractCommitments } = await import("../services/extraction.js");
const { extractRouter } = await import("./extract.js");

const KNOWN_CANDIDATE = "anuradha-sen-sharma";
const KNOWN_CANDIDATE_NAME = "Anuradha Sen Sharma";

async function withTestServer(fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use("/api/extract", extractRouter);
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("extractCommitments (service-level)", () => {
  it("returns an array of commitments with text, page, and paragraph fields", async () => {
    const out = await extractCommitments(KNOWN_CANDIDATE);
    assert.ok(Array.isArray(out));
    assert.ok(out.length > 0, "expected at least one extracted commitment");
    for (const c of out) {
      assert.equal(typeof c.text, "string");
      assert.ok(c.text.length > 0, "commitment text must be non-empty");
      assert.equal(typeof c.page, "number");
      assert.ok(Number.isInteger(c.page) && c.page >= 0);
      assert.equal(typeof c.paragraph, "number");
      assert.ok(Number.isInteger(c.paragraph) && c.paragraph >= 0);
    }
  });

  it("strips the candidate's full name from every returned commitment text", async () => {
    // The sanitiser layer (server/src/sources/sanitize.ts) replaces the
    // candidate's full name with [CANDIDATE] before any model-bound text
    // is built. The stub-mode path runs the same sanitiser on every
    // parsed commitment, so the post-pipeline output must never carry
    // the literal full name through.
    const out = await extractCommitments(KNOWN_CANDIDATE);
    for (const c of out) {
      assert.ok(
        !c.text.includes(KNOWN_CANDIDATE_NAME),
        `commitment text leaked candidate name: ${c.text.slice(0, 100)}`
      );
    }
  });
});

describe("/api/extract (HTTP route)", () => {
  it("returns 400 when candidateId is missing from the request body", async () => {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      assert.equal(res.status, 400);
      const body = (await res.json()) as { error?: string };
      assert.equal(body.error, "invalid_request");
    });
  });

  it("returns 400 when candidateId is an empty string", async () => {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: "" })
      });
      assert.equal(res.status, 400);
    });
  });

  it("returns 502 for an unknown candidateId", async () => {
    await withTestServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: "not-a-real-candidate" })
      });
      assert.equal(res.status, 502);
      const body = (await res.json()) as { error?: string; message?: string };
      assert.equal(body.error, "extract_failed");
      assert.ok(typeof body.message === "string" && body.message.length > 0);
    });
  });
});
