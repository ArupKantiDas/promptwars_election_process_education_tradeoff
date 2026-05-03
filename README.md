# TradeOff: Manifesto Literacy for Indian Voters

**Live demo:** https://promptwars-election-process-educati.vercel.app/
**Backend:** https://tradeoff-server-129048301513.asia-south1.run.app

## What it does

TradeOff lets a voter compare what four fictional candidates contesting the real Bhabanipur constituency in West Bengal actually promised on the issues that matter to them. The user ranks their top 5 priorities. The system extracts and scores every commitment from each candidate's manifesto and shows a side-by-side matrix with a five-dimension rubric breakdown.

## How it works

A four-step pipeline runs every manifesto through the same lens:

1. **Extract.** Gemini pulls every commitment from a manifesto as structured output, with `page` and `paragraph` metadata for every span.
2. **Classify.** Gemini annotates each extracted commitment with a canonical issue ID (one of ten policy areas), using hand-authored multilingual synonym lists (English, Hindi, Bengali). Commitments that fit no canonical issue get `null`.
3. **Score.** Gemini scores each commitment on five dimensions (specificity, measurability, timeline, accountability, feasibility) on a 1 to 5 scale, returning a verbatim text span as evidence for each score. The server rejects any span that does not substring-match the source manifesto.
4. **What's Missing.** A pure set-difference over the classification output. No model call. Detection is provably grounded in what was extracted.

Splitting extraction from classification is what makes absence detection deterministic. The verbatim-span check is what makes every score auditable.

## Google services used

| Service | Use |
| --- | --- |
| **Gemini 2.5 Flash** (via Vertex AI) | Extraction, classification, and rubric scoring. Structured-output schemas keep every response parseable. |
| **Cloud Run** (asia-south1) | Hosts the Express backend. Pay-per-request, scales to zero, fast cold starts close to the demo audience. |
| **Vertex AI Search** | Indexes the manifesto documents for retrieval at extraction time. |
| **Cloud Storage** | Holds the raw manifesto files that Vertex AI Search ingests. |
| **Maps Platform (Geocoding + Places API)** | Pincode to polling-booth lookup in the voter journey section. Geocoding turns a pincode into lat / lng; Places returns nearby booths with a Google-rendered directions link. |
| **Firebase Anonymous Auth** | Per-visitor session identity. No password or sign-up; an anonymous uid is provisioned on landing. |
| **Cloud Firestore** | Session telemetry: priority selection on submit, pipeline-completion event when the matrix finishes. Per-uid security rule, fire-and-forget writes. |
| **Cloud Build** | Builds the backend container image from the repo Dockerfile and pushes to Artifact Registry on every deploy. |

## Setup

```bash
git clone <repo>
cd promptwars_election_process_education_tradeoff

# Frontend env
cp .env.example .env.local
# fill in NEXT_PUBLIC_BACKEND_URL and NEXT_PUBLIC_FIREBASE_*

# Backend env
cp .env.example server/.env.local
# fill in GCP_PROJECT_ID, GCP_LOCATION, MAPS_API_KEY, etc.

# Install
npm install
npm --prefix server install
```

Then run both servers in separate terminals:

```bash
# Terminal 1: backend (port 8080)
npm --prefix server run dev

# Terminal 2: frontend (port 3000)
npm run dev
```

Open http://localhost:3000.

If `GCP_PROJECT_ID` is unset, the backend runs in deterministic stub mode (regex / synonym heuristics replace every model call). The full app, including the symmetry CI test, works without any GCP credentials.

## Architecture

* **Frontend:** Next.js 14 App Router, React 18, deployed on Vercel.
* **Backend:** Express on Cloud Run, region asia-south1.
* **Pipeline:** parallel extract + classify per candidate, batched score per issue (all four candidates' commitments on a single issue scored in one prompt), deterministic missing detection.
* **Caching:** sessionStorage for matrix cells (back-navigation is instant), Firestore for per-session telemetry.

## Neutrality posture

The system cannot structurally favor any candidate.

A symmetry CI test runs every candidate's manifesto through the full pipeline against the entire canonical taxonomy on every push. It checks that all four candidates have commitment counts (35 to 45), mean specificity scores (within ±0.4 of corpus mean), mean measurability scores (within ±0.4), and score standard deviations (within ±0.5) within defined bands of each other. If any candidate falls outside, the build fails and the candidate's content is rewritten, never the test.

The scorer sees only anonymous numeric candidate IDs, never names or party labels. Candidates and parties are fictional, drawn from political archetypes that map to multiple real parties on multiple sides of every axis. The constituency and state (West Bengal, Bhabanipur AC #159) are real, so the realism comes from the setting, not from the characters.
