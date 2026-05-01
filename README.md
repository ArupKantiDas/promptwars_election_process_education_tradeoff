# TradeOff

A manifesto literacy tool for Indian voters. Built for the Anti-Gravity hackathon.

In the final week of a Vidhan Sabha campaign, the average voter encounters dozens of manifesto promises and has no way to tell which ones are real commitments and which are rhetoric. TradeOff fixes that. You bring your priorities. We bring the citations and the rubric. You decide.

## What it does

You rank the issues you actually care about. Four candidates' manifestos run through a five-dimension rubric (specificity, measurability, timeline, accountability, feasibility) and the system shows you their commitments side by side, scored, with the exact text that triggered each score. A "What's Missing" panel surfaces which of your top issues each candidate did not address at all. A thin voter journey layer covers eligibility, registration, timing, polling location, and booth procedure with deep links to the Election Commission's official materials.

Manifesto literacy is the missing layer of voter education. Booth procedure is solved by the ECI. We index where they already do the job well, and we do the job nobody else does.

## Why fictional candidates

The four candidates in TradeOff are authored from political archetypes that exist across democracies, not modeled on any real Indian parties.

The first is a welfare-expansion candidate emphasizing redistribution, public services, and labor protections. The second is a market-reform candidate emphasizing growth, business environment, and administrative efficiency. The third is a regional-identity candidate emphasizing local language, federal autonomy, and locally-rooted economic development. The fourth is a reformist-outsider candidate emphasizing corruption cleanup and governance modernization. Each archetype maps to multiple real parties spanning ideological lines, in India and globally. The recognizability comes from the political type, which is universal. The neutrality comes from the diffusion.

We considered building TradeOff against real Indian manifestos and rejected it for three compounding reasons. Real political data is asymmetric in source quality: major national parties publish polished documents in multiple languages, while smaller regional parties sometimes publish four pages in one. A faithful comparison engine would become a polish-detector, not an idea-detector. Lightly-fictionalized real parties is worse: the moment a viewer recognizes "this fictional party is clearly party X," every analytical output gets re-mapped to the real party, and any prior carried into the modeling gets laundered through the AI's faithful reporting. Recognizability is the bias vector. Archetypes diffused across multiple real parties are not.

The Indian state and constituency in our demo are real, with real demographics and real economic conditions. The candidates contest that real constituency, with manifestos calibrated to address the actual problems the state and the constituency actually face. The realism that lands the demo comes from the setting, not from the characters.

## How it works

The user picks a real Indian state, picks a real constituency in that state, and ranks their top five issues from a canonical list of ten policy areas. The four candidate manifestos are authored documents pre-indexed in Vertex AI Search.

Behind the matrix, every manifesto runs through a two-pass pipeline. Pass one extracts every commitment from the manifesto without an issue filter. Pass two classifies each extracted commitment against the canonical issue taxonomy using hand-authored synonym lists per issue (women's safety expands to gender violence, Mahila Suraksha, fast-track courts for women, female police representation, and others). This separates extraction from classification and makes the absence-detection in the "What's Missing" panel deterministic rather than asking the model to confidently assert something is not there.

Every classified commitment then runs through the rubric scorer. Five dimensions, each scored 1 to 5, with explicit calibration anchors in the prompt and a structured-output schema requiring a verbatim text span that triggered the score. Server-side validation rejects any response where the span does not substring-match the source manifesto. All four candidates' commitments are scored in the same batch to keep the model's calibration consistent across the comparison.

The matrix renders the scored commitments side by side, clustered by the user's ranked issues. The "What's Missing" panel renders deterministically from the pass-two classification: any of the user's top three priorities not represented in a candidate's classified commitments shows up as missing. The voter journey page links to ECI resources and uses Maps Platform for pincode-to-booth lookup.

## Google Services

Six tools, each non-substitutable.

**Anti-Gravity** drives development. The prompt evolution log lives in `PROMPT_LOG.md` as a first-class artifact and seeds the LinkedIn submission post.

**Cloud Run** hosts the analysis backend, the two-pass extraction pipeline, and the rubric scoring API. Keys stay server-side. Results stream so the matrix populates progressively rather than blocking.

**Gemini 2.5 Flash multimodal** parses the manifesto PDFs across English, Hindi, and Bengali, extracts commitments, classifies them against the issue taxonomy, and applies the five-dimension rubric. One model, four modalities, used at depth.

**Vertex AI Search** indexes the manifesto corpus and returns grounded citations with page-and-paragraph precision. The architecture is designed to ingest the full corpus of state and national manifestos at scale; this demo runs on four documents to keep the corpus controlled and the symmetry test enforceable.

**Firebase Studio** hosts the frontend. Firestore stores only the user's issue rankings and saved comparisons, opt-in.

**Maps Platform** powers pincode-to-booth lookup in the voter journey page.

## Assumptions

The user is in India and is interested in a Vidhan Sabha or Lok Sabha election. English, Hindi, and Bengali are supported in v1; other Indian languages are an architectural extension, not a v1 feature. The five-dimension rubric is intentionally rule-based rather than learned, because rule-based rubrics are auditable and learned rubrics are not. The "What's Missing" panel is scoped to the user's top three priorities to keep the signal concentrated; expanding to the full canonical list is an architectural extension.

## Project structure

```
/app                  Next.js frontend
  /journey            Voter journey page with Maps booth lookup
  /matrix             Comparison matrix and rubric breakdown
  /missing            "What's Missing" panel
/api
  /extract            Pass-one commitment extraction
  /classify           Pass-two issue classification with synonym taxonomy
  /score              Five-dimension rubric scorer
  /booth              Pincode-to-booth lookup
/content
  /candidates         Four authored manifestos and affidavits
  /taxonomy           Canonical issue list with synonym expansions
/lib
  /rubric             Rubric definitions and calibration anchors
  /symmetry           Symmetry CI test harness
PROMPT_LOG.md         Prompt evolution log
AGENTS.md             Anti-Gravity agent context
```

## Setup

```
npm install
cp .env.example .env.local   # Fill in Firebase, Vertex, Maps API keys
npm run seed                 # Index manifestos in Vertex AI Search
npm run dev
```

Required environment variables are documented in `.env.example`. The `seed` script ingests the four authored manifestos into Vertex AI Search, builds the synonym taxonomy index, and warms the Cloud Run service. First cold start of Vertex AI Search can take 30 to 60 seconds; the journey page pre-warms the index on load to avoid stalling the first query.

## Security

User-uploaded content is not part of v1. The corpus is closed and authored. PII does not enter the system. Firebase Auth uses anonymous sign-in so users do not surrender identity to save a comparison. Firestore security rules restrict reads and writes to the authenticated user's own documents.

## Accessibility

Semantic HTML throughout. ARIA labels on every interactive element. Score visualizations use both color and shape so color-blind users see the same information. Keyboard navigation works for the entire matrix. Hindi and Bengali language support uses the Cloud Translation API and is verified against native speakers, not just machine evaluation.

## A note on neutrality

Symmetry across the four candidates is enforced as a CI test, not as a behavioral promise. Every candidate is authored to identical structural specifications: same number of specific commitments with numbers and deadlines, same number of general aspirations, same affidavit completeness with calibrated variation in kind but not in quality. The symmetry harness runs every candidate's manifesto through the same extraction prompts and verifies the output structure falls within tight tolerance bands. If any candidate's content drifts during authoring, the test fails and the build fails. Bias cannot enter the corpus without breaking the build.

This is not in the demo. It is in the engineering. If the four archetypes feel balanced when judges play with them, the engineering has done its job.