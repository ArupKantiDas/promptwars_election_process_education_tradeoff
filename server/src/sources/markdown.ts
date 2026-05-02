// Local markdown parser for the AI-drafted manifestos at
// /content/candidates/<archetype>/manifesto.md. The drafts have a known
// structure: YAML front matter, a DRAFT warning block, calibration band
// section headers, and numbered commitments. This parser extracts the
// numbered commitments verbatim and assigns synthetic page+paragraph numbers
// (10 commitments per "page") so the local-dev path produces the same
// {text, page, paragraph} shape the production Vertex AI Search path returns.
//
// Real production PDFs will yield real page numbers from Vertex AI Search;
// this parser is the local-dev substitute when no Vertex env is configured.

const COMMITMENTS_PER_SYNTHETIC_PAGE = 10;

export type ParsedManifesto = {
  candidateId: string;
  candidateName: string;
  party: string;
  archetype: string;
  // Full body text after stripping YAML front matter, DRAFT warnings, and
  // calibration band headers. Suitable for sending to Gemini for extraction.
  bodyText: string;
  // Pre-extracted numbered commitments. The local stub extractor returns
  // these directly; the real Gemini extractor receives `bodyText` and
  // re-derives them.
  commitments: readonly { text: string; page: number; paragraph: number }[];
};

type FrontMatter = {
  candidateId?: string;
  candidateName?: string;
  party?: string;
  archetype?: string;
};

function parseFrontMatter(raw: string): { frontMatter: FrontMatter; rest: string } {
  if (!raw.startsWith("---\n")) return { frontMatter: {}, rest: raw };
  const closing = raw.indexOf("\n---\n", 4);
  if (closing === -1) return { frontMatter: {}, rest: raw };
  const yamlBlock = raw.slice(4, closing);
  const rest = raw.slice(closing + 5);
  const fm: FrontMatter = {};
  for (const line of yamlBlock.split("\n")) {
    const m = line.match(/^(candidateId|candidateName|party|archetype):\s*(.+?)\s*$/u);
    if (m !== null) {
      const key = m[1] as keyof FrontMatter;
      const value = m[2] ?? "";
      fm[key] = value;
    }
  }
  return { frontMatter: fm, rest };
}

function stripDraftWarnings(input: string): string {
  // Strip lines starting with "> " (blockquotes — used for the DRAFT review
  // checklist) and the "[DRAFT — NOT NEUTRAL …]" header lines. Strip the
  // calibration band section headers too (they describe the rubric target,
  // not the content).
  return input
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (t.startsWith("> ")) return false;
      if (t.startsWith("# [DRAFT")) return false;
      if (t.startsWith("## Commitments — calibration band")) return false;
      if (t.startsWith("## Additional commitments — added per")) return false;
      return true;
    })
    .join("\n");
}

function extractNumberedCommitments(body: string): { text: string }[] {
  // Capture lines that begin with N. (or N\.) and continue until the next
  // numbered item, blank line, or section header. Strip leading bold markers.
  const lines = body.split("\n");
  const items: { text: string }[] = [];
  let buffer: string[] = [];
  let inItem = false;
  function flush(): void {
    if (!inItem) return;
    let raw = buffer.join(" ").trim();
    // Strip leading "N. " numbering, surrounding **bold**, and trailing
    // citations / parentheticals that aren't part of the commitment proper.
    raw = raw.replace(/^\d+\.\s+/u, "");
    raw = raw.replace(/^\*\*([^*]+)\*\*\s*/u, "$1 ").trim();
    if (raw.length > 0) items.push({ text: raw });
    buffer = [];
    inItem = false;
  }
  for (const line of lines) {
    const startsItem = /^\d+\.\s+/u.test(line.trimStart());
    const isBlank = line.trim().length === 0;
    const isHeader = line.trimStart().startsWith("#");
    if (startsItem) {
      flush();
      inItem = true;
      buffer.push(line.trim());
    } else if (isBlank || isHeader) {
      flush();
    } else if (inItem) {
      buffer.push(line.trim());
    }
  }
  flush();
  return items;
}

export function parseManifestoMarkdown(raw: string): ParsedManifesto {
  const { frontMatter, rest } = parseFrontMatter(raw);
  const stripped = stripDraftWarnings(rest);
  const items = extractNumberedCommitments(stripped);
  const commitments = items.map((it, idx) => ({
    text: it.text,
    page: Math.floor(idx / COMMITMENTS_PER_SYNTHETIC_PAGE) + 1,
    paragraph: (idx % COMMITMENTS_PER_SYNTHETIC_PAGE) + 1
  }));
  return {
    candidateId: frontMatter.candidateId ?? "",
    candidateName: frontMatter.candidateName ?? "",
    party: frontMatter.party ?? "",
    archetype: frontMatter.archetype ?? "",
    bodyText: stripped,
    commitments
  };
}
