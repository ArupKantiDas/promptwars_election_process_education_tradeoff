import { logger } from "../logger.js";
import { getGeminiClient, SYSTEM_PROMPT_NEUTRAL } from "../llm/gemini.js";
import { getManifestoSource, loadCandidateMetadata } from "../sources/manifestoSource.js";
import { sanitizeForPrompt } from "../sources/sanitize.js";

// Pass-one extraction service. Pure function callable from /api/extract
// (HTTP wrapper) and from /api/missing (which needs the classified output
// derived from this). The HTTP wrapper validates the request and shapes
// the response; this function does the actual work.

export type ExtractedCommitment = {
  text: string;
  page: number;
  paragraph: number;
};

const EXTRACT_CONTEXT = `Definition of a commitment:
A commitment is a discrete, future-tense pledge to take a specific action,
allocate a specific resource, or achieve a specific outcome on behalf of
the constituency. Commitments may be highly specific (named scheme + target
+ deadline + budget + implementing body) or vague (aspirational language
only) — extract both. Do not extract section headers, preamble prose,
rhetorical questions, or closing remarks.

Positive examples:
- "Recruit 12,000 paramedical positions across the wards within 24 months,
   funded by ₹185 crore from the State Health Department's budget."
- "Strengthen primary-health centres in the constituency over this term."
- "Stand with the farmer who feeds Bengal."

Negative examples (do NOT extract):
- "These are the priorities the people of this constituency have asked for."
   (preamble — not a commitment)
- "Why is the state spending less than its peers on healthcare?"
   (rhetorical question)
- "## Commitments — calibration band: highly specific"
   (section header)

Page and paragraph numbering:
The input text is broken into paragraphs separated by blank lines. Number
paragraphs starting from 1. Pages are derived from page breaks if present;
if the document is plain text without page breaks, treat the whole input
as page 1.`;

const EXTRACT_OUTPUT_SCHEMA = {
  type: "OBJECT",
  properties: {
    commitments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          page: { type: "INTEGER" },
          paragraph: { type: "INTEGER" }
        },
        required: ["text", "page", "paragraph"]
      }
    }
  },
  required: ["commitments"]
};

const EXTRACT_SYSTEM = `${SYSTEM_PROMPT_NEUTRAL} Your task is commitment extraction: read the manifesto excerpt and return every commitment verbatim, with page and paragraph numbers. Do not classify, score, summarise, or paraphrase. Do not add commitments that are not in the source.`;

type GeminiExtractResult = {
  commitments?: Array<{ text?: unknown; page?: unknown; paragraph?: unknown }>;
};

function isFiniteInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v);
}

function validateGeminiExtract(raw: unknown): ExtractedCommitment[] {
  const obj = (raw ?? {}) as GeminiExtractResult;
  const list = Array.isArray(obj.commitments) ? obj.commitments : [];
  const out: ExtractedCommitment[] = [];
  for (const c of list) {
    if (typeof c.text === "string" && isFiniteInt(c.page) && isFiniteInt(c.paragraph)) {
      out.push({ text: c.text, page: c.page, paragraph: c.paragraph });
    }
  }
  return out;
}

export async function extractCommitments(candidateId: string): Promise<ExtractedCommitment[]> {
  const meta = await loadCandidateMetadata(candidateId);
  const manifesto = await getManifestoSource().load(candidateId);
  const sanitized = sanitizeForPrompt(manifesto.bodyText, {
    candidateName: meta.name,
    party: meta.party
  });
  const gemini = getGeminiClient();

  if (gemini.isLive) {
    const raw = await gemini.callJson({
      system: EXTRACT_SYSTEM,
      context: EXTRACT_CONTEXT,
      input: sanitized,
      outputSchema: EXTRACT_OUTPUT_SCHEMA
    });
    const commitments = validateGeminiExtract(raw);
    logger.info("extract_live", { candidateId, count: commitments.length });
    return commitments;
  }

  const commitments = manifesto.commitments.map((c) => ({
    text: sanitizeForPrompt(c.text, {
      candidateName: meta.name,
      party: meta.party
    }),
    page: c.page,
    paragraph: c.paragraph
  }));
  logger.info("extract_stub", { candidateId, count: commitments.length });
  return commitments;
}
