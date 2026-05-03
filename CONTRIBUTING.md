# Contributing to TradeOff

TradeOff is a manifesto-literacy tool for Indian voters. The whole point of
the project is that the analysis is **symmetric across candidates** — no
archetype gets a free pass, no archetype gets a thumb on the scale. Most of
this document is about the test that enforces that property and what to do
when it fires.

---

## Project layout

```
app/                      Next.js 14 App Router pages
components/               React UI components
lib/                      Frontend libraries (types, api client, symmetry test)
  └── symmetry/           Symmetry CI runner + CLI wrapper
content/                  Hand-authored manifestos, taxonomy, affidavits
server/                   Express backend (Cloud Run target)
  └── src/llm/gemini.ts   Gemini client (live or deterministic stub)
.github/workflows/        CI gates
```

Architecture rules live in `AGENTS.md` (local-only spec — read it before
proposing structural changes).

---

## Running locally

You need two terminals. The frontend talks to the backend over HTTP, never
directly to Gemini / Vertex / Maps.

**Terminal 1 — backend:**

```bash
npm --prefix server run dev
```

This loads `server/.env.local` (or `./.env.local` as fallback). With no
`GCP_PROJECT_ID` set, the backend boots in **deterministic stub mode** — it
uses regex/synonym heuristics instead of model calls. That's the mode the
symmetry CI runs against.

**Terminal 2 — frontend:**

```bash
npm run dev
```

Open http://localhost:3000.

---

## The symmetry CI test

### What it asserts

For every candidate, after the two-pass extract → classify pipeline runs
against the full canonical issue taxonomy, the following must hold:

| Band                           | Tolerance                            |
| ------------------------------ | ------------------------------------ |
| Total commitments              | 35–45                                |
| Mean specificity               | within ±0.4 of corpus mean           |
| Mean measurability             | within ±0.4 of corpus mean           |
| Std-dev of all-dimension scores| within ±0.5 of corpus std-dev        |
| Issue coverage                 | every canonical issue addressed by ≥1 candidate |

These bands are declared in `AGENTS.md` ("Symmetry CI test" section) and
re-declared as exported constants in
[`lib/symmetry/runner.ts`](lib/symmetry/runner.ts) so the test and the spec
cannot drift.

### Running it locally

With the backend running on port 8080:

```bash
npm run symmetry
```

Override the backend URL if needed:

```bash
BACKEND_URL=http://localhost:9000 npm run symmetry
```

Exit codes:

- `0` — every band within tolerance
- `1` — one or more bands violated (printed report names which)
- `2` — backend unreachable (printed hint suggests how to start it)

### Running it in CI

Every push and pull request triggers
[`.github/workflows/symmetry.yml`](.github/workflows/symmetry.yml). The
workflow boots the backend in stub mode (no `GCP_PROJECT_ID`), polls
`/healthz`, runs `npm run symmetry`, and uploads the server log on failure.
**A red symmetry run blocks the build.**

---

## Recalibration when symmetry fails

> **Rule (per AGENTS.md): when a band fails, the candidate's content is
> rewritten — never the test.**

The bands exist precisely to detect when one candidate is being analysed
"better" or "worse" than the others. Loosening the bands defeats the
guarantee TradeOff is built to make. If a band fires, the corpus has drifted
and the corpus is what gets fixed.

### Step-by-step

1. **Read the violation.** The CLI prints which candidate, which band,
   the actual value, the corpus reference, and the delta. Example:

   ```
   ✗ [Anuradha Banerjee] meanSpecificity = 4.21, corpus = 3.55, delta = 0.66 (band ±0.4)
   ```

   That candidate's commitments are systematically more specific than the
   corpus average — the corpus is asymmetric in their favour.

2. **Open the offender's manifesto.**
   `content/candidates/<archetype>/manifesto.md`. The four archetypes are
   `welfare-expansion`, `market-reform`, `regional-identity`,
   `reformist-outsider`.

3. **Rewrite to restore symmetry.** The tactic depends on which band fired:

   | Failing band                     | Adjustment                                                                                                         |
   | -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
   | `totalCommitments` below 35      | Add commitments matching the existing calibration mix (highly-specific / moderate / vague / mixed).                |
   | `totalCommitments` above 45      | Remove the weakest commitments first (vague, no scheme, no number).                                                |
   | `meanSpecificity` too high       | Soften some commitments: drop the named scheme/sector, or aspirational rephrase.                                   |
   | `meanSpecificity` too low        | Strengthen some commitments: name the scheme, the population, or the sector.                                       |
   | `meanMeasurability` too high     | Remove some numbers/units; "reduce malnutrition" instead of "reduce malnutrition by 30%".                          |
   | `meanMeasurability` too low      | Add numbers + units to vague commitments where it would be authentic to the archetype.                             |
   | `stdDev` too high                | The candidate has too much spread — they have both very strong and very weak commitments. Tighten the outliers.    |
   | `stdDev` too low                 | The candidate is unrealistically uniform. Reintroduce a mix of stronger and weaker promises.                       |
   | `issueCoverage` (corpus-wide)    | Add at least one commitment on the uncovered issue to **any** candidate where it fits the archetype. Do not force. |

4. **Stay inside the candidate's archetype.** A `welfare-expansion`
   candidate making market-reform promises breaks the project's voice
   premise. See `CANDIDATE_CONTENT_BRIEF.md` for archetype voice guidance.

5. **Re-run symmetry.** `npm run symmetry`. Iterate until exit 0.

6. **Commit the manifesto change.** Reference the band that fired in the
   commit message so future-you understands why the wording was loosened
   or tightened.

### What the symmetry test cannot catch

The test asserts that **rubric-graded content properties** are symmetric. It
does not catch:

- **Voice asymmetry** — one candidate sounding visibly more "presidential"
  than the others while scoring identically on the rubric.
- **Recognizability** — a fictional party/name that reads as an obvious
  stand-in for a real one. Search before commit.
- **Dual-codable commitments** — a commitment that legitimately spans two
  issues, where the classifier always picks one. This is a content-design
  problem, not a test problem.
- **Affidavit asymmetry** — affidavit content is not run through the
  pipeline.

These are caught by manual review (see `MANIFESTO_REVIEW.md`) and by the
calibration anchors in `CANDIDATE_CONTENT_BRIEF.md`.

---

## Coding standards

- TypeScript strict, no `any`, no `unknown` without narrowing.
- All async paths have explicit error handling.
- No `console.log` in committed code — use the logger module.
- Frontend never calls Gemini / Vertex / Maps directly. All AI traffic goes
  through the four backend endpoints (`/api/extract`, `/api/classify`,
  `/api/score`, `/api/booth`).
- Two-pass extraction is non-negotiable. Don't collapse extract+classify
  into a single prompt.
- Rubric scorer must return verbatim spans validated server-side. Don't
  trust the model.
- Per-issue scoring batches all four candidates in one prompt — that's how
  calibration stays consistent.

The rubric, taxonomy, and bands are all declared once in `AGENTS.md`. If
you're tempted to redefine them somewhere else, don't.

---

## What goes in `content/`, what goes in code

| Lives in `content/`                               | Lives in code                              |
| ------------------------------------------------- | ------------------------------------------ |
| Manifestos (per candidate, per archetype)         | The extraction prompt                      |
| Affidavit data                                    | The classification prompt                  |
| Canonical issue taxonomy + multilingual synonyms  | The rubric scorer + verbatim-span check    |
| Demo state / constituency seed (real geography)   | Symmetry runner + bands + CLI              |

If a symmetry band fires, you almost always want to edit `content/`, not
`lib/` or `server/`.
