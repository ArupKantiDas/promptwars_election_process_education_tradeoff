import { logger } from "../logger.js";
import { getGeminiClient, SYSTEM_PROMPT_NEUTRAL } from "../llm/gemini.js";
import { loadTaxonomy, type Taxonomy } from "../sources/taxonomy.js";

// Pass-two classification service. Pure function callable from
// /api/classify (HTTP wrapper) and from /api/missing.

export type InputCommitmentForClassify = {
  text: string;
  page: number;
  paragraph: number;
};

export type ClassifiedCommitment = {
  text: string;
  page: number;
  paragraph: number;
  issueId: string | null;
  confidence: number;
};

const CLASSIFY_SYSTEM = `${SYSTEM_PROMPT_NEUTRAL} Your task is issue classification: map each commitment to exactly one of the canonical issue IDs listed in CONTEXT, or null if no canonical issue fits. Use the key terms in CONTEXT as retrieval expansion hints — a commitment that mentions one of an issue's key terms should generally be classified into that issue. Beyond those literal hints you may rely on your own semantic knowledge of Indian state-government policy vocabulary (Hindi and Bengali included; Devanagari and Bengali script terms are handled natively without needing transliterated hints). The output must use the snake_case issue ID, never the label, never a kebab-case variant. Tie-breaker rule: when a commitment names both a target service area and a transparency mechanism, prefer the service-area issueId over corruption.

Output format: return ONLY {issueId, confidence} per commitment, in the same order as the input commitments array. Do not echo the commitment text, page, or paragraph back — the caller will reattach those by index. The classified array length must equal the input commitments array length.`;

// Keep the prompt context tight: only the top-N most distinctive English
// synonyms per issue, and skip the Hindi/Bengali lists entirely. The full
// multilingual list (~70 synonyms × 10 issues across 3 scripts) was
// measured at ~8.5KB of CONTEXT and contributed ~30s of Gemini latency
// per classify call. Trimming to top-10 English drops the context to
// ~3.5KB and pushes classify under the 15s target while keeping accuracy:
// the model knows the full Indian-policy vocabulary natively and only
// needs anchor words to bind each commitment to the right issue ID.
//
// `taxonomy.allSynonymsLower` (used by the local stub matcher in
// classifyByMatches below) still indexes the FULL multilingual list, so
// stub-mode coverage is unchanged.
const KEY_TERMS_PER_ISSUE = 10;

function buildClassifyContext(taxonomy: Taxonomy): string {
  const lines: string[] = [];
  lines.push("Canonical issue taxonomy (snake_case IDs are the only valid output values):\n");
  for (const issue of taxonomy.issues) {
    const keyTerms = issue.synonymsEn.slice(0, KEY_TERMS_PER_ISSUE);
    lines.push(`### ${issue.id}`);
    lines.push(`Label: ${issue.label}`);
    lines.push(`Description: ${issue.description}`);
    lines.push(`Key terms (most distinctive ${KEY_TERMS_PER_ISSUE}): ${keyTerms.join(", ")}`);
    lines.push("");
  }
  lines.push(
    "Hindi (Devanagari) and Bengali synonym hints are intentionally omitted — Gemini handles those scripts natively. Classify Hindi or Bengali commitments using the same canonical issue IDs above."
  );
  lines.push(
    "Confidence is a number between 0 and 1 representing how strongly the commitment matches the chosen issue. issueId is null only when no canonical issue applies; if forced to choose, return null rather than guess."
  );
  return lines.join("\n");
}

// Lean output schema — the model returns ONLY {issueId, confidence} per
// item in the same order as the input commitments. The route handler zips
// these back to the original {text, page, paragraph} from the request,
// preserving the public ClassifiedCommitment shape downstream.
//
// Why this matters: Gemini's classify latency is dominated by output token
// generation, not input prompt processing. Echoing each commitment's
// full text + position triples the output token count and was the primary
// driver of the ~42s baseline. With the lean schema the model emits
// roughly 35 × 25 ≈ 900 tokens instead of 35 × 80 ≈ 2800 tokens.
const CLASSIFY_OUTPUT_SCHEMA = {
  type: "OBJECT",
  properties: {
    classified: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          issueId: { type: "STRING", nullable: true },
          confidence: { type: "NUMBER" }
        },
        required: ["issueId", "confidence"]
      }
    }
  },
  required: ["classified"]
};

