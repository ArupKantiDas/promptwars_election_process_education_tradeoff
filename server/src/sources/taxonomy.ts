import { readFile } from "node:fs/promises";
import path from "node:path";

// /content/taxonomy/issues.json shape — must mirror the file at
// /content/taxonomy/issues.json (AGENTS.md states the JSON is the source of
// truth; this loader does not synthesize taxonomy, only reads it).
type IssuesFileIssue = {
  id: string;
  label: string;
  description: string;
  synonyms_en: string[];
  synonyms_hi: string[];
  synonyms_regional: string[];
};

type IssuesFile = {
  state: string;
  election_year: number;
  issues: IssuesFileIssue[];
};

export type TaxonomyIssue = {
  id: string;
  label: string;
  description: string;
  synonymsEn: readonly string[];
  synonymsHi: readonly string[];
  synonymsRegional: readonly string[];
  // Flattened union of all three language synonym lists, lowercased; used by
  // the local stub classifier to score commitment ↔ issue matches.
  allSynonymsLower: readonly string[];
};

export type Taxonomy = {
  state: string;
  electionYear: number;
  issues: readonly TaxonomyIssue[];
  byId: Readonly<Record<string, TaxonomyIssue>>;
};

let cache: Taxonomy | null = null;

function repoRoot(): string {
  // The server runs from /server. Repo root is one level up.
  return path.resolve(process.cwd(), process.cwd().endsWith("/server") ? ".." : ".");
}

export async function loadTaxonomy(): Promise<Taxonomy> {
  if (cache !== null) return cache;
  const filePath = path.join(repoRoot(), "content", "taxonomy", "issues.json");
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as IssuesFile;
  const issues: TaxonomyIssue[] = parsed.issues.map((i) => ({
    id: i.id,
    label: i.label,
    description: i.description,
    synonymsEn: Object.freeze(i.synonyms_en.slice()),
    synonymsHi: Object.freeze(i.synonyms_hi.slice()),
    synonymsRegional: Object.freeze(i.synonyms_regional.slice()),
    allSynonymsLower: Object.freeze(
      [...i.synonyms_en, ...i.synonyms_hi, ...i.synonyms_regional].map((s) => s.toLowerCase())
    )
  }));
  const byId: Record<string, TaxonomyIssue> = {};
  for (const i of issues) byId[i.id] = i;
  cache = {
    state: parsed.state,
    electionYear: parsed.election_year,
    issues: Object.freeze(issues),
    byId: Object.freeze(byId)
  };
  return cache;
}

export function clearTaxonomyCache(): void {
  cache = null;
}
