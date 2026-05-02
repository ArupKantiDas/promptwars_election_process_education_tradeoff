import { readFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "../logger.js";
import { parseManifestoMarkdown, type ParsedManifesto } from "./markdown.js";

// Maps candidateId → archetype directory under /content/candidates/.
// Mirrors /content/candidates/<archetype>/affidavit.json which carries the
// canonical candidateId.
const CANDIDATE_DIRS: Readonly<Record<string, string>> = {
  "anuradha-sen-sharma": "welfare-expansion",
  "rohit-mukherjee": "market-reform",
  "debarghya-pal": "regional-identity",
  "ananya-bose": "reformist-outsider"
};

export type ManifestoSource = {
  load(candidateId: string): Promise<ParsedManifesto>;
};

function repoRoot(): string {
  return path.resolve(process.cwd(), process.cwd().endsWith("/server") ? ".." : ".");
}

class LocalManifestoSource implements ManifestoSource {
  async load(candidateId: string): Promise<ParsedManifesto> {
    const dir = CANDIDATE_DIRS[candidateId];
    if (dir === undefined) {
      throw new Error(`Unknown candidateId: ${candidateId}`);
    }
    const filePath = path.join(repoRoot(), "content", "candidates", dir, "manifesto.md");
    const raw = await readFile(filePath, "utf8");
    return parseManifestoMarkdown(raw);
  }
}

class VertexSearchManifestoSource implements ManifestoSource {
  // Production path: queries Vertex AI Search by candidateId metadata filter,
  // streams the manifesto document content, and returns it parsed. Stubbed
  // here pending a real Vertex AI Search data store. The seed script (in
  // server/src/scripts/seed.ts) ingests the manifestos with a `candidateId`
  // metadata field so this query can filter by it.
  async load(candidateId: string): Promise<ParsedManifesto> {
    logger.warn("vertex_manifesto_source_unimplemented_falling_back_to_local", { candidateId });
    return new LocalManifestoSource().load(candidateId);
  }
}

let cached: ManifestoSource | null = null;

export function getManifestoSource(): ManifestoSource {
  if (cached !== null) return cached;
  // Prefer Vertex AI Search when both project and search engine are configured;
  // otherwise fall back to local file reads. Local fallback is what makes
  // /api/extract and /api/classify testable without GCP credentials.
  const useVertex =
    typeof process.env["GCP_PROJECT_ID"] === "string" &&
    process.env["GCP_PROJECT_ID"].length > 0 &&
    typeof process.env["VERTEX_SEARCH_ENGINE_ID"] === "string" &&
    process.env["VERTEX_SEARCH_ENGINE_ID"].length > 0;
  cached = useVertex ? new VertexSearchManifestoSource() : new LocalManifestoSource();
  logger.info("manifesto_source_initialised", { mode: useVertex ? "vertex" : "local" });
  return cached;
}

export type CandidateMetadata = {
  candidateId: string;
  name: string;
  party: string;
  archetype: string;
};

export async function loadCandidateMetadata(candidateId: string): Promise<CandidateMetadata> {
  const dir = CANDIDATE_DIRS[candidateId];
  if (dir === undefined) {
    throw new Error(`Unknown candidateId: ${candidateId}`);
  }
  const filePath = path.join(repoRoot(), "content", "candidates", dir, "affidavit.json");
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as {
    candidateId: string;
    name: string;
    party: string;
    archetype: string;
  };
  return {
    candidateId: parsed.candidateId,
    name: parsed.name,
    party: parsed.party,
    archetype: parsed.archetype
  };
}
