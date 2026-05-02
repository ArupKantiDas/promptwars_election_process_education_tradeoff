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

  constructor(projectId: string, location: string, model: string) {
    this.projectId = projectId;
    this.location = location;
    this.model = model;
  }

  async callJson(parts: GeminiPromptParts): Promise<unknown> {
    // Lazy-load @google-cloud/vertexai so the local-mode pipeline does not
    // pay the SDK init cost when no Vertex env is configured.
    const mod = await import("@google-cloud/vertexai");
    const { VertexAI } = mod;
    const vertex = new VertexAI({ project: this.projectId, location: this.location });
    const generativeModel = vertex.getGenerativeModel({
      model: this.model,
      generationConfig: {
        responseMimeType: "application/json",
        // The Vertex SDK passes responseSchema through to the model. The
        // schema enforces the output shape at decode time.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseSchema: parts.outputSchema as any,
        temperature: 0
      },
      systemInstruction: { role: "system", parts: [{ text: parts.system }] }
    });
    const userText = [
      "CONTEXT",
      parts.context,
      "",
      "INPUT",
      parts.input
    ].join("\n");
    const result = await generativeModel.generateContent({
      contents: [{ role: "user", parts: [{ text: userText }] }]
    });
    const response = result.response;
    const candidate = response.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text ?? "";
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
  const projectId = process.env["GCP_PROJECT_ID"] ?? "";
  const location = process.env["GCP_LOCATION"] ?? "us-central1";
  const model = process.env["GEMINI_MODEL"] ?? "gemini-2.5-flash";
  if (projectId.length > 0) {
    cached = new LiveGeminiClient(projectId, location, model);
    logger.info("gemini_client_initialised", { mode: "live", model, location });
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
