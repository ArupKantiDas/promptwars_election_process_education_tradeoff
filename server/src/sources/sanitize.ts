// Strips identifying strings from manifesto text before it is sent to any
// LLM prompt. Per AGENTS.md "Prompt structure" — no party names, no real
// candidate names, no archetype labels in extraction/classification/scoring
// prompts. The pipeline is responsible for redaction before model calls;
// the source text itself remains intact in storage for citation purposes.

const ARCHETYPE_LABELS = [
  "welfare-expansion",
  "market-reform",
  "regional-identity",
  "reformist-outsider"
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export type SanitizeOptions = {
  candidateName: string;
  party: string;
};

export function sanitizeForPrompt(text: string, opts: SanitizeOptions): string {
  let out = text;
  // Redact the candidate's own name + party with neutral placeholders so the
  // model cannot infer identity from frequency or position.
  if (opts.candidateName.length > 0) {
    const re = new RegExp(`\\b${escapeRegex(opts.candidateName)}\\b`, "gu");
    out = out.replace(re, "[CANDIDATE]");
  }
  if (opts.party.length > 0) {
    const re = new RegExp(`\\b${escapeRegex(opts.party)}\\b`, "gu");
    out = out.replace(re, "[PARTY]");
  }
  for (const label of ARCHETYPE_LABELS) {
    const re = new RegExp(`\\b${escapeRegex(label)}\\b`, "giu");
    out = out.replace(re, "[ARCHETYPE]");
  }
  return out;
}