type GeminiClassifyResult = {
  classified?: Array<{
    issueId?: unknown;
    confidence?: unknown;
  }>;
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// Validates the lean Gemini output and zips it with the input commitments
// to produce the full ClassifiedCommitment[]. Items the model omitted or
// returned with an unknown issueId are filled with {issueId: null,
// confidence: 0} at the corresponding position so the response array
// length always matches the request array length.
function validateGeminiClassify(
  raw: unknown,
  taxonomy: Taxonomy,
  inputs: readonly InputCommitmentForClassify[]
): ClassifiedCommitment[] {
  const obj = (raw ?? {}) as GeminiClassifyResult;
  const list = Array.isArray(obj.classified) ? obj.classified : [];
  const validIds = new Set(taxonomy.issues.map((i) => i.id));
  const out: ClassifiedCommitment[] = [];
  for (let i = 0; i < inputs.length; i += 1) {
    const c = list[i];
    const input = inputs[i]!;
    let issueId: string | null = null;
    let confidence = 0;
    if (c !== undefined) {
      if (c.issueId === null) issueId = null;
      else if (typeof c.issueId === "string" && validIds.has(c.issueId)) {
        issueId = c.issueId;
      }
      if (isFiniteNumber(c.confidence)) {
        confidence = Math.max(0, Math.min(1, c.confidence));
      }
    }
    out.push({
      text: input.text,
      page: input.page,
      paragraph: input.paragraph,
      issueId,
      confidence
    });
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normaliseForMatch(s: string): string {
  return s.toLowerCase().replace(/[-_/]/gu, " ").replace(/\s+/gu, " ").trim();
}

function classifyByMatches(
  commitmentText: string,
  taxonomy: Taxonomy
): { issueId: string | null; confidence: number } {
  const text = normaliseForMatch(commitmentText);
  const scores: Array<{ issueId: string; matches: number }> = [];
  for (const issue of taxonomy.issues) {
    let matches = 0;
    for (const syn of issue.allSynonymsLower) {
      if (syn.length < 3) continue;
      const synNorm = normaliseForMatch(syn);
      const re = new RegExp(`\\b${escapeRegex(synNorm)}s?\\b`, "u");
      if (re.test(text)) matches += 1;
    }
    if (matches > 0) scores.push({ issueId: issue.id, matches });
  }
  if (scores.length === 0) return { issueId: null, confidence: 0 };
  scores.sort((a, b) => b.matches - a.matches);
  const top = scores[0]!;
  if (top.issueId === "corruption" && scores.length > 1) {
    const next = scores[1]!;
    if (next.matches >= 2 && next.matches >= Math.floor(top.matches / 2)) {
      return {
        issueId: next.issueId,
        confidence: Math.min(1, next.matches / 4)
      };
    }
  }
  return {
    issueId: top.issueId,
    confidence: Math.min(1, top.matches / 4)
  };
}

export async function classifyCommitments(
  commitments: readonly InputCommitmentForClassify[]
): Promise<ClassifiedCommitment[]> {
  const taxonomy = await loadTaxonomy();
  const gemini = getGeminiClient();

  if (gemini.isLive) {
    const raw = await gemini.callJson({
      system: CLASSIFY_SYSTEM,
      context: buildClassifyContext(taxonomy),
      input: JSON.stringify({ commitments }),
      outputSchema: CLASSIFY_OUTPUT_SCHEMA
    });
    const classified = validateGeminiClassify(raw, taxonomy, commitments);
    logger.info("classify_live", { count: classified.length });
    return classified;
  }

  const classified = commitments.map((c) => {
    const { issueId, confidence } = classifyByMatches(c.text, taxonomy);
    return { text: c.text, page: c.page, paragraph: c.paragraph, issueId, confidence };
  });
  logger.info("classify_stub", { count: classified.length });
  return classified;
}
