export type ArchetypeId =
  | "welfare-expansion"
  | "market-reform"
  | "regional-identity"
  | "reformist-outsider";

export type Candidate = {
  id: string;
  name: string;
  party: string;
  archetype: ArchetypeId;
};

// Candidate display data mirrors /content/candidates/<archetype>/affidavit.json.
// Names and party labels appear in the UI but per AGENTS.md "No party names
// appear in any prompt, ever" — these strings must never be passed to Gemini.
export const CANDIDATES: readonly Candidate[] = [
  {
    id: "anuradha-sen-sharma",
    name: "Anuradha Sen Sharma",
    party: "Naagrik Adhikar Manch",
    archetype: "welfare-expansion"
  },
  {
    id: "rohit-mukherjee",
    name: "Rohit Mukherjee",
    party: "Pragati Sankalp Party",
    archetype: "market-reform"
  },
  {
    id: "debarghya-pal",
    name: "Debarghya Pal",
    party: "Bangabhumi Vikas Manch",
    archetype: "regional-identity"
  },
  {
    id: "ananya-bose",
    name: "Ananya Bose",
    party: "Aankalan Manch",
    archetype: "reformist-outsider"
  }
] as const;

export const CANDIDATE_BY_ID: Readonly<Record<string, Candidate>> = Object.freeze(
  Object.fromEntries(CANDIDATES.map((c) => [c.id, c]))
);
