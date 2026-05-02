import type { DimensionName, DimensionResult, ScoredAnon, AnonCommitment } from "./scoring.js";

// Local-dev stub scorer used when no GCP credentials are configured. Applies
// regex heuristics for each of the five rubric dimensions and returns a
// triggering_span that is, by construction, a substring of the commitment
// text (so span validation in the route handler always passes in stub mode).
//
// The heuristics are calibrated to the manifesto-draft style our content
// pipeline produces: highly-specific commitments use a "Action + N units +
// timeframe + budget + Implementing body" template, vague commitments are
// short aspirational sentences with verbs like "Champion", "Stand with",
// "Defend", "Leave no". The stub does not attempt to score arbitrary
// political prose — that is what live Gemini is for.

const RX = {
  // number + unit (measurability 5)
  numberWithUnit: /(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s+(?:percent|%|crore|lakh|months|years|days|wards|positions|km|MW|families|workers|graduates|farmers|children|women|teachers|hospitals|courts|members|households|bigha|acre|seats|beneficiaries|pages|constituencies|outposts|centres?|trees|buses|km²|km2)/iu,
  // explicit year (timeline 5)
  explicitYear: /\b(?:by|effective|beginning|completed\s+by|by\s+the\s+end\s+of|in)\s+(?:[A-Z]\w+\s+)?20\d\d/iu,
  yearAlone: /\b20\d\d(?:[–-]\d{2,4})?\b/u,
  // relative timeframe (timeline 3)
  relativeTimeframe: /\b(?:within|over|across|in)\s+(?:the\s+)?(?:first|next|coming|past)?\s*\d+\s+(?:months?|years?|weeks?|days?)\b|\bthis\s+term\b|\bthe\s+first\s+year\b|\bover\s+the\s+term\b|\bthrough\s+(?:the\s+)?(?:term|year)\b/iu,
  // specific named body (accountability 5)
  namedBody: /Implementing\s+body:\s*([^.]+?)(?:\.|$)|(?:West\s+Bengal\s+\w+(?:\s+\w+){0,5}\s+(?:Department|Ministry|Authority|Commission|Board|Bureau|Cell|Wing|Corporation|Council|Court))|(?:Kolkata\s+(?:Metropolitan|Municipal|Police|Health)[\s\w]+(?:Authority|Corporation|Department|Wing|District))/u,
  // partial accountability (3): "through X" / "in coordination with"
  partialBody: /\b(?:through|via|in\s+coordination\s+with|in\s+partnership\s+with|alongside)\s+(?:the\s+|a\s+)?[a-z]+(?:\s+[a-z]+){0,4}\b/iu,
  // budget figure (feasibility 5)
  budget: /(?:Funded\s+(?:by|through)|allocation\s+of|budget\s+of|₹)\s*₹?[\d,]+\s*(?:crore|lakh)/iu,
  // mechanism without numbers (feasibility 3)
  mechanism: /\b(?:through|via)\s+(?:cooperative\s+banks?|partnerships?|joint\s+\w+|the\s+\w+\s+Department)/iu,
  // scheme/programme/sector hints (specificity)
  namedScheme: /\b(?:Lakshmir\s+Bhandar|Kanyashree|Swasthya\s+Sathi|Khadya\s+Sathi|MGNREGA|SSC|Mahila\s+Suraksha|Adi\s+Ganga|Sundarbans|Matua|Joka–BBD|Joka-BBD)\b/u,
  sectorWithTarget: /\b\d+(?:,\d{3})*\s+(?:[a-z][\w-]+\s+){0,3}(?:positions|jobs|teachers|hospitals|courts|seats|families|workers|farmers|graduates|women|men|children|wards|trees|buses|households|members|outposts|centres?|constituencies|pages|members|cells)/iu,
  aspirationalLeader: /^\s*(?:Champion|Stand\s+with|Defend|Leave\s+no|Make\s+sure|Build\s+a|Build\s+schools|Give\s+every|Restore|Honour|Protect|Healthcare|Schools|Bring\s+transparency|Make\s+(?:every|corruption|quality)|Move\s+people|A\s+\w+\s+Bhabanipur|Welfare|No\s+genuine|Every\s+legitimate|Justice\s+for|Make\s+\w)/iu
};

function pick(text: string, regex: RegExp): string | null {
  const m = text.match(regex);
  if (m === null) return null;
  return m[0];
}

function fallbackSpan(text: string): string {
  // When no regex matches, score the dimension 1 with a span that is by
  // construction a substring (the first sentence or first 60 chars). This
  // keeps the response valid even when no signal is found.
  const firstSentence = text.split(/[.!?]/)[0]?.trim() ?? "";
  if (firstSentence.length > 0 && firstSentence.length <= 80) return firstSentence;
  return text.slice(0, 60).trim();
}

function score(span: string | null, fallbackText: string, scoreIfMatch: 1 | 2 | 3 | 4 | 5): DimensionResult {
  if (span === null) {
    return { score: 1, triggeringSpan: fallbackSpan(fallbackText), unverified: false };
  }
  return { score: scoreIfMatch, triggeringSpan: span, unverified: false };
}

// Per-dimension heuristics. Each runs strongest pattern → weakest, returns
// the first match's score and span.

function scoreSpecificity(text: string): DimensionResult {
  const sectorTarget = pick(text, RX.sectorWithTarget);
  if (sectorTarget !== null) return { score: 5, triggeringSpan: sectorTarget, unverified: false };
  const scheme = pick(text, RX.namedScheme);
  if (scheme !== null) return { score: 4, triggeringSpan: scheme, unverified: false };
  const namedBody = pick(text, RX.namedBody);
  if (namedBody !== null) return { score: 3, triggeringSpan: namedBody, unverified: false };
  const aspirational = pick(text, RX.aspirationalLeader);
  if (aspirational !== null) return { score: 1, triggeringSpan: aspirational, unverified: false };
  return { score: 2, triggeringSpan: fallbackSpan(text), unverified: false };
}

function scoreMeasurability(text: string): DimensionResult {
  const numberUnit = pick(text, RX.numberWithUnit);
  if (numberUnit !== null) return { score: 5, triggeringSpan: numberUnit, unverified: false };
  // number alone
  const num = pick(text, /\b\d+(?:,\d{3})*(?:\.\d+)?\b/u);
  if (num !== null) return { score: 3, triggeringSpan: num, unverified: false };
  return { score: 1, triggeringSpan: fallbackSpan(text), unverified: false };
}

function scoreTimeline(text: string): DimensionResult {
  const explicitYear = pick(text, RX.explicitYear) ?? pick(text, RX.yearAlone);
  if (explicitYear !== null) return { score: 5, triggeringSpan: explicitYear, unverified: false };
  const relative = pick(text, RX.relativeTimeframe);
  if (relative !== null) return { score: 3, triggeringSpan: relative, unverified: false };
  return { score: 1, triggeringSpan: fallbackSpan(text), unverified: false };
}

function scoreAccountability(text: string): DimensionResult {
  const named = pick(text, RX.namedBody);
  if (named !== null) return { score: 5, triggeringSpan: named, unverified: false };
  const partial = pick(text, RX.partialBody);
  if (partial !== null) return { score: 3, triggeringSpan: partial, unverified: false };
  return { score: 1, triggeringSpan: fallbackSpan(text), unverified: false };
}

function scoreFeasibility(text: string): DimensionResult {
  const budget = pick(text, RX.budget);
  if (budget !== null) return { score: 5, triggeringSpan: budget, unverified: false };
  const mechanism = pick(text, RX.mechanism);
  if (mechanism !== null) return { score: 3, triggeringSpan: mechanism, unverified: false };
  return { score: 1, triggeringSpan: fallbackSpan(text), unverified: false };
}

function scoreOne(text: string): Record<DimensionName, DimensionResult> {
  return {
    specificity: scoreSpecificity(text),
    measurability: scoreMeasurability(text),
    timeline: scoreTimeline(text),
    accountability: scoreAccountability(text),
    feasibility: scoreFeasibility(text)
  };
}

export function stubScoreBatch(commitments: readonly AnonCommitment[]): ScoredAnon[] {
  return commitments.map((c) => ({
    anonId: c.anonId,
    dimensions: scoreOne(c.text)
  }));
}
