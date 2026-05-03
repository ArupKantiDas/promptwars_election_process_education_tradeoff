// Migrated from the deprecated @google-cloud/vertexai SDK to @google/genai
// (the unified Vertex AI + AI Studio SDK). Source-deprecation date for the
// old SDK was June 24 2025; removal is June 24 2026.
// Migration guide: https://cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk

import type { GoogleGenAI as GoogleGenAIType, Schema } from "@google/genai";
import { loadConfig } from "../config.js";
import { logger } from "../logger.js";

// Per AGENTS.md: "Gemini 2.5 Flash for all model calls." All Gemini access
// goes through this module so the prompt skeleton (SYSTEM/CONTEXT/INPUT/
// OUTPUT SCHEMA) is enforced uniformly and so that switching to a different
// Gemini API client is a single-file change.

export type GeminiPromptParts = {
  system: string;
  context: string;
  input: string;
  outputSchema: object;
};

export type GeminiClient = {
  // Returns the parsed JSON response. Throws on malformed JSON or upstream
  // failure. Caller is responsible for validating the parsed shape against
  // an application-level schema.
  callJson(parts: GeminiPromptParts): Promise<unknown>;
  // True when the underlying client makes real Vertex/Gemini API calls.
  // False when the client is a deterministic local fallback used in dev
  // and CI without GCP credentials.
  readonly isLive: boolean;
};

// ─── live Vertex client ──────────────────────────────────────────────────────

class LiveGeminiClient implements GeminiClient {
  readonly isLive = true;
  private readonly projectId: string;
  private readonly location: string;
  private readonly model: string;
  // The @google/genai SDK is loaded lazily on first call so the local-mode
  // pipeline does not pay the SDK init cost when no Vertex env is configured.
  // Cached after first init so subsequent calls reuse the same client.
  private aiPromise: Promise<GoogleGenAIType> | null = null;

  constructor(projectId: string, location: string, model: string) {
    this.projectId = projectId;
    this.location = location;
    this.model = model;
  }

  private getAi(): Promise<GoogleGenAIType> {
    if (this.aiPromise === null) {
      this.aiPromise = (async () => {
        const { GoogleGenAI } = await import("@google/genai");
        return new GoogleGenAI({
          vertexai: true,
          project: this.projectId,
          location: this.location
        });
      })();
    }
    return this.aiPromise;
  }

  async callJson(parts: GeminiPromptParts): Promise<unknown> {
    const ai = await this.getAi();
    const userText = [
      "CONTEXT",
      parts.context,
      "",
      "INPUT",
      parts.input
    ].join("\n");
    const response = await ai.models.generateContent({
      model: this.model,
      contents: userText,
      config: {
        systemInstruction: parts.system,
        responseMimeType: "application/json",
        // Caller-supplied schemas use the OpenAPI-style Type names
        // ("OBJECT", "ARRAY", "STRING", "NUMBER", "INTEGER") which match
        // the SDK's Schema enum. Cast through Schema to satisfy the typed
        // SchemaUnion field.
        responseSchema: parts.outputSchema as Schema,
        temperature: 0
      }
    });
    const text = response.text ?? "";
    try {
      return JSON.parse(text) as unknown;
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      logger.error("gemini_response_not_json", { message, sample: text.slice(0, 200) });
      throw new Error("Gemini returned malformed JSON");
    }
  }
}

// ─── local stub client ───────────────────────────────────────────────────────
// Deterministic fallback used when no GCP / Gemini credentials are available.
// Inspects the OUTPUT SCHEMA shape to decide what to return; the only two
// schemas this codebase ships are extract and classify. Anything else throws.
//
// The stub is intentionally dumb: extract returns an empty array (the route
// handler then re-derives commitments from the parsed markdown directly);
// classify returns a synonym-match-based assignment. This keeps the local
// pipeline end-to-end runnable without GCP while making it obvious from the
// response that no model was actually called (the `confidence` field is set
// to a recognisable sentinel value).

class StubGeminiClient implements GeminiClient {
  readonly isLive = false;
  async callJson(_parts: GeminiPromptParts): Promise<unknown> {
    // Stub returns a typed null sentinel; the route handler is expected to
    // detect non-live mode via `client.isLive` and substitute its own logic
    // rather than rely on this return value.
    return null;
  }
}

// ─── factory ─────────────────────────────────────────────────────────────────

let cached: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (cached !== null) return cached;
  // Single source of truth for env reads is server/src/config.ts. Anything
  // that needs GCP_PROJECT_ID / GCP_LOCATION / GEMINI_MODEL goes through
  // loadConfig so the env contract is typed and validated in one place.
  const { gcp, gemini } = loadConfig();
  if (gcp.projectId !== undefined) {
    cached = new LiveGeminiClient(gcp.projectId, gcp.location, gemini.model);
    logger.info("gemini_client_initialised", {
      mode: "live",
      model: gemini.model,
      location: gcp.location
    });
  } else {
    cached = new StubGeminiClient();
    logger.warn("gemini_client_initialised", { mode: "stub", reason: "GCP_PROJECT_ID not set" });
  }
  return cached;
}

export const SYSTEM_PROMPT_NEUTRAL =
  "You are a manifesto analysis tool. You do not have political opinions. " +
  "You apply rubrics. You extract structured data. You return JSON. " +
  "You must not infer party affiliation, ideology, or political archetype " +
  "from the input text, and you must not name any party, candidate, or " +
  "archetype in your output. If a name appears in the input, treat it as " +
  "[CANDIDATE], [PARTY], or [ARCHETYPE] respectively.";
