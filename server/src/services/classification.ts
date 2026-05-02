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

const CLASSIFY_SYSTEM = `${SYSTEM_PROMPT_NEUTRAL} Your task is issue classification: map each commitment to exactly one of the canonical issue IDs listed in CONTEXT, or null if no canonical issue fits. Use the synonym lists in CONTEXT as retrieval expansion hints (a commitment that mentions a synonym should be classified into the issue that owns that synonym). The output must use the snake_case issue ID, never the label, never a kebab-case variant. Tie-breaker rule: when a commitment names both a target service area and a transparency mechanism, prefer the service-area issueId over corruption.`;

function buildClassifyContext(taxonomy: Taxonomy): string {
  const lines: string[] = [];
  lines.push("Canonical issue taxonomy (snake_case IDs are the only valid output values):\n");
  for (const issue of taxonomy.issues) {
    lines.push(`### ${issue.id}`);
    lines.push(`Label: ${issue.label}`);
    lines.push(`Description: ${issue.description}`);
    lines.push(`English synonyms: ${issue.synonymsEn.join(", ")}`);
    lines.push(`Hindi synonyms: ${issue.synonymsHi.join(", ")}`);
    lines.push(`Bengali synonyms: ${issue.synonymsRegional.join(", ")}`);
    lines.push("");
  }
  lines.push(
    "Confidence is a number between 0 and 1 representing how strongly the commitment matches the chosen issue's synonym set. issueId is null only when no canonical issue applies; if forced to choose, return null rather than guess."
  );
  return lines.join("\n");
}

const CLASSIFY_OUTPUT_SCHEMA = {
  type: "OBJECT",
  properties: {
    classified: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          page: { type: "INTEGER" },
          paragraph: { type: "INTEGER" },
          issueId: { type: "STRING", nullable: true },
          confidence: { type: "NUMBER" }
        },
        required: ["text", "page", "paragraph", "issueId", "confidence"]
      }
    }
  },
  required: ["classified"]
};

type GeminiClassifyResult = {
  classified?: Array<{
    text?: unknown;
    page?: unknown;
    paragraph?: unknown;
    issueId?: unknown;
    confidence?: unknown;
  }>;
};

function isFiniteInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validateGeminiClassify(raw: unknown, taxonomy: Taxonomy): ClassifiedCommitment[] {
  const obj = (raw ?? {}) as GeminiClassifyResult;
  const list = Array.isArray(obj.classified) ? obj.classified : [];
  const validIds = new Set(taxonomy.issues.map((i) => i.id));
  const out: ClassifiedCommitment[] = [];
  for (const c of list) {
    if (typeof c.text !== "string") continue;
    if (!isFiniteInt(c.page) || !isFiniteInt(c.paragraph)) continue;
    if (!isFiniteNumber(c.confidence)) continue;
    let issueId: string | null;
    if (c.issueId === null) issueId = null;
    else if (typeof c.issueId === "string" && validIds.has(c.issueId)) issueId = c.issueId;
    else continue;
    out.push({
      text: c.text,
      page: c.page,
      paragraph: c.paragraph,
      issueId,
      confidence: Math.max(0, Math.min(1, c.confidence))
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
    const classified = validateGeminiClassify(raw, taxonomy);
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
